import fs from 'fs';
import path from 'path';
import DataService from "@/api-services/data.service";
import { compilePage } from "./compile.js";
import { compileHeader } from "./headerCompiler.js";
import { compileFooter } from "./footerCompiler.js";

/**
 * ApiSource: PostgreSQL & Azure .NET implementation of the Editor DataSource interface
 */
export const ApiSource = {
  /**
   * Fetch Workspace metadata
   */
  async getWorkspace(workspaceId) {
    return await DataService.getWorkspace(workspaceId);
  },

  /**
   * Fetch the workspace's cloned theme bundle
   */
  async getThemeBundle(workspaceId) {
    return await DataService.getThemeBundle(workspaceId);
  },

  /**
   * Fetch list of page summaries
   */
  async getPageList(workspaceId) {
    return await DataService.getPageList(workspaceId);
  },

  /**
   * Fetch specific page content
   */
  async getPageContent(workspaceId, postId) {
    return await DataService.getPageContent(workspaceId, postId);
  },

  /**
   * Save page content
   */
  async savePageContent(workspaceId, postId, data) {
    return await DataService.savePageContent(workspaceId, postId, data);
  },

  /**
   * Publish page to WordPress and Azure PostgreSQL
   *
   * 1. Fetches current page content, theme bundle components, and workspace settings.
   * 2. Compiles component sections into clean HTML via Handlebars.
   * 3. Attempts to push compiled HTML to WordPress REST API meta (bizfire_page_html).
   * 4. Updates PostgreSQL pages table with compiled_html, status, and last_published_at.
   * 5. Records an immutable snapshot in the publications table.
   *
   * @param {string} workspaceId
   * @param {string|number} postId
   * @returns {Promise<{ success: boolean, publishedAt: string, liveUrl: string, compiledHtml: string, errors: Array, wpSyncStatus: string, wpResponse: object }>}
   */
  async publishPage(workspaceId, postId, options = {}) {
    const page = await this.getPageContent(workspaceId, postId);
    if (!page) {
      throw new Error(`Page "${postId}" not found in workspace "${workspaceId}"`);
    }

    const themeBundle = await this.getThemeBundle(workspaceId);
    const workspace = await this.getWorkspace(workspaceId);

    // 1. Compile page sections into HTML using theme components and Layer 3 custom CSS
    const { html, rawSectionsHtml, combinedScopedCss, errors } = compilePage(page.sections || [], themeBundle.components || [], {
      customCss: themeBundle.customCss || "",
      includeStyles: false // Keep page_html 100% clean of <style> tags so WordPress does not render raw CSS text
    });
    const now = new Date().toISOString();

    // 2. Build live URL
    const siteBase = workspace?.wpSiteUrl ? workspace.wpSiteUrl.replace(/\/$/, "") : "";
    const cleanSlug = (options.slug || page.slug || "").replace(/^\//, "").replace(/\/$/, "");
    let liveUrl = siteBase
      ? (cleanSlug ? `${siteBase}/${cleanSlug}/` : `${siteBase}/`)
      : `/live/${workspaceId}/${cleanSlug || page.postId}`;

    // 3. Attempt WordPress REST API publish if site URL is configured
    let wpResponse = null;
    let wpSyncStatus = "synced";
    let wpSyncError = null;

    if (workspace?.wpSiteUrl) {
      const endpoint = `${siteBase}/wp-json/plugin-control/v1/save-page-html`;
      const headers = { "Content-Type": "application/json" };
      const resolvedApiKey = options.apiKey || workspace?.apiKey;
      if (resolvedApiKey) {
        headers["x-api-key"] = resolvedApiKey;
      }
      if (workspace?.wpUser && workspace?.wpAppPassword) {
        headers["Authorization"] = "Basic " + Buffer.from(`${workspace.wpUser}:${workspace.wpAppPassword}`).toString("base64");
      }

      // Combine Layer 1 (Theme Styles) + Layer 2 (Scoped Component Styles) + Layer 3 (Workspace Custom Overrides)
      const fullPageCss = [
        themeBundle?.styleCss || "",
        combinedScopedCss || ""
      ].filter(Boolean).join("\n\n");

      // Optional: Companion client script (carousel, map, modal interactivity)
      let companionScript = "";
      try {
        const scriptPath = path.join(process.cwd(), "public", "assets", "js", "script.js");
        if (fs.existsSync(scriptPath)) {
          const rawJs = fs.readFileSync(scriptPath, "utf8");
          if (rawJs && rawJs.trim()) {
            companionScript = `\n\n<script id="bizfire-companion-script">\n${rawJs.trim()}\n</script>`;
          }
        }
      } catch (scriptErr) {
        console.warn("Could not load companion script.js:", scriptErr.message);
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
          page_html: (rawSectionsHtml || html) + companionScript,
          page_css: fullPageCss,
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || data?.error || `WordPress HTTP ${res.status}`);
        }
        wpResponse = data;
        wpSyncStatus = "synced";
        if (data?.permalink) {
          liveUrl = data.permalink;
        }
      } catch (wpErr) {
        console.warn("Direct WordPress REST publish warning:", wpErr.message);
        wpSyncStatus = "error";
        wpSyncError = wpErr.message;
      }
    }

    // 4. Update PostgreSQL pages table with compiled HTML, published status, and linked WP post_id
    const resolvedWpPostId =
      wpResponse?.post_id ||
      (page.postId && Number(page.postId) > 0 ? Number(page.postId) : null) ||
      (!isNaN(Number(postId)) && Number(postId) > 0 ? Number(postId) : null);

    await DataService.updatePagePublishStatus(workspaceId, {
      postId: resolvedWpPostId,
      rowGuid: page.rowGuid || page.pageGuid || options.rowGuid,
      slug: page.slug,
      compiledHtml: html,
      publishedAt: now,
      liveUrl,
      wpSyncStatus,
      wpSyncError,
    });

    // 5. Insert immutable snapshot into publications table
    if (page.pageGuid || page.rowGuid) {
      await DataService.recordPublication({
        publication_guid: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined,
        workspace_guid: workspaceId,
        page_guid: page.pageGuid || page.rowGuid,
        wp_post_id: resolvedWpPostId && !isNaN(Number(resolvedWpPostId)) ? Number(resolvedWpPostId) : null,
        published_at: now,
        status: "published",
        snapshot_json: {
          title: page.title,
          slug: page.slug,
          sections: page.sections || [],
        },
      });
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
  },

  /**
   * Fetch Site Header configuration for workspace
   */
  async getHeader(workspaceId) {
    return await DataService.getHeader(workspaceId);
  },

  /**
   * Save Site Header draft configuration to PostgreSQL public.menus
   */
  async saveHeader(workspaceId, headerData) {
    return await DataService.saveHeader(workspaceId, headerData);
  },

  /**
   * Publish Site Header to WordPress and save to PostgreSQL
   *
   * 1. Compiles header configuration into HTML and scoped CSS via Handlebars.
   * 2. Persists updated header to PostgreSQL public.menus table.
   * 3. Calls WordPress REST endpoint /wp-json/plugin-control/v1/save-header-html.
   * 4. Informs WordPress to invalidate caches so custom pages reflect the new header immediately.
   */
  async publishHeader(workspaceId, headerData = {}) {
    const workspace = await this.getWorkspace(workspaceId);
    const { compiledHeader } = compileHeader(headerData);

    // 1. Save to PostgreSQL menus table
    const saveResult = await this.saveHeader(workspaceId, headerData);

    // 2. Publish to WordPress if site URL is configured
    let wpResponse = null;
    let wpSyncStatus = "synced";
    let wpSyncError = null;

    if (workspace?.wpSiteUrl) {
      const siteBase = workspace.wpSiteUrl.replace(/\/$/, "");
      const endpoint = `${siteBase}/wp-json/plugin-control/v1/save-header-html`;
      const headers = { "Content-Type": "application/json" };
      if (workspace?.apiKey) {
        headers["x-api-key"] = workspace.apiKey;
      }
      if (workspace?.wpUser && workspace?.wpAppPassword) {
        headers["Authorization"] =
          "Basic " +
          Buffer.from(`${workspace.wpUser}:${workspace.wpAppPassword}`).toString("base64");
      }

      try {
        const payload = {
          header_html: compiledHeader,
          header_json: headerData,
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          wpSyncStatus = "failed";
          wpSyncError = `WordPress HTTP ${res.status}: ${errText.slice(0, 300)}`;
        } else {
          wpResponse = await res.json();
          wpSyncStatus = "synced";
        }
      } catch (err) {
        wpSyncStatus = "failed";
        wpSyncError = err.message;
      }
    }

    return {
      success: true,
      rowGuid: saveResult.rowGuid,
      compiledHeader,
      wpSyncStatus,
      wpSyncError,
      wpResponse,
    };
  },

  /**
   * Fetch Site Footer configuration for workspace
   */
  async getFooter(workspaceId) {
    return await DataService.getFooter(workspaceId);
  },

  /**
   * Save Site Footer draft configuration to PostgreSQL public.menus
   */
  async saveFooter(workspaceId, footerData) {
    return await DataService.saveFooter(workspaceId, footerData);
  },

  /**
   * Publish Site Footer to WordPress and save to PostgreSQL
   *
   * 1. Compiles footer configuration into HTML and scoped CSS via Handlebars.
   * 2. Persists updated footer to PostgreSQL public.menus table.
   * 3. Calls WordPress REST endpoint /wp-json/plugin-control/v1/save-footer-html.
   * 4. Informs WordPress to invalidate caches so custom pages reflect the new footer immediately.
   */
  async publishFooter(workspaceId, footerData = {}) {
    const workspace = await this.getWorkspace(workspaceId);
    const { compiledFooter } = compileFooter(footerData);

    // 1. Save to PostgreSQL menus table
    const saveResult = await this.saveFooter(workspaceId, footerData);

    // 2. Publish to WordPress if site URL is configured
    let wpResponse = null;
    let wpSyncStatus = "synced";
    let wpSyncError = null;

    if (workspace?.wpSiteUrl) {
      const siteBase = workspace.wpSiteUrl.replace(/\/$/, "");
      const endpoint = `${siteBase}/wp-json/plugin-control/v1/save-footer-html`;
      const headers = { "Content-Type": "application/json" };
      if (workspace?.apiKey) {
        headers["x-api-key"] = workspace.apiKey;
      }
      if (workspace?.wpUser && workspace?.wpAppPassword) {
        headers["Authorization"] =
          "Basic " +
          Buffer.from(`${workspace.wpUser}:${workspace.wpAppPassword}`).toString("base64");
      }

      try {
        const payload = {
          footer_html: compiledFooter,
          footer_json: footerData,
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          wpSyncStatus = "failed";
          wpSyncError = `WordPress HTTP ${res.status}: ${errText.slice(0, 300)}`;
        } else {
          wpResponse = await res.json();
          wpSyncStatus = "synced";
        }
      } catch (err) {
        wpSyncStatus = "failed";
        wpSyncError = err.message;
      }
    }

    return {
      success: true,
      rowGuid: saveResult.rowGuid,
      compiledFooter,
      wpSyncStatus,
      wpSyncError,
      wpResponse,
    };
  },

  /**
   * Save workspace global custom CSS
   */
  async saveWorkspaceCustomCss(workspaceId, customCss, rowGuid) {
    return await DataService.saveWorkspaceCustomCss(workspaceId, customCss, rowGuid);
  },
};

export default ApiSource;

