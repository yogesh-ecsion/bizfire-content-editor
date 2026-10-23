import { NextResponse } from 'next/server';
import { DataSource } from '../../../lib/dataSource.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { workspaceId, postId, rowGuid, pageGuid, slug, title, templateId, sections, stashedSections } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing required field: workspaceId' },
        { status: 400 }
      );
    }

    // Support batch saving if body.pages array is provided
    if (Array.isArray(body.pages) && body.pages.length > 0) {
      const results = [];
      for (const p of body.pages) {
        if (!p.postId && p.postId !== 0) continue;
        const saved = await DataSource.savePageContent(workspaceId, p.postId, {
          rowGuid: p.rowGuid || p.pageGuid,
          slug: p.slug,
          title: p.title,
          templateId: p.templateId || templateId || 'service-standard',
          sections: p.sections || sections || []
        });
        results.push(saved);
      }
      return NextResponse.json({
        success: true,
        count: results.length,
        pages: results
      });
    }

    const targetPostId = (postId && Number(postId) > 0) ? postId : (rowGuid || pageGuid || postId);
    if (!targetPostId && targetPostId !== 0) {
      return NextResponse.json(
        { error: 'Missing required field: postId or rowGuid' },
        { status: 400 }
      );
    }

    const result = await DataSource.savePageContent(workspaceId, targetPostId, {
      rowGuid: rowGuid || pageGuid,
      slug,
      title,
      templateId,
      sections,
      stashedSections
    });

    return NextResponse.json({
      success: true,
      postId,
      rowGuid: result?.rowGuid,
      savedAt: result?.savedAt || new Date().toISOString(),
      slug: result?.slug || slug,
      title: result?.title || title,
      sections: result?.sections || sections,
    });
  } catch (error) {
    console.error('API /api/save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save page content' },
      { status: 500 }
    );
  }
}
