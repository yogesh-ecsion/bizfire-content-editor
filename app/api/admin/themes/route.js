import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * GET /api/admin/themes
 * Returns a list of all non-deleted themes with metadata, design tokens, and CSS sizes.
 */
export async function GET() {
  try {
    const themeRows = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,name,version,font_family,font_url,css,theme_json,default_page_template,is_master,is_deleted',
      [{ Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }],
      [{ UIKey: 'is_master', Direction: 'DESC' }, { UIKey: 'name', Direction: 'ASC' }]
    );

    const themes = (themeRows || [])
      .filter((t) => t.theme_slug !== 'global-baseline')
      .map((t) => {
      let rawJson = {};
      try {
        rawJson = typeof t.theme_json === 'string' ? JSON.parse(t.theme_json) : (t.theme_json || {});
      } catch {
        rawJson = {};
      }

      const css = t.css || '';
      return {
        rowGuid: t.row_guid,
        slug: t.theme_slug,
        name: t.name || t.theme_slug,
        version: t.version || '1.0.0',
        fontFamily: t.font_family || 'Outfit, sans-serif',
        fontUrl: t.font_url || '',
        css,
        cssLength: css.length,
        themeSettings: rawJson,
        defaultPageTemplate: t.default_page_template || 'service-standard',
        isMaster: Boolean(t.is_master === true || t.is_master === 'true'),
        updatedAt: t.updated_at || null
      };
    });

    return NextResponse.json({
      success: true,
      count: themes.length,
      themes
    });
  } catch (err) {
    console.error('Failed to list themes:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to list themes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/themes
 * Creates a new theme record in public.themes
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      slug: customSlug,
      fontFamily,
      fontUrl,
      css,
      themeSettings,
      defaultPageTemplate,
      isMaster = false
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Theme name is required' },
        { status: 400 }
      );
    }

    const themeSlug = slugify(customSlug || name);
    if (!themeSlug) {
      return NextResponse.json(
        { success: false, error: 'Valid theme slug is required' },
        { status: 400 }
      );
    }

    // 1. Conflict check: verify slug is unique
    const existing = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug',
      [
        { Operand: 'eq', UIKey: 'theme_slug', Value: themeSlug },
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `A theme with slug "${themeSlug}" already exists.` },
        { status: 409 }
      );
    }

    const rowGuid = crypto.randomUUID();
    const themeJson = themeSettings ? (typeof themeSettings === 'string' ? themeSettings : JSON.stringify(themeSettings)) : '{}';

    const payload = {
      row_guid: rowGuid,
      theme_slug: themeSlug,
      name: name.trim(),
      version: '1.0.0',
      font_family: fontFamily || 'Outfit, sans-serif',
      font_url: fontUrl || '',
      css: css || '',
      theme_json: themeJson,
      default_page_template: defaultPageTemplate || 'service-standard',
      is_master: Boolean(isMaster),
      is_deleted: false
    };

    await DataService.merge([payload], 'themes');

    // 2. Parity: save local copy on filesystem
    try {
      const themeDir = path.join(process.cwd(), 'themes', themeSlug);
      if (!fs.existsSync(themeDir)) {
        fs.mkdirSync(themeDir, { recursive: true });
      }
      fs.writeFileSync(path.join(themeDir, 'style.css'), css || '', 'utf8');
      fs.writeFileSync(path.join(themeDir, 'theme.json'), themeJson, 'utf8');
    } catch (fsErr) {
      console.warn(`Filesystem theme backup notice for "${themeSlug}":`, fsErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Theme "${name}" created successfully.`,
      theme: {
        rowGuid,
        slug: themeSlug,
        name: name.trim(),
        fontFamily: payload.font_family,
        fontUrl: payload.font_url,
        cssLength: (css || '').length,
        isMaster: payload.is_master
      }
    });
  } catch (err) {
    console.error('Failed to create theme:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create theme' },
      { status: 500 }
    );
  }
}
