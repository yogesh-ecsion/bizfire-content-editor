import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

/**
 * POST /api/admin/theme/sync-wordpress
 * Compiles the global Theme CSS and syncs it to the WordPress site via the plugin REST API.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing required parameter: workspaceId' },
        { status: 400 }
      );
    }

    // 1. Fetch workspace connection credentials
    const workspace = await DataService.getWorkspace(workspaceId);
    if (!workspace || !workspace.wpSiteUrl) {
      return NextResponse.json(
        { error: 'Workspace has no WordPress site URL configured' },
        { status: 400 }
      );
    }

    const cleanWpUrl = workspace.wpSiteUrl.replace(/\/+$/, '');
    const apiKey = workspace.apiKey || '';

    // 2. Fetch Theme Bundle (Master Theme CSS + Workspace Custom CSS)
    const themeBundle = await DataService.getThemeBundle(workspaceId);

    const fullThemeCss = [
      themeBundle.styleCss || '',
      themeBundle.customCss ? `/* ── Workspace Custom Styles ── */\n${themeBundle.customCss}` : ''
    ].filter(Boolean).join('\n\n');

    const payload = {
      theme_css: fullThemeCss,
      font_url: themeBundle.theme?.fontUrl || '',
      theme_name: themeBundle.theme?.name || 'Trades Modern'
    };

    // 3. Dispatch POST to WordPress REST API
    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    if (workspace.wpUser && workspace.wpAppPassword) {
      const basic = Buffer.from(`${workspace.wpUser}:${workspace.wpAppPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const wpRes = await fetch(`${cleanWpUrl}/wp-json/plugin-control/v1/save-theme-css`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    let wpData = null;
    try {
      wpData = await wpRes.json();
    } catch (_) {
      wpData = await wpRes.text();
    }

    if (!wpRes.ok) {
      return NextResponse.json(
        {
          error: 'WordPress theme CSS sync failed',
          wpStatus: wpRes.status,
          details: wpData
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      wpSiteUrl: cleanWpUrl,
      themeName: payload.theme_name,
      cssLength: fullThemeCss.length,
      syncedAt: new Date().toISOString(),
      wpResponse: wpData
    });
  } catch (err) {
    console.error('Error in /api/admin/theme/sync-wordpress:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
