import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

const BASELINE_PATH = path.join(process.cwd(), 'public', 'assets', 'css', 'baseline.css');

/**
 * POST /api/admin/baseline/sync-wordpress
 * Reads Global Baseline CSS (bootstrap.css) from database themes table (or local cache)
 * and pushes to WordPress option bizfire_base_framework_css via /wp-json/plugin-control/v1/save-theme-css
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let targetWorkspaceId = body.workspaceId || '';
    let wpSiteUrl = (body.siteUrl || '').trim();
    let apiKey = (body.apiKey || '').trim();
    let targetName = body.name || '';

    // 1. Resolve baseline CSS from database themes table first, then filesystem cache
    let baseCss = '';
    let baselineSource = 'filesystem';

    try {
      const dbRows = await DataService.selectRows(
        'themes',
        'row_guid,theme_slug,css,theme_json',
        [
          { Operand: 'eq', UIKey: 'theme_slug', Value: 'global-baseline' },
          { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
        ]
      );
      if (dbRows && dbRows[0] && dbRows[0].css) {
        baseCss = dbRows[0].css;
        baselineSource = 'database (themes table)';
      }
    } catch (dbErr) {
      console.warn('Could not query baseline from database:', dbErr.message);
    }

    if (!baseCss && fs.existsSync(BASELINE_PATH)) {
      baseCss = fs.readFileSync(BASELINE_PATH, 'utf8');
      baselineSource = 'local filesystem cache';
    }

    if (!baseCss || !baseCss.trim()) {
      return NextResponse.json(
        { success: false, error: 'No baseline CSS file or database record exists to sync' },
        { status: 404 }
      );
    }

    // 2. Resolve target workspace and credentials
    if (targetWorkspaceId) {
      try {
        const workspace = await DataService.getWorkspace(targetWorkspaceId);
        if (!wpSiteUrl && workspace?.wpSiteUrl) wpSiteUrl = workspace.wpSiteUrl;
        if (!apiKey && workspace?.apiKey) apiKey = workspace.apiKey;
        if (!targetName && workspace?.clientName) targetName = workspace.clientName;
      } catch (wsErr) {
        console.warn('Workspace lookup warning during baseline sync:', wsErr.message);
      }
    }

    // Fallback: If apiKey or wpSiteUrl is missing, auto-resolve from seo_projects
    if (!apiKey || !wpSiteUrl) {
      try {
        const seoRows = await DataService.selectRows(
          'seo_projects',
          'row_guid,project_name,domain,api_key',
          []
        );
        // Find matching project: by siteUrl match, or bizfireseo.staging1a.com, or first valid with apiKey
        let match = null;
        if (wpSiteUrl) {
          const cleanUrl = wpSiteUrl.toLowerCase().replace(/\/+$/, '');
          match = (seoRows || []).find(p => p.domain && p.domain.toLowerCase().includes(cleanUrl) && p.api_key);
        }
        if (!match) {
          match = (seoRows || []).find(p => p.domain && p.domain.includes('staging1a') && p.api_key);
        }
        if (!match) {
          match = (seoRows || []).find(p => !!p.api_key);
        }

        if (match) {
          if (!wpSiteUrl && match.domain) wpSiteUrl = match.domain;
          if (!targetWorkspaceId) targetWorkspaceId = match.row_guid;
          if (!apiKey && match.api_key) apiKey = match.api_key;
          if (!targetName && match.project_name) targetName = match.project_name;
        }
      } catch (seoErr) {
        console.warn('SEO projects fallback lookup warning:', seoErr.message);
      }
    }

    if (!wpSiteUrl) {
      wpSiteUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bizfireseo.staging1a.com';
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: `No WordPress API Key found for ${wpSiteUrl}. Please configure an API Key for this workspace.`
        },
        { status: 401 }
      );
    }

    const cleanWpUrl = wpSiteUrl.replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    };

    const wpRes = await fetch(`${cleanWpUrl}/wp-json/plugin-control/v1/save-theme-css`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_css: baseCss
      })
    });

    const wpData = await wpRes.json().catch(() => null);

    if (!wpRes.ok || (wpData && wpData.success === false)) {
      throw new Error(wpData?.message || `WordPress HTTP ${wpRes.status}: ${JSON.stringify(wpData)}`);
    }

    return NextResponse.json({
      success: true,
      message: `Global baseline CSS successfully pushed and enqueued on ${targetName || cleanWpUrl}.`,
      siteUrl: cleanWpUrl,
      targetName: targetName || 'WordPress Site',
      workspaceId: targetWorkspaceId,
      baselineSource,
      sizeBytes: Buffer.byteLength(baseCss, 'utf8'),
      wpResponse: wpData
    });
  } catch (err) {
    console.error('Failed to sync baseline CSS to WordPress:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to sync baseline CSS' },
      { status: 500 }
    );
  }
}
