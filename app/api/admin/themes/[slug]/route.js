import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import DataService from '@/api-services/data.service';

/**
 * GET /api/admin/themes/[slug]
 * Fetches single theme by slug
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const rows = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,name,version,font_family,font_url,css,theme_json,default_page_template,is_master,is_deleted',
      [
        { Operand: 'eq', UIKey: 'theme_slug', Value: slug },
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Theme "${slug}" not found` },
        { status: 404 }
      );
    }

    const t = rows[0];
    let rawJson = {};
    try {
      rawJson = typeof t.theme_json === 'string' ? JSON.parse(t.theme_json) : (t.theme_json || {});
    } catch {
      rawJson = {};
    }

    return NextResponse.json({
      success: true,
      theme: {
        rowGuid: t.row_guid,
        slug: t.theme_slug,
        name: t.name || t.theme_slug,
        version: t.version || '1.0.0',
        fontFamily: t.font_family || 'Outfit, sans-serif',
        fontUrl: t.font_url || '',
        css: t.css || '',
        themeSettings: rawJson,
        defaultPageTemplate: t.default_page_template || 'service-standard',
        isMaster: Boolean(t.is_master === true || t.is_master === 'true')
      }
    });
  } catch (err) {
    console.error(`Failed to get theme:`, err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/themes/[slug]
 * Updates an existing theme's CSS, typography, or metadata
 */
export async function PUT(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const {
      name,
      fontFamily,
      fontUrl,
      css,
      themeSettings,
      defaultPageTemplate,
      isMaster
    } = body;

    const rows = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,name,version,font_family,font_url,css,theme_json,is_master',
      [
        { Operand: 'eq', UIKey: 'theme_slug', Value: slug },
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Theme "${slug}" not found` },
        { status: 404 }
      );
    }

    const current = rows[0];
    const themeJson = themeSettings !== undefined
      ? (typeof themeSettings === 'string' ? themeSettings : JSON.stringify(themeSettings))
      : current.theme_json;

    const payload = {
      row_guid: current.row_guid,
      theme_slug: slug,
      name: name !== undefined ? name.trim() : current.name,
      font_family: fontFamily !== undefined ? fontFamily : current.font_family,
      font_url: fontUrl !== undefined ? fontUrl : current.font_url,
      css: css !== undefined ? css : current.css,
      theme_json: themeJson,
      default_page_template: defaultPageTemplate !== undefined ? defaultPageTemplate : current.default_page_template,
      is_master: isMaster !== undefined ? Boolean(isMaster) : current.is_master,
      is_deleted: false
    };

    await DataService.merge([payload], 'themes');

    // Update filesystem copy
    try {
      const themeDir = path.join(process.cwd(), 'themes', slug);
      if (!fs.existsSync(themeDir)) {
        fs.mkdirSync(themeDir, { recursive: true });
      }
      if (css !== undefined) {
        fs.writeFileSync(path.join(themeDir, 'style.css'), css || '', 'utf8');
      }
      fs.writeFileSync(path.join(themeDir, 'theme.json'), themeJson || '{}', 'utf8');
    } catch (fsErr) {
      console.warn(`Filesystem theme update notice for "${slug}":`, fsErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Theme "${slug}" updated successfully.`,
      theme: {
        rowGuid: current.row_guid,
        slug,
        name: payload.name,
        cssLength: (payload.css || '').length,
        fontFamily: payload.font_family,
        fontUrl: payload.font_url,
        isMaster: payload.is_master
      }
    });
  } catch (err) {
    console.error(`Failed to update theme:`, err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update theme' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/themes/[slug]
 * Soft-deletes a theme (is_deleted = true)
 */
export async function DELETE(request, { params }) {
  try {
    const { slug } = await params;

    const rows = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,is_master',
      [
        { Operand: 'eq', UIKey: 'theme_slug', Value: slug },
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Theme "${slug}" not found` },
        { status: 404 }
      );
    }

    const current = rows[0];

    // Prevent deleting the primary master theme
    if (Boolean(current.is_master) && slug === 'trades-modern') {
      return NextResponse.json(
        { success: false, error: 'The primary system baseline theme cannot be deleted.' },
        { status: 400 }
      );
    }

    await DataService.merge([{
      row_guid: current.row_guid,
      theme_slug: slug,
      is_deleted: true
    }], 'themes');

    return NextResponse.json({
      success: true,
      message: `Theme "${slug}" was successfully deleted.`
    });
  } catch (err) {
    console.error(`Failed to delete theme:`, err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete theme' },
      { status: 500 }
    );
  }
}
