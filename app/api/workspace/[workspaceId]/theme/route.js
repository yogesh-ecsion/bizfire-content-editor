import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

/**
 * GET /api/workspace/[workspaceId]/theme
 * Returns current assigned theme and available themes for this workspace
 */
export async function GET(request, { params }) {
  try {
    const { workspaceId } = await params;
    const workspace = await DataService.getWorkspace(workspaceId);

    const themeRows = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,name,is_master,font_family,font_url',
      [{ Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }],
      [{ UIKey: 'is_master', Direction: 'DESC' }, { UIKey: 'name', Direction: 'ASC' }]
    );

    const availableThemes = (themeRows || [])
      .filter(t => t.theme_slug !== 'global-baseline')
      .map(t => ({
      slug: t.theme_slug,
      name: t.name || t.theme_slug,
      isMaster: Boolean(t.is_master),
      fontFamily: t.font_family
    }));

    return NextResponse.json({
      success: true,
      workspaceId,
      activeThemeSlug: workspace?.themeId || 'samir-theme',
      availableThemes
    });
  } catch (err) {
    console.error('Failed to get workspace theme:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to get workspace theme' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/[workspaceId]/theme
 * Sets active theme for this workspace and pushes theme CSS to WordPress
 */
export async function POST(request, { params }) {
  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const { themeSlug } = body;

    if (!themeSlug) {
      return NextResponse.json(
        { success: false, error: 'themeSlug is required' },
        { status: 400 }
      );
    }

    // 1. Verify theme exists in database or filesystem
    const themes = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,name,css,font_url',
      [
        { Operand: 'eq', UIKey: 'theme_slug', Value: themeSlug },
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ]
    );

    const themeDiskPath = path.join(process.cwd(), 'themes', themeSlug);
    if ((!themes || themes.length === 0) && !fs.existsSync(themeDiskPath)) {
      return NextResponse.json(
        { success: false, error: `Theme "${themeSlug}" does not exist` },
        { status: 404 }
      );
    }

    const selectedTheme = themes?.[0] || {
      theme_slug: themeSlug,
      name: themeSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    };

    // 2. Update PostgreSQL database
    try {
      await DataService.updateWorkspaceTheme(workspaceId, themeSlug);
    } catch (dbErr) {
      console.warn('Database updateWorkspaceTheme notice:', dbErr.message);
    }

    // 3. Update local workspace.json
    const wsDir = path.join(process.cwd(), 'workspaces', workspaceId);
    const wsConfigPath = path.join(wsDir, 'workspace.json');
    let workspaceMetadata = null;

    if (fs.existsSync(wsConfigPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(wsConfigPath, 'utf8'));
        raw.themeId = themeSlug;
        fs.writeFileSync(wsConfigPath, JSON.stringify(raw, null, 2), 'utf8');
        workspaceMetadata = raw;
      } catch (_) {}
    }

    if (!workspaceMetadata) {
      try {
        workspaceMetadata = await DataService.getWorkspace(workspaceId);
      } catch (_) {}
    }

    // 4. Update workspace/theme directory files
    const wsThemeDir = path.join(wsDir, 'theme');
    if (fs.existsSync(wsThemeDir) && fs.existsSync(themeDiskPath)) {
      try {
        const styleFile = path.join(themeDiskPath, 'style.css');
        if (fs.existsSync(styleFile)) {
          fs.copyFileSync(styleFile, path.join(wsThemeDir, 'style.css'));
        }
        const jsonFile = path.join(themeDiskPath, 'theme.json');
        if (fs.existsSync(jsonFile)) {
          fs.copyFileSync(jsonFile, path.join(wsThemeDir, 'theme.json'));
        }
      } catch (_) {}
    }

    // 5. Automatically push theme CSS to WordPress site
    let wpSyncResult = null;
    const targetWpUrl = workspaceMetadata?.wpSiteUrl || '';
    const apiKey = workspaceMetadata?.apiKey || '';

    if (targetWpUrl) {
      try {
        const cleanWpUrl = targetWpUrl.replace(/\/+$/, '');
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }
        if (workspaceMetadata.wpUser && workspaceMetadata.wpAppPassword) {
          const basic = Buffer.from(`${workspaceMetadata.wpUser}:${workspaceMetadata.wpAppPassword}`).toString('base64');
          headers['Authorization'] = `Basic ${basic}`;
        }

        let themeCss = selectedTheme.css || '';
        const diskCssFile = path.join(themeDiskPath, 'style.css');
        if (!themeCss && fs.existsSync(diskCssFile)) {
          themeCss = fs.readFileSync(diskCssFile, 'utf8');
        }

        const wpRes = await fetch(`${cleanWpUrl}/wp-json/plugin-control/v1/save-theme-css`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            theme_css: themeCss,
            font_url: selectedTheme.font_url || '',
            theme_name: selectedTheme.name || themeSlug
          })
        });

        const wpData = await wpRes.json().catch(() => null);
        wpSyncResult = {
          synced: wpRes.ok,
          status: wpRes.status,
          message: wpData?.message || (wpRes.ok ? 'Synced to WordPress' : 'WordPress sync error')
        };
      } catch (wpErr) {
        console.warn('WordPress auto-sync notice on theme change:', wpErr.message);
        wpSyncResult = { synced: false, error: wpErr.message };
      }
    }

    return NextResponse.json({
      success: true,
      message: wpSyncResult?.synced
        ? `Theme "${selectedTheme.name || themeSlug}" applied and live on WordPress!`
        : `Theme "${selectedTheme.name || themeSlug}" applied to workspace.`,
      workspaceId,
      activeThemeSlug: themeSlug,
      theme: {
        slug: themeSlug,
        name: selectedTheme.name,
        fontUrl: selectedTheme.font_url
      },
      wpSync: wpSyncResult
    });
  } catch (err) {
    console.error('Failed to update workspace theme:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update workspace theme' },
      { status: 500 }
    );
  }
}
