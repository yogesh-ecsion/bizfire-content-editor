import fs from 'node:fs';
import path from 'node:path';
import { compilePage } from './compile.js';
import { compileFooter } from './footerCompiler.js';

const workspacesRoot = () => path.join(process.cwd(), 'workspaces');
const workspaceDir = (workspaceId) => path.join(workspacesRoot(), workspaceId);

/**
 * Strips UI-only keys (like instanceId) from sections before persisting.
 * Retains internal content IDs (like item._id in arrays) which belong to content.
 */
function sanitizeSections(sections = []) {
  return sections.map(section => {
    const { instanceId, ...rest } = section;
    return {
      type: rest.type,
      content: rest.content || {}
    };
  });
}

/**
 * Get workspace metadata
 */
export async function getWorkspace(workspaceId) {
  const wsDir = path.join(workspacesRoot(), workspaceId);
  const wsConfigPath = path.join(wsDir, 'workspace.json');

  if (!fs.existsSync(wsConfigPath)) {
    throw new Error(`Workspace "${workspaceId}" not found at ${wsConfigPath}`);
  }

  const raw = fs.readFileSync(wsConfigPath, 'utf8');
  const data = JSON.parse(raw);
  return {
    workspaceId: data.workspaceId || workspaceId,
    clientName: data.clientName || 'Untitled Client',
    themeId: data.themeId || 'trades-modern',
    wpSiteUrl: data.wpSiteUrl || '',
    wpUser: data.wpUser || '',
    wpAppPassword: data.wpAppPassword || '',
    apiKey: data.apiKey || '',
    createdAt: data.createdAt || null
  };
}

/**
 * Get the workspace's cloned theme bundle (styles, components, page templates)
 */
export async function getThemeBundle(workspaceId) {
  const wsDir = path.join(workspacesRoot(), workspaceId);
  const themeDir = path.join(wsDir, 'theme');

  if (!fs.existsSync(themeDir)) {
    throw new Error(`Theme directory for workspace "${workspaceId}" not found at ${themeDir}`);
  }

  // 1. Theme metadata
  const themeJsonPath = path.join(themeDir, 'theme.json');
  const theme = fs.existsSync(themeJsonPath)
    ? JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'))
    : { id: 'custom', name: 'Workspace Cloned Theme' };

  // 2. CSS Stylesheet
  const styleCssPath = path.join(themeDir, 'style.css');
  const styleCss = fs.existsSync(styleCssPath)
    ? fs.readFileSync(styleCssPath, 'utf8')
    : '';

  // 3. Components
  const components = [];
  const componentsDir = path.join(themeDir, 'components');
  if (fs.existsSync(componentsDir)) {
    const entries = fs.readdirSync(componentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const compDir = path.join(componentsDir, entry.name);
      const schemaPath = path.join(compDir, 'schema.json');
      const tplPath = path.join(compDir, 'template.html');
      const defPath = path.join(compDir, 'defaults.json');
      const compStylePath = path.join(compDir, 'style.css');

      if (fs.existsSync(schemaPath) && fs.existsSync(tplPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const template = fs.readFileSync(tplPath, 'utf8');
        const defaults = fs.existsSync(defPath)
          ? JSON.parse(fs.readFileSync(defPath, 'utf8'))
          : {};
        const css = fs.existsSync(compStylePath)
          ? fs.readFileSync(compStylePath, 'utf8')
          : '';

        components.push({
          id: entry.name,
          name: schema.name || entry.name,
          category: schema.category || 'General',
          schema: schema.fields || schema,
          rawSchema: schema,
          template,
          defaults,
          css
        });
      }
    }
  }

  // 4. Page Templates (look in page-templates/ or legacy pages/)
  const pageTemplates = [];
  let templatesDir = path.join(themeDir, 'page-templates');
  if (!fs.existsSync(templatesDir)) {
    templatesDir = path.join(themeDir, 'pages');
  }

  if (fs.existsSync(templatesDir)) {
    const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const tpl = JSON.parse(fs.readFileSync(path.join(templatesDir, entry.name), 'utf8'));
          pageTemplates.push(tpl);
        } catch (err) {
          console.error(`Error parsing template ${entry.name}:`, err);
        }
      }
    }
  }

  // 5. Workspace Global Custom CSS (Layer 3 overrides)
  const customCssPath = path.join(wsDir, 'custom.css');
  const customCss = fs.existsSync(customCssPath)
    ? fs.readFileSync(customCssPath, 'utf8')
    : '';

  return {
    theme,
    styleCss,
    components,
    pageTemplates,
    customCss
  };
}

/**
 * List all pages for a workspace (summary view)
 */
export async function getPageList(workspaceId) {
  const pagesDir = path.join(workspacesRoot(), workspaceId, 'pages');
  if (!fs.existsSync(pagesDir)) {
    return [];
  }

  const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
  const rawList = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const filePath = path.join(pagesDir, entry.name);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const baseName = path.basename(entry.name, '.json');

        const numId =
          data.postId && !isNaN(Number(data.postId)) && Number(data.postId) > 0
            ? Number(data.postId)
            : !isNaN(Number(baseName)) && Number(baseName) > 0
              ? Number(baseName)
              : null;

        const rowGuid =
          data.rowGuid ||
          data.uuid ||
          (isNaN(Number(baseName)) ? baseName : `p_${numId || baseName}`);

        rawList.push({
          rowGuid,
          postId: numId,
          slug: data.slug || '',
          title: data.title || 'Untitled Page',
          templateId: data.templateId || '',
          lastSavedAt: data.lastSavedAt || null,
          lastPublishedAt: data.lastPublishedAt || null,
          _fileName: entry.name,
          _filePath: filePath,
        });
      } catch (err) {
        console.error(`Failed to read page summary for ${entry.name}:`, err);
      }
    }
  }

  // Deduplicate: If multiple files share the same numeric postId, keep canonical ${postId}.json
  // or the latest saved version, and clean up obsolete duplicate files.
  const byPostId = new Map();
  const drafts = [];

  for (const item of rawList) {
    if (item.postId && item.postId > 0) {
      if (!byPostId.has(item.postId)) {
        byPostId.set(item.postId, item);
      } else {
        const existing = byPostId.get(item.postId);
        if (item._fileName === `${item.postId}.json`) {
          if (existing._fileName !== `${item.postId}.json`) {
            try { fs.unlinkSync(existing._filePath); } catch (e) {}
          }
          byPostId.set(item.postId, item);
        } else if (existing._fileName !== `${item.postId}.json`) {
          const dateCurrent = new Date(item.lastSavedAt || 0).getTime();
          const dateExisting = new Date(existing.lastSavedAt || 0).getTime();
          if (dateCurrent > dateExisting) {
            try { fs.unlinkSync(existing._filePath); } catch (e) {}
            byPostId.set(item.postId, item);
          } else {
            try { fs.unlinkSync(item._filePath); } catch (e) {}
          }
        }
      }
    } else {
      drafts.push(item);
    }
  }

  // Deduplicate drafts by slug or rowGuid
  const seenDraftKeys = new Set();
  const uniqueDrafts = [];
  for (const d of drafts) {
    const k = d.slug || d.rowGuid;
    if (!seenDraftKeys.has(k)) {
      seenDraftKeys.add(k);
      uniqueDrafts.push(d);
    }
  }

  const list = [...Array.from(byPostId.values()), ...uniqueDrafts].map(
    ({ _fileName, _filePath, ...rest }) => rest
  );

  return list.sort((a, b) => {
    if (a.postId && b.postId) return a.postId - b.postId;
    if (a.postId) return -1;
    if (b.postId) return 1;
    return (a.title || '').localeCompare(b.title || '');
  });
}

/**
 * Get full page content by postId
 */
export async function getPageContent(workspaceId, postId) {
  const pagesDir = path.join(workspacesRoot(), workspaceId, 'pages');
  let pagePath = path.join(pagesDir, `${postId}.json`);

  if (!fs.existsSync(pagePath)) {
    // Try finding by matching data.postId or data.rowGuid or data.slug
    const entries = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir) : [];
    let foundFile = null;
    for (const file of entries) {
      if (!file.endsWith('.json')) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(pagesDir, file), 'utf8'));
        if (
          String(d.postId) === String(postId) ||
          d.rowGuid === String(postId) ||
          d.slug === String(postId)
        ) {
          foundFile = file;
          break;
        }
      } catch (e) {}
    }
    if (foundFile) {
      pagePath = path.join(pagesDir, foundFile);
    } else {
      throw new Error(`Page ${postId} not found for workspace "${workspaceId}"`);
    }
  }

  const raw = fs.readFileSync(pagePath, 'utf8');
  const data = JSON.parse(raw);
  const numId =
    data.postId && !isNaN(Number(data.postId)) && Number(data.postId) > 0
      ? Number(data.postId)
      : null;

  return {
    rowGuid: data.rowGuid || path.basename(pagePath, '.json'),
    postId: numId || (isNaN(Number(postId)) ? null : Number(postId)),
    slug: data.slug || '',
    title: data.title || '',
    templateId: data.templateId || '',
    lastSavedAt: data.lastSavedAt || null,
    lastPublishedAt: data.lastPublishedAt || null,
    sections: data.sections || [],
  };
}

/**
 * Save page content JSON (strips instanceId from sections before writing)
 */
export async function savePageContent(workspaceId, postId, pageData) {
  const pagesDir = path.join(workspacesRoot(), workspaceId, 'pages');
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }

  const cleanPostId =
    postId && !isNaN(Number(postId)) && Number(postId) > 0
      ? Number(postId)
      : null;
  const fileKey = cleanPostId
    ? String(cleanPostId)
    : (pageData.rowGuid || pageData.pageGuid || (isNaN(Number(postId)) ? String(postId) : 'draft'));
  const pagePath = path.join(pagesDir, `${fileKey}.json`);
  let existing = {};

  if (fs.existsSync(pagePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
    } catch {
      existing = {};
    }
  }

  const now = new Date().toISOString();
  const sanitizedSections = sanitizeSections(pageData.sections || existing.sections || []);

  const toSave = {
    rowGuid: pageData.rowGuid || pageData.pageGuid || (cleanPostId ? `p_${cleanPostId}` : fileKey),
    postId: cleanPostId,
    slug: pageData.slug ?? existing.slug ?? '',
    title: pageData.title ?? existing.title ?? 'Untitled Page',
    templateId: pageData.templateId ?? existing.templateId ?? '',
    lastSavedAt: now,
    lastPublishedAt: existing.lastPublishedAt || null,
    sections: sanitizedSections,
  };

  fs.writeFileSync(pagePath, JSON.stringify(toSave, null, 2), 'utf8');

  return {
    success: true,
    savedAt: now,
    data: toSave,
  };
}

/**
 * Publish page: compile sections to HTML and update lastPublishedAt
 */
/**
 * Publish page: compile sections to HTML and update lastPublishedAt
 */
export async function publishPage(workspaceId, postId, options = {}) {
  const page = await getPageContent(workspaceId, postId);
  const themeBundle = await getThemeBundle(workspaceId);
  const workspace = await getWorkspace(workspaceId);

  // 1. Compile HTML (with Layer 2 component styles and Layer 3 custom CSS)
  const { html, rawSectionsHtml, combinedScopedCss, errors } = compilePage(page.sections || [], themeBundle.components || [], {
    customCss: themeBundle.customCss || '',
    includeStyles: false // Keep page_html clean of <style> tags
  });
  const now = new Date().toISOString();

  // 2. Build live URL
  const siteBase = workspace?.wpSiteUrl ? workspace.wpSiteUrl.replace(/\/$/, '') : '';
  const cleanSlug = (options.slug || page.slug || '').replace(/^\//, '').replace(/\/$/, '');
  let liveUrl = siteBase
    ? (cleanSlug ? `${siteBase}/${cleanSlug}/` : `${siteBase}/`)
    : `/live/${workspaceId}/${cleanSlug || page.postId}`;

  let wpResponse = null;
  let wpSyncStatus = 'synced';
  let wpSyncError = null;

  // 3. Attempt WordPress REST API publish if site URL is configured
  if (workspace?.wpSiteUrl) {
    const endpoint = `${siteBase}/wp-json/plugin-control/v1/save-page-html`;
    const headers = { 'Content-Type': 'application/json' };
    const resolvedApiKey = options.apiKey || workspace?.apiKey;
    if (resolvedApiKey) {
      headers['x-api-key'] = resolvedApiKey;
    }
    if (workspace?.wpUser && workspace?.wpAppPassword) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${workspace.wpUser}:${workspace.wpAppPassword}`).toString('base64');
    }

    // Page-specific styles: Layer 2 Deduplicated Component Styles
    const fullPageCss = combinedScopedCss || '';

    let companionScript = '';
    try {
      const scriptPath = path.join(process.cwd(), 'public', 'assets', 'js', 'script.js');
      if (fs.existsSync(scriptPath)) {
        const rawJs = fs.readFileSync(scriptPath, 'utf8');
        if (rawJs && rawJs.trim()) {
          companionScript = rawJs.trim();
        }
      }
    } catch (scriptErr) {
      console.warn('Could not load companion script.js:', scriptErr.message);
    }

    try {
      const payload = {
        post_id:
          page.postId && Number(page.postId) > 0
            ? Number(page.postId)
            : !isNaN(Number(postId)) && Number(postId) > 0
              ? Number(postId)
              : null,
        uuid: page.rowGuid || page.pageGuid || options.rowGuid || options.uuid,
        slug: cleanSlug,
        title: page.title || cleanSlug,
        page_html: rawSectionsHtml || html, // Keep 100% clean of <script> and <style> tags so WordPress does not render raw code
        page_css: fullPageCss,
        page_js: companionScript,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || `WordPress HTTP ${res.status}`);
      }
      wpResponse = data;
      wpSyncStatus = 'synced';
      if (data?.permalink) {
        liveUrl = data.permalink;
      }
    } catch (wpErr) {
      console.warn('Direct WordPress REST publish warning:', wpErr.message);
      wpSyncStatus = 'error';
      wpSyncError = wpErr.message;
    }
  }

  // 4. Update lastPublishedAt in local storage
  const pagePath = path.join(workspacesRoot(), workspaceId, 'pages', `${postId}.json`);
  const resolvedWpPostId =
    wpResponse?.post_id ||
    (page.postId && Number(page.postId) > 0 ? Number(page.postId) : null) ||
    (!isNaN(Number(postId)) && Number(postId) > 0 ? Number(postId) : null);

  if (fs.existsSync(pagePath)) {
    const raw = fs.readFileSync(pagePath, 'utf8');
    const data = JSON.parse(raw);
    data.lastPublishedAt = now;
    if (resolvedWpPostId) {
      data.postId = resolvedWpPostId;
    }

    // If the file was named after a temporary UUID/string and we now have a numeric WP post ID,
    // write to ${resolvedWpPostId}.json and remove the temporary draft file!
    if (resolvedWpPostId && String(postId) !== String(resolvedWpPostId)) {
      const newPath = path.join(workspacesRoot(), workspaceId, 'pages', `${resolvedWpPostId}.json`);
      fs.writeFileSync(newPath, JSON.stringify(data, null, 2), 'utf8');
      try {
        fs.unlinkSync(pagePath);
      } catch (e) {}
    } else {
      fs.writeFileSync(pagePath, JSON.stringify(data, null, 2), 'utf8');
    }
  }

  return {
    success: true,
    postId: resolvedWpPostId,
    publishedAt: now,
    liveUrl,
    compiledHtml: html,
    errors,
    wpSyncStatus,
    wpSyncError,
    wpResponse,
  };
}

/**
 * Fetch Site Header configuration for workspace
 */
export async function getHeader(workspaceId) {
  const wsDir = workspaceDir(workspaceId);
  const headerFile = path.join(wsDir, 'header.json');
  if (fs.existsSync(headerFile)) {
    try {
      return JSON.parse(fs.readFileSync(headerFile, 'utf8'));
    } catch (e) {
      console.warn('Could not parse header.json:', e.message);
    }
  }
  const workspace = await getWorkspace(workspaceId).catch(() => null);
  const pages = await getPageList(workspaceId).catch(() => []);
  return {
    workspaceId,
    branding: {
      siteTitle: workspace?.clientName || 'Demo Site',
      logoUrl: '',
      logoWidth: 180,
      tagline: 'Quality Service You Can Trust',
    },
    contact: {
      phone: '(609) 555-0100',
      phoneLabel: 'Call Us 24/7',
      showPhone: true,
    },
    cta: {
      text: 'Schedule Service',
      url: '/contact/',
      showCta: true,
    },
    settings: {
      isSticky: true,
      showTopBar: true,
      topBarText: 'Proudly Serving Local Homeowners & Businesses',
    },
    items: (pages || []).slice(0, 5).map((p, idx) => ({
      id: `item-${idx}`,
      label: p.title || p.slug,
      url: `/${p.slug}/`,
      target: '_self',
    })),
  };
}

/**
 * Save Site Header configuration
 */
export async function saveHeader(workspaceId, headerData) {
  const wsDir = workspaceDir(workspaceId);
  const headerFile = path.join(wsDir, 'header.json');
  fs.writeFileSync(headerFile, JSON.stringify(headerData, null, 2), 'utf8');
  return { success: true, savedAt: new Date().toISOString(), headerData };
}

/**
 * Publish Site Header
 */
export async function publishHeader(workspaceId, headerData) {
  await saveHeader(workspaceId, headerData);
  return { success: true, publishedAt: new Date().toISOString() };
}

/**
 * Fetch Site Footer configuration for workspace
 */
export async function getFooter(workspaceId) {
  const wsDir = workspaceDir(workspaceId);
  const footerFile = path.join(wsDir, 'footer.json');
  if (fs.existsSync(footerFile)) {
    try {
      return JSON.parse(fs.readFileSync(footerFile, 'utf8'));
    } catch (e) {
      console.warn('Could not parse footer.json:', e.message);
    }
  }
  const workspace = await getWorkspace(workspaceId).catch(() => null);
  const pages = await getPageList(workspaceId).catch(() => []);
  return {
    workspaceId,
    branding: {
      siteTitle: workspace?.clientName || 'Demo Site',
      logoUrl: '',
      logoWidth: 160,
      tagline: 'Quality Service You Can Trust',
      aboutText:
        'Providing reliable heating, cooling, and home comfort solutions. Dedicated to excellence, customer satisfaction, and fast 24/7 emergency dispatch.',
    },
    columns: [
      {
        id: 'col-quick-links',
        title: 'Quick Links',
        links: (pages || []).slice(0, 4).map((p, idx) => ({
          id: `fl-${idx}`,
          label: p.title || p.slug,
          url: `/${p.slug}/`,
          target: '_self',
        })),
      },
      {
        id: 'col-services',
        title: 'Services',
        links: [
          { id: 'fl-s1', label: 'AC Repair & Tune-Up', url: '/services/', target: '_self' },
          { id: 'fl-s2', label: 'Heating & Furnace Repair', url: '/services/', target: '_self' },
          { id: 'fl-s3', label: 'Emergency Dispatch', url: '/contact/', target: '_self' },
        ],
      },
    ],
    contact: {
      phone: '(609) 555-0100',
      phoneLabel: 'Phone',
      email: 'support@example.com',
      emailLabel: 'Email',
      address: '100 Main Street, Princeton, NJ 08540',
      addressLabel: 'Address',
      workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM | 24/7 Emergency',
      showPhone: true,
      showEmail: true,
      showAddress: true,
    },
    social: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      showSocial: true,
    },
    settings: {
      theme: 'dark',
    },
    bottomBar: {
      copyrightText: `© ${new Date().getFullYear()} ${workspace?.clientName || 'Bizfire Site'}. All rights reserved.`,
      privacyPolicyUrl: '/privacy-policy/',
      termsUrl: '/terms-of-service/',
    },
  };
}

/**
 * Save Site Footer configuration
 */
export async function saveFooter(workspaceId, footerData) {
  const wsDir = workspaceDir(workspaceId);
  const footerFile = path.join(wsDir, 'footer.json');
  fs.writeFileSync(footerFile, JSON.stringify(footerData, null, 2), 'utf8');
  return { success: true, savedAt: new Date().toISOString(), footerData };
}

/**
 * Publish Site Footer to WordPress and local storage
 */
export async function publishFooter(workspaceId, footerData = {}) {
  await saveFooter(workspaceId, footerData);
  const workspace = await getWorkspace(workspaceId).catch(() => null);
  let wpResponse = null;
  let wpSyncStatus = 'synced';
  let wpSyncError = null;

  if (workspace?.wpSiteUrl) {
    const { compiledFooter } = compileFooter(footerData);
    const siteBase = workspace.wpSiteUrl.replace(/\/$/, '');
    const endpoint = `${siteBase}/wp-json/plugin-control/v1/save-footer-html`;
    const headers = { 'Content-Type': 'application/json' };
    if (workspace?.apiKey) {
      headers['x-api-key'] = workspace.apiKey;
    }
    if (workspace?.wpUser && workspace?.wpAppPassword) {
      headers['Authorization'] =
        'Basic ' +
        Buffer.from(`${workspace.wpUser}:${workspace.wpAppPassword}`).toString('base64');
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          footer_html: compiledFooter,
          footer_json: footerData,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || `WordPress HTTP ${res.status}`);
      }
      wpResponse = data;
    } catch (wpErr) {
      console.warn('Direct WordPress footer publish warning:', wpErr.message);
      wpSyncStatus = 'error';
      wpSyncError = wpErr.message;
    }
  }

  return {
    success: true,
    publishedAt: new Date().toISOString(),
    wpSyncStatus,
    wpSyncError,
    wpResponse,
  };
}

/**
 * Save workspace global custom CSS (Layer 3 overrides)
 */
export async function saveWorkspaceCustomCss(workspaceId, customCss) {
  const customCssPath = path.join(workspacesRoot(), workspaceId, 'custom.css');
  fs.writeFileSync(customCssPath, customCss || '', 'utf8');
  return {
    success: true,
    workspaceId,
    customCss: customCss || '',
    savedAt: new Date().toISOString(),
  };
}


