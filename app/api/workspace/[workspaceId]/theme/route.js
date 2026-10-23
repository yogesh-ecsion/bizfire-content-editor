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
      activeThemeSlug: workspace?.themeId || 'trades-modern',
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
 * Sets active theme for this workspace
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

    // Verify theme exists
    const themes = await DataService.selectRows(
      'themes',
      'row_guid,theme_slug,name,css,font_url',
      [
        { Operand: 'eq', UIKey: 'theme_slug', Value: themeSlug },
        { Operand: 'eq', UIKey: 'is_deleted', Value: 'false' }
      ]
    );

    if (!themes || themes.length === 0) {
      return NextResponse.json(
        { success: false, error: `Theme "${themeSlug}" does not exist` },
        { status: 404 }
      );
    }

    const selectedTheme = themes[0];
    await DataService.updateWorkspaceTheme(workspaceId, themeSlug);

    return NextResponse.json({
      success: true,
      message: `Active theme updated to "${selectedTheme.name || themeSlug}"`,
      workspaceId,
      activeThemeSlug: themeSlug,
      theme: {
        slug: themeSlug,
        name: selectedTheme.name,
        fontUrl: selectedTheme.font_url
      }
    });
  } catch (err) {
    console.error('Failed to update workspace theme:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update workspace theme' },
      { status: 500 }
    );
  }
}
