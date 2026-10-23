import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

const BASELINE_PATH = path.join(process.cwd(), 'public', 'assets', 'css', 'baseline.css');
const META_PATH = path.join(process.cwd(), 'public', 'assets', 'css', 'baseline-meta.json');
const BASELINE_ROW_GUID = 'b0000000-0000-0000-0000-000000000001';

/**
 * GET /api/admin/baseline
 * Retrieves metadata, preview, and target sites for Global Baseline CSS (bootstrap.css)
 * Stored in public.themes with identifier theme_slug = 'global-baseline' and theme_json.is_baseline = true
 */
export async function GET() {
  try {
    let content = '';
    let meta = {
      fileName: 'bootstrap.css',
      description: 'Base Framework 12-Column Grid & Layout Utilities',
      isBaseline: true
    };
    let rowGuid = BASELINE_ROW_GUID;
    let updatedAt = null;

    // 1. Query themes table in Azure PostgreSQL for theme_slug = 'global-baseline'
    try {
      const dbRows = await DataService.selectRows(
        'themes',
        'row_guid,theme_slug,name,css,theme_json,updated_at',
        [
          { Operand: 'eq', UIKey: 'theme_slug', Value: 'global-baseline' },
          { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
        ]
      );

      if (dbRows && dbRows[0]) {
        const row = dbRows[0];
        rowGuid = row.row_guid;
        content = row.css || '';
        updatedAt = row.updated_at || null;
        try {
          const parsed = typeof row.theme_json === 'string' ? JSON.parse(row.theme_json) : row.theme_json;
          if (parsed) meta = { ...meta, ...parsed };
        } catch {}
      }
    } catch (dbErr) {
      console.warn('Could not query baseline from database themes table:', dbErr.message);
    }

    // 2. If not found in DB but exists on filesystem, seed it into themes table
    if (!content && fs.existsSync(BASELINE_PATH)) {
      content = fs.readFileSync(BASELINE_PATH, 'utf8');
      const stat = fs.statSync(BASELINE_PATH);
      updatedAt = stat.mtime.toISOString();

      try {
        const payload = {
          row_guid: BASELINE_ROW_GUID,
          theme_slug: 'global-baseline',
          name: 'Global Baseline CSS (Bootstrap)',
          version: '1.0.0',
          font_family: '',
          font_url: '',
          css: content.trim(),
          theme_json: JSON.stringify({
            is_baseline: true,
            fileName: 'bootstrap.css',
            sizeBytes: Buffer.byteLength(content, 'utf8'),
            hash: crypto.createHash('sha256').update(content).digest('hex').slice(0, 12),
            updatedAt
          }),
          default_page_template: '',
          is_master: false,
          is_deleted: false
        };
        await DataService.merge([payload], 'themes');
      } catch (seedErr) {
        console.warn('Could not seed baseline into themes table:', seedErr.message);
      }
    }

    // 3. Keep local filesystem cache in sync
    if (content) {
      try {
        const dir = path.dirname(BASELINE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(BASELINE_PATH) || fs.readFileSync(BASELINE_PATH, 'utf8') !== content) {
          fs.writeFileSync(BASELINE_PATH, content, 'utf8');
        }
      } catch {}
    }

    // 4. Resolve connected WordPress sites from seo_projects and user_product_configured
    let targetSites = [];
    try {
      const sitesMap = new Map();

      // Primary: seo_projects table with active domains and API keys
      try {
        const seoRows = await DataService.selectRows(
          'seo_projects',
          'row_guid,project_name,domain,api_key',
          []
        );
        (seoRows || []).forEach(p => {
          const siteUrl = (p.domain || '').trim().replace(/\/+$/, '');
          if (siteUrl && p.api_key) {
            sitesMap.set(siteUrl.toLowerCase(), {
              workspaceId: p.row_guid,
              siteUrl,
              name: p.project_name || 'WordPress Site',
              hasApiKey: Boolean(p.api_key)
            });
          }
        });
      } catch (seoErr) {
        console.warn('Could not query seo_projects for baseline sync:', seoErr.message);
      }

      // Secondary: user_product_configured table
      try {
        const configRows = await DataService.selectRows(
          'user_product_configured',
          'row_guid,url,data_json,status,user_workspace_guid,wpi_api_key',
          []
        );
        (configRows || []).forEach(r => {
          const dj = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : (r.data_json || {});
          const rawUrl = r.url || dj.site_url || dj.domain || '';
          const siteUrl = rawUrl.trim().replace(/\/+$/, '');
          const apiKey = r.wpi_api_key || dj.wpi_api_key || dj.apiKey || dj.api_key || '';
          if (siteUrl && !sitesMap.has(siteUrl.toLowerCase())) {
            sitesMap.set(siteUrl.toLowerCase(), {
              workspaceId: r.user_workspace_guid,
              siteUrl,
              name: dj.project_name || dj.name || 'WordPress Site',
              hasApiKey: Boolean(apiKey)
            });
          }
        });
      } catch (confErr) {
        console.warn('Could not load configured sites for baseline sync:', confErr.message);
      }

      targetSites = Array.from(sitesMap.values()).sort((a, b) => {
        // Sort staging1a or bizfireseo to top
        const aStaging = a.siteUrl.includes('staging1a') || a.siteUrl.includes('bizfireseo');
        const bStaging = b.siteUrl.includes('staging1a') || b.siteUrl.includes('bizfireseo');
        if (aStaging && !bStaging) return -1;
        if (!aStaging && bStaging) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (sitesErr) {
      console.warn('Target sites aggregation notice:', sitesErr.message);
    }

    const hash = content ? crypto.createHash('sha256').update(content).digest('hex').slice(0, 12) : null;
    const sizeBytes = content ? Buffer.byteLength(content, 'utf8') : 0;

    return NextResponse.json({
      success: true,
      exists: Boolean(content),
      storedInDatabase: true,
      rowGuid,
      identifier: 'global-baseline',
      fileName: meta.fileName || 'bootstrap.css',
      description: meta.description || 'Base Framework Grid & Layout Utilities',
      sizeBytes,
      hash,
      lineCount: content ? content.split('\n').length : 0,
      updatedAt,
      preview: content.slice(0, 4000),
      targetSites
    });
  } catch (err) {
    console.error('Failed to read baseline CSS:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read baseline CSS' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/baseline
 * Uploads/updates Global Baseline CSS file (bootstrap.css) and saves it to public.themes table
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let css = '';
    let fileName = 'bootstrap.css';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }
      fileName = file.name || 'bootstrap.css';
      css = await file.text();
    } else {
      const body = await request.json();
      css = body.css || '';
      fileName = body.fileName || 'bootstrap.css';
    }

    if (!css || !css.trim()) {
      return NextResponse.json({ success: false, error: 'CSS content cannot be empty' }, { status: 400 });
    }

    const trimmedCss = css.trim();
    const hash = crypto.createHash('sha256').update(trimmedCss).digest('hex').slice(0, 12);
    const sizeBytes = Buffer.byteLength(trimmedCss, 'utf8');
    const updatedAt = new Date().toISOString();

    // 1. Resolve row_guid in themes table
    let rowGuid = BASELINE_ROW_GUID;
    try {
      const existingRows = await DataService.selectRows(
        'themes',
        'row_guid,theme_slug',
        [{ Operand: 'eq', UIKey: 'theme_slug', Value: 'global-baseline' }]
      );
      if (existingRows && existingRows[0]) {
        rowGuid = existingRows[0].row_guid;
      }
    } catch {}

    // 2. Persist in public.themes table with identifier theme_slug = 'global-baseline'
    const payload = {
      row_guid: rowGuid,
      theme_slug: 'global-baseline',
      name: 'Global Baseline CSS (Bootstrap)',
      version: '1.0.0',
      font_family: '',
      font_url: '',
      css: trimmedCss,
      theme_json: JSON.stringify({
        is_baseline: true,
        framework: 'bootstrap',
        fileName,
        sizeBytes,
        hash,
        updatedAt
      }),
      default_page_template: '',
      is_master: false,
      is_deleted: false
    };

    await DataService.merge([payload], 'themes');

    // 3. Write filesystem parity copy
    try {
      const dir = path.dirname(BASELINE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(BASELINE_PATH, trimmedCss, 'utf8');

      const meta = { fileName, updatedAt, sizeBytes, hash, isBaseline: true };
      fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf8');
    } catch (fsErr) {
      console.warn('Filesystem parity write notice:', fsErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Global baseline CSS (${fileName}) successfully saved to database (themes table) and filesystem.`,
      meta: {
        rowGuid,
        identifier: 'global-baseline',
        fileName,
        sizeBytes,
        hash,
        updatedAt
      }
    });
  } catch (err) {
    console.error('Failed to save baseline CSS:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save baseline CSS' },
      { status: 500 }
    );
  }
}
