import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';
import { validateComponentBundle } from '@/lib/componentValidator';

const MASTER_THEME_GUID = 'a1000000-0000-0000-0000-000000000001';

/**
 * GET /api/admin/components
 * Returns existing components in the database, available themes, and max display_order.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const themeGuid = searchParams.get('themeGuid');

    let existingComponents = [];
    let themes = [];
    let maxDisplayOrder = 0;

    // 1. Try querying PostgreSQL via DataService
    try {
      const filters = [
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ];
      if (themeGuid) {
        filters.push({ Operand: 'eq', UIKey: 'theme_guid', Value: themeGuid });
      }

      const compRows = await DataService.selectRows(
        'theme_components',
        'row_guid,component_key,name,category,display_order,theme_guid',
        filters,
        [{ UIKey: 'display_order', Direction: 'ASC' }],
        '1',
        '500'
      );

      if (Array.isArray(compRows)) {
        existingComponents = compRows.map(c => ({
          rowGuid: c.row_guid,
          key: c.component_key,
          name: c.name,
          category: c.category,
          displayOrder: Number(c.display_order) || 0,
          themeGuid: c.theme_guid
        }));

        existingComponents.forEach(c => {
          if (c.displayOrder > maxDisplayOrder) {
            maxDisplayOrder = c.displayOrder;
          }
        });
      }

      // 2. Fetch available themes
      const themeRows = await DataService.selectRows(
        'themes',
        'row_guid,name,theme_slug,is_master',
        [{ Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }]
      );

      if (Array.isArray(themeRows)) {
        themes = themeRows.map(t => ({
          themeGuid: t.row_guid,
          name: t.name,
          slug: t.theme_slug,
          isMaster: Boolean(t.is_master)
        }));
      }
    } catch (dbErr) {
      console.warn('Could not query theme_components from DataService, checking filesystem:', dbErr.message);
      
      // Fallback: check local filesystem
      const wsRoot = path.join(process.cwd(), 'workspaces');
      if (fs.existsSync(wsRoot)) {
        const wsEntries = fs.readdirSync(wsRoot, { withFileTypes: true });
        for (const ws of wsEntries) {
          if (!ws.isDirectory()) continue;
          const compsDir = path.join(wsRoot, ws.name, 'theme', 'components');
          if (fs.existsSync(compsDir)) {
            const cEntries = fs.readdirSync(compsDir, { withFileTypes: true });
            for (const c of cEntries) {
              if (c.isDirectory()) {
                existingComponents.push({
                  key: c.name,
                  name: c.name,
                  category: 'General',
                  displayOrder: 10,
                  themeGuid: MASTER_THEME_GUID
                });
              }
            }
          }
        }
      }
    }

    if (themes.length === 0) {
      themes.push({
        themeGuid: MASTER_THEME_GUID,
        name: 'Master Theme (Trades Modern)',
        slug: 'trades-modern',
        isMaster: true
      });
    }

    return NextResponse.json({
      success: true,
      themeGuid,
      components: existingComponents,
      themes,
      maxDisplayOrder
    });
  } catch (err) {
    console.error('Error in GET /api/admin/components:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/components
 * Ingests validated components into PostgreSQL theme_components and local filesystem.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      components = [],
      themeGuid = MASTER_THEME_GUID,
      workspaceId = null,
      defaultOverwrite = false
    } = body;

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: 'No components provided in request payload' },
        { status: 400 }
      );
    }

    // 1. Fetch existing components for this theme to identify conflicts and preserve row_guids
    const existingCompMap = new Map();
    let currentMaxOrder = 0;

    try {
      const existingRows = await DataService.selectRows(
        'theme_components',
        'row_guid,component_key,display_order',
        [
          { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' },
          { Operand: 'eq', UIKey: 'theme_guid', Value: themeGuid }
        ],
        [{ UIKey: 'display_order', Direction: 'ASC' }],
        '1',
        '500'
      );

      if (Array.isArray(existingRows)) {
        for (const row of existingRows) {
          existingCompMap.set(row.component_key, row);
          const order = Number(row.display_order) || 0;
          if (order > currentMaxOrder) currentMaxOrder = order;
        }
      }
    } catch (err) {
      console.warn('Could not query existing components for conflict mapping:', err.message);
    }

    const rowsToMerge = [];
    const skipped = [];
    const validationErrors = [];
    let nextOrder = currentMaxOrder + 10;

    // 2. Process and validate each component
    for (const rawComp of components) {
      const validation = validateComponentBundle(rawComp);
      if (!validation.valid) {
        validationErrors.push({
          key: rawComp.key || 'unknown',
          errors: validation.errors
        });
        continue;
      }

      const key = validation.key;
      const existing = existingCompMap.get(key);
      const isOverwrite = rawComp.overwrite !== undefined ? rawComp.overwrite : defaultOverwrite;

      if (existing && !isOverwrite) {
        skipped.push({
          key,
          reason: 'Component key already exists and overwrite was not permitted'
        });
        continue;
      }

      const rowGuid = existing ? existing.row_guid : crypto.randomUUID();
      const displayOrder = existing ? (Number(existing.display_order) || nextOrder) : nextOrder;
      if (!existing) {
        nextOrder += 10;
      }

      // Handle companion image assets if bundled
      if (Array.isArray(rawComp.images) && rawComp.images.length > 0) {
        const imgTargetDir = path.join(process.cwd(), 'public', 'assets', 'img');
        if (!fs.existsSync(imgTargetDir)) {
          fs.mkdirSync(imgTargetDir, { recursive: true });
        }

        for (const img of rawComp.images) {
          try {
            if (img.base64 && img.name) {
              const cleanImgName = path.basename(img.name);
              const imgBuffer = Buffer.from(img.base64, 'base64');
              fs.writeFileSync(path.join(imgTargetDir, cleanImgName), imgBuffer);
            }
          } catch (imgErr) {
            console.warn(`Could not save companion image ${img.name}:`, imgErr.message);
          }
        }
      }

      const record = {
        row_guid: rowGuid,
        theme_guid: themeGuid,
        component_key: key,
        name: validation.name,
        category: validation.category,
        schema_json: validation.schema,
        template_html: validation.template,
        defaults_json: validation.defaults,
        css: validation.css || '',
        display_order: displayOrder,
        is_active: true,
        is_deleted: false
      };

      rowsToMerge.push(record);

      // Also mirror to local workspaces filesystem if requested or in dev mode
      if (workspaceId) {
        try {
          const compDir = path.join(
            process.cwd(),
            'workspaces',
            workspaceId,
            'theme',
            'components',
            key
          );
          if (!fs.existsSync(compDir)) {
            fs.mkdirSync(compDir, { recursive: true });
          }
          fs.writeFileSync(path.join(compDir, 'template.html'), validation.template);
          fs.writeFileSync(
            path.join(compDir, 'schema.json'),
            JSON.stringify(validation.schema, null, 2)
          );
          fs.writeFileSync(
            path.join(compDir, 'defaults.json'),
            JSON.stringify(validation.defaults, null, 2)
          );
          fs.writeFileSync(path.join(compDir, 'style.css'), validation.css || '');
        } catch (fsErr) {
          console.warn(`Could not mirror component ${key} to workspaces:`, fsErr.message);
        }
      }
    }

    // 3. Execute merge into Azure PostgreSQL theme_components
    let dbStatus = 'skipped';
    if (rowsToMerge.length > 0) {
      try {
        const mergeRes = await DataService.merge(rowsToMerge, 'theme_components');
        dbStatus = mergeRes.data?.status || 'success';
      } catch (dbMergeErr) {
        console.error('Error merging components to PostgreSQL:', dbMergeErr.response?.data || dbMergeErr.message);
        return NextResponse.json(
          {
            error: 'Failed to persist components into Azure PostgreSQL',
            details: dbMergeErr.response?.data || dbMergeErr.message,
            stagedCount: rowsToMerge.length
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      dbStatus,
      mergedCount: rowsToMerge.length,
      mergedComponents: rowsToMerge.map(r => ({
        key: r.component_key,
        name: r.name,
        category: r.category,
        rowGuid: r.row_guid,
        displayOrder: r.display_order
      })),
      skipped,
      validationErrors
    });
  } catch (err) {
    console.error('Error in POST /api/admin/components:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
