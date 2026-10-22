import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

const MASTER_THEME_GUID = 'a1000000-0000-0000-0000-000000000001';

/**
 * GET /api/admin/theme
 * Fetches the active master theme and workspace custom CSS overrides
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    let masterTheme = null;
    let workspaceCustomCss = '';
    let customCssRowGuid = null;

    // 1. Fetch Master Theme from PostgreSQL
    try {
      const themeRows = await DataService.selectRows(
        'themes',
        'row_guid,theme_slug,name,version,font_family,font_url,css,theme_json,default_page_template,is_master',
        [
          { Operand: 'eq', UIKey: 'is_master', Value: 'true' },
          { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
        ],
        [{ UIKey: 'row_guid', Direction: 'ASC' }],
        '1',
        '1'
      );

      if (themeRows && themeRows[0]) {
        const t = themeRows[0];
        const rawJson = typeof t.theme_json === 'string' ? JSON.parse(t.theme_json) : (t.theme_json || {});
        masterTheme = {
          rowGuid: t.row_guid,
          slug: t.theme_slug,
          name: t.name,
          version: t.version || '1.0.0',
          fontFamily: t.font_family || 'Outfit, sans-serif',
          fontUrl: t.font_url || '',
          css: t.css || '',
          themeSettings: rawJson,
          defaultPageTemplate: t.default_page_template || 'service-standard'
        };
      }
    } catch (err) {
      console.warn('Could not query master theme from PostgreSQL:', err.message);
    }

    // Fallback: check filesystem if master theme was not found in DB
    if (!masterTheme) {
      const localThemeDir = path.join(process.cwd(), 'workspaces', workspaceId || 'test-workspace-001', 'theme');
      let css = '';
      let themeSettings = {};
      try {
        if (fs.existsSync(path.join(localThemeDir, 'style.css'))) {
          css = fs.readFileSync(path.join(localThemeDir, 'style.css'), 'utf8');
        }
        if (fs.existsSync(path.join(localThemeDir, 'theme.json'))) {
          themeSettings = JSON.parse(fs.readFileSync(path.join(localThemeDir, 'theme.json'), 'utf8'));
        }
      } catch (_) {}

      masterTheme = {
        rowGuid: MASTER_THEME_GUID,
        slug: themeSettings.id || 'trades-modern',
        name: themeSettings.name || 'Trades Modern (HVAC & Plumbing)',
        version: themeSettings.version || '1.0.0',
        fontFamily: themeSettings.fontFamily || 'Outfit, sans-serif',
        fontUrl: themeSettings.fontUrl || 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
        css,
        themeSettings,
        defaultPageTemplate: themeSettings.defaultPageVariant || 'service-standard'
      };
    }

    // 2. Fetch Workspace Custom CSS from bizfire_workspace_styles
    if (workspaceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
      const targetGuid = isUuid ? workspaceId : '00000000-0000-0000-0000-' + Buffer.from(workspaceId).toString('hex').slice(0, 12).padStart(12, '0');

      try {
        const styleRows = await DataService.selectRows(
          'bizfire_workspace_styles',
          'row_guid,custom_css',
          [
            { Operand: 'eq', UIKey: 'workspace_guid', Value: targetGuid },
            { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
          ]
        );
        if (styleRows && styleRows[0]) {
          workspaceCustomCss = styleRows[0].custom_css || '';
          customCssRowGuid = styleRows[0].row_guid;
        }
      } catch (err) {
        console.warn('Could not query bizfire_workspace_styles:', err.message);
      }

      // Check filesystem fallback if no DB record found
      if (!workspaceCustomCss) {
        try {
          const customPath = path.join(process.cwd(), 'workspaces', workspaceId, 'theme', 'custom.css');
          if (fs.existsSync(customPath)) {
            workspaceCustomCss = fs.readFileSync(customPath, 'utf8');
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      masterTheme,
      workspaceStyles: {
        rowGuid: customCssRowGuid,
        customCss: workspaceCustomCss
      }
    });
  } catch (err) {
    console.error('Error in GET /api/admin/theme:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/theme
 * Updates either workspace-specific custom CSS or the shared Master Theme
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      mode = 'workspace', // 'workspace' | 'master'
      themeCss,
      customCss,
      themeSettings = {},
      fontUrl,
      fontFamily
    } = body;

    const now = new Date().toISOString();

    // Mode A: Update Workspace Custom Styles (Tenant isolated)
    if (mode === 'workspace') {
      if (!workspaceId) {
        return NextResponse.json(
          { error: 'Missing required parameter: workspaceId for workspace customization' },
          { status: 400 }
        );
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
      const targetGuid = isUuid ? workspaceId : '00000000-0000-0000-0000-' + Buffer.from(workspaceId).toString('hex').slice(0, 12).padStart(12, '0');

      try {
        await DataService.saveWorkspaceCustomCss(targetGuid, customCss || '');
      } catch (dbErr) {
        console.warn('Could not save workspace custom CSS to PostgreSQL:', dbErr.message);
      }

      // Local filesystem sync for mock parity
      try {
        const wsDir = path.join(process.cwd(), 'workspaces', workspaceId, 'theme');
        if (!fs.existsSync(wsDir)) {
          fs.mkdirSync(wsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(wsDir, 'custom.css'), customCss || '');
      } catch (_) {}

      return NextResponse.json({
        success: true,
        mode: 'workspace',
        workspaceId,
        customCss: customCss || '',
        updatedAt: now
      });
    }

    // Mode B: Update Master Theme Baseline (Affects all workspaces using this baseline)
    if (mode === 'master') {
      // Find master theme row_guid
      let masterGuid = MASTER_THEME_GUID;
      try {
        const themeRows = await DataService.selectRows(
          'themes',
          'row_guid',
          [
            { Operand: 'eq', UIKey: 'is_master', Value: 'true' },
            { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
          ]
        );
        if (themeRows?.[0]?.row_guid) {
          masterGuid = themeRows[0].row_guid;
        }
      } catch (_) {}

      const payload = {
        row_guid: masterGuid,
        css: themeCss || '',
        font_url: fontUrl || null,
        font_family: fontFamily || 'Outfit, sans-serif',
        theme_json: themeSettings,
        is_master: true,
        is_deleted: false,
        updated_on: now
      };

      await DataService.merge([payload], 'themes');

      // Local filesystem sync
      try {
        const wsRoot = path.join(process.cwd(), 'workspaces');
        if (fs.existsSync(wsRoot)) {
          const entries = fs.readdirSync(wsRoot, { withFileTypes: true });
          for (const e of entries) {
            if (!e.isDirectory()) continue;
            const stylePath = path.join(wsRoot, e.name, 'theme', 'style.css');
            if (fs.existsSync(stylePath)) {
              fs.writeFileSync(stylePath, themeCss || '');
            }
          }
        }
      } catch (_) {}

      return NextResponse.json({
        success: true,
        mode: 'master',
        masterGuid,
        updatedAt: now
      });
    }

    return NextResponse.json(
      { error: `Invalid mode: ${mode}. Must be 'workspace' or 'master'` },
      { status: 400 }
    );
  } catch (err) {
    console.error('Error in POST /api/admin/theme:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
