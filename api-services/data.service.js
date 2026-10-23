import {
  azureAxiosInstance,
  bizFireAxiosInstance,
  multipartInstance,
} from "./api.js";
import { API_URL } from "../constant.js";

class DataService {
  // =========================================================================
  // Core Azure .NET Generic SQL Gateway Methods (Matching Platform Standard)
  // =========================================================================

  /**
   * Secure select query via Azure .NET API gateway
   * @param {Object} payload e.g. { data_json: { table_name: "bizfire_themes", request: { ... } } }
   */
  async secureSelect(payload = {}) {
    return azureAxiosInstance.post("secure-select", {
      request_json: payload,
    });
  }

  /**
   * Secure insert query via Azure .NET API gateway
   * @param {Object|Array} payload record(s) to insert
   * @param {string} tableName target table
   */
  async secureInsert(payload = {}, tableName) {
    return azureAxiosInstance.post("secure-insert", {
      request_json: {
        data_json: {
          request: payload,
          table_name: tableName,
        },
      },
    });
  }

  /**
   * Secure update query via Azure .NET API gateway
   * @param {Object|Array} payload record(s) to update
   * @param {string} tableName target table
   */
  async secureUpdate(payload, tableName) {
    return azureAxiosInstance.post("secure-update", {
      request_json: {
        data_json: {
          request: payload,
          table_name: tableName,
        },
      },
    });
  }

  /**
   * Secure merge / upsert keyed on row_guid
   * @param {Object|Array} payload record(s) with row_guid
   * @param {string} tableName target table
   */
  async merge(payload, tableName) {
    const requestArray = Array.isArray(payload) ? payload : [payload];
    return azureAxiosInstance.post("secure-merge", {
      request_json: {
        data_json: {
          request: requestArray,
          table_name: tableName,
        },
      },
    });
  }

  /**
   * Universal SELECT query helper targeting Azure .NET API gateway
   * @param {string} tableName
   * @param {string} columnsCsv
   * @param {Array} filters
   * @param {Array} orderBy
   * @param {string|number} pageNumber
   * @param {string|number} pageSize
   */
  async selectRows(
    tableName,
    columnsCsv,
    filters = [],
    orderBy = [{ UIKey: "row_guid", Direction: "ASC" }],
    pageNumber = "1",
    pageSize = "100",
  ) {
    try {
      const response = await this.secureSelect({
        table_name: tableName,
        columns_csv: columnsCsv,
        filter_json_array: filters,
        order_by_json: orderBy,
        page_number: String(pageNumber),
        page_size: String(pageSize),
      });

      const resp = response.data?.response;
      if (Array.isArray(resp)) return resp;
      if (Array.isArray(resp?.results)) return resp.results;
      if (Array.isArray(response.data?.data)) return response.data.data;
      if (Array.isArray(response.data)) return response.data;
      return [];
    } catch (err) {
      console.error(`Error selecting rows from ${tableName}:`, err.message);
      return [];
    }
  }

  /**
   * Secure merge / upsert with custom composite keys
   * @param {Object|Array} payload record(s)
   * @param {string} tableName target table
   * @param {Array<string>} keys composite key column names
   */
  async mergeWithCompositeKeys(payload, tableName, keys) {
    return azureAxiosInstance.post("secure-merge-with-composite-keys", {
      request_json: {
        data_json: {
          request: payload,
          table_name: tableName,
          composite_keys: keys,
        },
      },
    });
  }

  /**
   * Invoke a custom stored procedure or PostgreSQL function
   * @param {Object} payload SP name and parameters
   */
  async secureInvokeCustomSP(payload = {}) {
    return azureAxiosInstance.post("invoke-custom-sp", {
      ...payload,
    });
  }

  /**
   * Upload files with metadata to storage
   */
  async uploadFilesWithText(payload = {}) {
    return multipartInstance.post("storage/upload-files-with-text", payload);
  }

  /**
   * External platform connector call
   */
  async callExternalApi(payload = {}) {
    return azureAxiosInstance.post("external-api/external-api-call", {
      request: payload,
    });
  }

  // =========================================================================
  // Bizfire Central User / Workspace Services
  // =========================================================================

  async bizfireSecureSelect(payload) {
    return bizFireAxiosInstance.post("secure-select", {
      request_json: payload,
    });
  }

  async bizfiresSecureInsert(payload, tableName) {
    return bizFireAxiosInstance.post("secure-insert", {
      request_json: {
        data_json: {
          request: payload,
          table_name: tableName,
        },
      },
    });
  }

  // =========================================================================
  // High-Level Content Editor Service Methods
  // =========================================================================

  /**
   * Fetch Workspace metadata.
   *
   * Mirrors the SEO app's workspaceConfig.js pattern exactly:
   *   1. Query user_product_configured by user_workspace_guid + PRODUCT_GUID + status=configured
   *   2. Fallback: seo_projects.row_guid (legacy projects)
   *
   * @param {string} workspaceId  user_workspaces.row_guid (= user_workspace_guid in product table)
   */
  async getWorkspace(workspaceId) {
    const PRODUCT_GUID = process.env.NEXT_PUBLIC_PRODUCT_GUID || "";

    // ── Primary: user_product_configured (single authoritative row) ───────
    try {
      const filters = [
        { Operand: "eq", UIKey: "user_workspace_guid", Value: workspaceId },
        { Operand: "eq", UIKey: "status",              Value: "configured"  },
      ];
      if (PRODUCT_GUID) {
        filters.push({ Operand: "eq", UIKey: "product_guid", Value: PRODUCT_GUID });
      }

      const rows = await this.selectRows(
        "user_product_configured",
        "row_guid,url,data_json,status,user_workspace_guid,product_guid",
        filters,
        [{ UIKey: "id", Direction: "DESC" }],
        "1",
        "1",
      );

      const row = rows[0];
      if (row) {
        const dj = (typeof row.data_json === "string"
          ? JSON.parse(row.data_json)
          : row.data_json) || {};

        const siteUrl = (row.url || dj.site_url || dj.domain || dj.url || "").trim();
        const apiKey  = (row.wpi_api_key || dj.wpi_api_key || dj.apiKey || dj.api_key || dj.key || "").trim();
        const name    = (row.project_name || dj.project_name || dj.projectName || dj.name || "WordPress Site").trim();
          console.log(row, "row")
        return {
          workspaceId,
          clientName:    name,
          themeId:       dj.themeId || "trades-modern",
          wpSiteUrl:     siteUrl || process.env.NEXT_PUBLIC_WORDPRESS_URL || "",
          wpUser:        dj.wpUser        || "",
          wpAppPassword: dj.wpAppPassword || "",
          apiKey,
        };
      }
    } catch (err) {
      console.warn("getWorkspace: user_product_configured lookup failed:", err.message);
    }

    // ── Fallback: seo_projects by row_guid (legacy path) ─────────────────
    try {
      const rows = await this.selectRows(
        "seo_projects",
        "row_guid,project_name,domain,api_key",
        [{ Operand: "eq", UIKey: "row_guid", Value: workspaceId }],
        [{ UIKey: "row_guid", Direction: "ASC" }],
        "1",
        "1",
      );
      const proj = rows[0];
      if (proj) {
        return {
          workspaceId,
          clientName:    (proj.project_name || "WordPress Site").trim(),
          themeId:       "trades-modern",
          wpSiteUrl:     (proj.domain || "").trim(),
          wpUser:        "",
          wpAppPassword: "",
          apiKey:        (proj.api_key || "").trim(),
        };
      }
    } catch (err) {
      console.warn("getWorkspace: seo_projects fallback failed:", err.message);
    }

    // ── Last resort: empty shell ──────────────────────────────────────────
    return {
      workspaceId,
      clientName:    "WordPress Site",
      themeId:       "trades-modern",
      wpSiteUrl:     process.env.NEXT_PUBLIC_WORDPRESS_URL || "",
      wpUser:        "",
      wpAppPassword: "",
      apiKey:        "",
    };
  }

  /**
   * Update active theme assigned to a workspace in user_product_configured
   * @param {string} workspaceId
   * @param {string} themeSlug
   */
  async updateWorkspaceTheme(workspaceId, themeSlug) {
    try {
      const filters = [
        { Operand: "eq", UIKey: "user_workspace_guid", Value: workspaceId },
        { Operand: "eq", UIKey: "status",              Value: "configured" },
      ];
      const rows = await this.selectRows(
        "user_product_configured",
        "row_guid,user_workspace_guid,data_json",
        filters,
        [{ UIKey: "id", Direction: "DESC" }],
        "1",
        "1"
      );

      if (rows && rows[0]) {
        const row = rows[0];
        const dj = (typeof row.data_json === "string" ? JSON.parse(row.data_json) : row.data_json) || {};
        dj.themeId = themeSlug;
        await this.merge([{
          row_guid: row.row_guid,
          data_json: dj
        }], "user_product_configured");
        return dj;
      }
    } catch (err) {
      console.warn("updateWorkspaceTheme failed:", err.message);
      throw err;
    }
    return null;
  }

  /**
   * Fetch cloned theme bundle (theme, styleCss, components, pageTemplates) for workspace
   * @param {string} workspaceId Workspace GUID
   */
  async getThemeBundle(workspaceId) {
    try {
      let themeRow = null;

      // 1. Check if workspace has an explicitly assigned themeId
      try {
        const ws = await this.getWorkspace(workspaceId);
        if (ws?.themeId) {
          const themeRows = await this.selectRows(
            "themes",
            "row_guid,theme_slug,name,theme_guid,version,font_family,font_url,css,theme_json,default_page_template",
            [
              { Operand: "eq", UIKey: "theme_slug", Value: ws.themeId },
              { Operand: "eq", UIKey: "is_deleted", Value: "false" },
            ],
          );
          if (themeRows && themeRows[0]) {
            themeRow = themeRows[0];
          }
        }
      } catch (wsErr) {
        console.warn("Could not check workspace assigned themeId:", wsErr.message);
      }

      // 2. Fallback: check workspace_guid
      if (!themeRow) {
        const themeRows = await this.selectRows(
          "themes",
          "row_guid,theme_slug,name,theme_guid,version,font_family,font_url,css,theme_json,default_page_template",
          [
            { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
            { Operand: "eq", UIKey: "is_deleted", Value: "false" },
          ],
        );
        if (themeRows && themeRows[0]) {
          themeRow = themeRows[0];
        }
      }

      // 3. Fallback: active master theme
      if (!themeRow) {
        const themeRows = await this.selectRows(
          "themes",
          "row_guid,theme_slug,name,theme_guid,version,font_family,font_url,css,theme_json,default_page_template",
          [
            { Operand: "eq", UIKey: "is_master", Value: "true" },
            { Operand: "eq", UIKey: "is_deleted", Value: "false" },
          ],
        );
        themeRow = themeRows[0];
      }

      // 4. Fallback: first available non-deleted theme
      if (!themeRow) {
        const themeRows = await this.selectRows(
          "themes",
          "row_guid,theme_slug,name,theme_guid,version,font_family,font_url,css,theme_json,default_page_template",
          [
            { Operand: "eq", UIKey: "is_deleted", Value: "false" },
          ],
          [{ UIKey: "id", Direction: "ASC" }],
          "1",
          "1"
        );
        themeRow = themeRows[0];
      }

      if (!themeRow) {
        throw new Error(
          `No theme found for workspace ${workspaceId} or master themes.`,
        );
      }

      // 2. Fetch components for this theme
      const compRows = await this.selectRows(
        "theme_components",
        "row_guid,component_key,name,category,schema_json,template_html,defaults_json,display_order,css",
        [{ Operand: "eq", UIKey: "is_deleted", Value: "false" }],
        [{ UIKey: "display_order", Direction: "ASC" }],
      );

      // 3. Fetch page variants (templates) for this theme
      const variantRows = await this.selectRows(
        "theme_page_variants",
        "row_guid,variant_key,name,description,layout_json,display_order",
        [{ Operand: "eq", UIKey: "is_deleted", Value: "false" }],
        [{ UIKey: "display_order", Direction: "ASC" }],
      );

      // 4. Fetch workspace custom CSS overrides (Layer 3) from bizfire_workspace_styles
      let customCss = "";
      let customCssRowGuid = null;
      try {
        const styleRows = await this.selectRows(
          "bizfire_workspace_styles",
          "row_guid,custom_css",
          [
            { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
            { Operand: "eq", UIKey: "is_deleted", Value: "false" },
          ],
        );
        if (styleRows && styleRows[0]) {
          customCss = styleRows[0].custom_css || "";
          customCssRowGuid = styleRows[0].row_guid;
        }
      } catch (styleErr) {
        console.warn("Could not fetch bizfire_workspace_styles:", styleErr.message);
      }

      return {
        theme: {
          id: themeRow.theme_slug,
          name: themeRow.name,
          version: themeRow.version,
          fontFamily: themeRow.font_family,
          fontUrl: themeRow.font_url,
          defaultPageTemplate:
            themeRow.default_page_template || "service-standard",
          themeSettings: themeRow.theme_json || {},
        },
        styleCss: themeRow.css || "",
        customCss,
        customCssRowGuid,
        components: (compRows || []).map((c) => ({
          id: c.component_key,
          name: c.name,
          category: c.category,
          schema: c.schema_json?.fields || c.schema_json || {},
          rawSchema: c.schema_json || {},
          template: c.template_html || "",
          defaults: c.defaults_json || {},
          css: c.css || c.style_css || "",
        })),
        pageTemplates: (variantRows || []).map((v) => ({
          id: v.variant_key,
          name: v.name,
          description: v.description,
          components: v.layout_json || [],
        })),
      };
    } catch (err) {
      console.error("Error fetching theme bundle:", err);
      throw err;
    }
  }

  /**
   * Fetch page summaries list for workspace
   * @param {string} workspaceId
   */
  async getPageList(workspaceId) {
    try {
      const rows = await this.selectRows(
        "bizfire_page_contents",
        "row_guid,post_id,slug,title,status,template_slug,last_saved_at,last_published_at,live_url",
        [
          { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
          { Operand: "eq", UIKey: "is_deleted", Value: "false" },
        ],
        [{ UIKey: "post_id", Direction: "ASC" }],
      );

      return (rows || []).map((p) => ({
        postId: p.post_id && Number(p.post_id) > 0 ? Number(p.post_id) : null,
        rowGuid: p.row_guid,
        slug: p.slug,
        title: p.title,
        templateId: p.template_slug || "service-standard",
        lastSavedAt: p.last_saved_at,
        lastPublishedAt: p.last_published_at,
        liveUrl: p.live_url || null,
        status: p.status || "draft",
      }));
    } catch (err) {
      console.error("Error fetching page list:", err);
      throw err;
    }
  }

  /**
   * Fetch full page content and sections
   * @param {string} workspaceId
   * @param {number|string} postId
   */
  async getPageContent(workspaceId, postId) {
    try {
      const isNumeric = !isNaN(Number(postId));
      const filters = [
        { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
        { Operand: "eq", UIKey: "is_deleted", Value: "false" },
      ];

      if (isNumeric) {
        filters.push({
          Operand: "eq",
          UIKey: "post_id",
          Value: String(postId),
        });
      } else {
        filters.push({ Operand: "eq", UIKey: "slug", Value: String(postId) });
      }

      let rows = await this.selectRows(
        "bizfire_page_contents",
        "row_guid,post_id,slug,title,status,template_slug,sections_json,compiled_html,last_saved_at,last_published_at,live_url,wp_sync_status",
        filters,
        [{ UIKey: "row_guid", Direction: "ASC" }],
      );
      let page = rows[0];

      // Fallback: search by row_guid
      if (!page && !isNumeric) {
        rows = await this.selectRows(
          "bizfire_page_contents",
          "row_guid,post_id,slug,title,status,template_slug,sections_json,compiled_html,last_saved_at,last_published_at,live_url,wp_sync_status",
          [
            { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
            { Operand: "eq", UIKey: "row_guid", Value: String(postId) },
            { Operand: "eq", UIKey: "is_deleted", Value: "false" },
          ],
          [{ UIKey: "row_guid", Direction: "ASC" }],
        );
        page = rows[0];
      }

      if (!page) return null;

      return {
        postId:
          page.post_id && Number(page.post_id) > 0
            ? Number(page.post_id)
            : page.row_guid,
        pageGuid: page.row_guid,
        rowGuid: page.row_guid,
        slug: page.slug,
        title: page.title,
        templateId: page.template_slug || "service-standard",
        lastSavedAt: page.last_saved_at,
        lastPublishedAt: page.last_published_at,
        status: page.status,
        sections: page.sections_json || [],
        compiledHtml: page.compiled_html || "",
        liveUrl: page.live_url || "",
        wpSyncStatus: page.wp_sync_status || "synced",
      };
    } catch (err) {
      console.error("Error fetching page content:", err);
      throw err;
    }
  }

  /**
   * Save page content (stripping runtime instanceIds)
   * @param {string} workspaceId
   * @param {number|string} postId
   * @param {Object} pageData
   */
  async savePageContent(workspaceId, postId, pageData) {
    try {
      // Strip runtime instanceId keys before saving
      const cleanSections = (pageData.sections || []).map((section) => {
        const { instanceId, ...rest } = section;
        return rest;
      });

      const isNumeric = !isNaN(Number(postId)) && Number(postId) > 0;
      let resolvedPostId = isNumeric ? Number(postId) : null;
      const now = new Date().toISOString();
      const payload = {
        workspace_guid: workspaceId,
        theme_guid:
          pageData.themeGuid || "a1000000-0000-0000-0000-000000000001",
        slug: pageData.slug,
        title: pageData.title,
        template_slug: pageData.templateId || "service-standard",
        sections_json: cleanSections,
        status: pageData.status || "draft",
        last_saved_at: now,
        updated_on: now,
        is_deleted: false,
      };

      // Mandatory row_guid resolution for secure-merge:
      // Always look up existing record in PostgreSQL first to prevent duplicate key collisions
      // on the unique constraint bizfire_page_contents_ws_post_unq (workspace_guid, post_id).
      let targetRowGuid = null;

      if (isNumeric) {
        try {
          const rowsByPostId = await this.selectRows(
            "bizfire_page_contents",
            "row_guid,post_id,is_deleted",
            [
              { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
              { Operand: "eq", UIKey: "post_id", Value: String(postId) },
            ],
            [{ UIKey: "row_guid", Direction: "ASC" }]
          );
          if (rowsByPostId?.[0]?.row_guid) {
            targetRowGuid = rowsByPostId[0].row_guid;
            resolvedPostId = Number(rowsByPostId[0].post_id);
          }
        } catch (lookupErr) {
          console.warn("Could not check existing row by post_id:", lookupErr.message);
        }
      }

      if (!targetRowGuid && (pageData.rowGuid || pageData.pageGuid || pageData.row_guid)) {
        const proposedGuid = pageData.rowGuid || pageData.pageGuid || pageData.row_guid;
        try {
          const rowsByGuid = await this.selectRows(
            "bizfire_page_contents",
            "row_guid,post_id,is_deleted",
            [
              { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
              { Operand: "eq", UIKey: "row_guid", Value: String(proposedGuid) },
            ],
            [{ UIKey: "row_guid", Direction: "ASC" }]
          );
          if (rowsByGuid?.[0]?.row_guid) {
            targetRowGuid = rowsByGuid[0].row_guid;
            if (!resolvedPostId && rowsByGuid[0].post_id) {
              resolvedPostId = Number(rowsByGuid[0].post_id);
            }
          } else {
            targetRowGuid = proposedGuid;
          }
        } catch (_) {
          targetRowGuid = proposedGuid;
        }
      }

      if (!targetRowGuid && pageData.slug) {
        try {
          const rowsBySlug = await this.selectRows(
            "bizfire_page_contents",
            "row_guid,post_id,is_deleted",
            [
              { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
              { Operand: "eq", UIKey: "slug", Value: String(pageData.slug) },
            ],
            [{ UIKey: "row_guid", Direction: "ASC" }]
          );
          if (rowsBySlug?.[0]?.row_guid) {
            targetRowGuid = rowsBySlug[0].row_guid;
            if (!resolvedPostId && rowsBySlug[0].post_id) {
              resolvedPostId = Number(rowsBySlug[0].post_id);
            }
          }
        } catch (_) {}
      }

      if (!targetRowGuid) {
        targetRowGuid =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "e1000000-0000-0000-0000-" + String(postId).padStart(12, "0");
      }
      payload.row_guid = targetRowGuid;

      // Ensure post_id satisfies PostgreSQL's NOT NULL constraint on public.bizfire_page_contents:
      // If this is a draft page with no real WordPress post ID yet, assign a deterministic negative draft ID.
      if (!resolvedPostId) {
        const hexPart = targetRowGuid.replace(/-/g, "").slice(0, 8);
        const draftInt = parseInt(hexPart, 16) || 1;
        resolvedPostId = -1 * Math.abs(draftInt);
      }
      payload.post_id = resolvedPostId;

      const response = await this.merge([payload], "bizfire_page_contents");
      if (response.data?.status === "error" || response.data?.errorMessage) {
        throw new Error(
          response.data.errorMessage ||
            "Failed to merge page content into PostgreSQL",
        );
      }

      return {
        success: true,
        savedAt: now,
        postId: payload.post_id > 0 ? payload.post_id : targetRowGuid,
        rowGuid: payload.row_guid,
        slug: payload.slug,
        title: payload.title,
        sections: cleanSections,
      };
    } catch (err) {
      console.error("Error saving page content:", err);
      throw err;
    }
  }

  /**
   * Update page publish status, compiled HTML, and live URL in PostgreSQL
   * @param {string} workspaceId
   * @param {Object} publishData
   */
  async updatePagePublishStatus(workspaceId, publishData) {
    try {
      const now = new Date().toISOString();
      const payload = {
        workspace_guid: workspaceId,
        theme_guid:
          publishData.themeGuid || "a1000000-0000-0000-0000-000000000001",
        slug: publishData.slug,
        compiled_html: publishData.compiledHtml,
        status: "published",
        last_published_at: publishData.publishedAt || now,
        live_url: publishData.liveUrl || "",
        wp_sync_status: publishData.wpSyncStatus || "synced",
        wp_sync_error: publishData.wpSyncError || null,
        updated_on: now,
        is_deleted: false,
      };

      if (publishData.postId && !isNaN(Number(publishData.postId))) {
        payload.post_id = Number(publishData.postId);
      }

      // Mandatory row_guid resolution for secure-merge
      let targetRowGuid =
        publishData.rowGuid || publishData.pageGuid || publishData.row_guid;
      if (!targetRowGuid && (publishData.postId || publishData.slug)) {
        const existing = await this.getPageContent(
          workspaceId,
          publishData.postId || publishData.slug,
        );
        if (existing?.rowGuid) {
          targetRowGuid = existing.rowGuid;
        }
      }
      if (targetRowGuid) {
        payload.row_guid = targetRowGuid;
      }

      const response = await this.merge([payload], "bizfire_page_contents");
      if (response.data?.status === "error" || response.data?.errorMessage) {
        throw new Error(
          response.data.errorMessage ||
            "Failed to update page publish status in PostgreSQL",
        );
      }

      return {
        success: true,
        publishedAt: payload.last_published_at,
        postId: payload.post_id,
        rowGuid: payload.row_guid,
        slug: payload.slug,
        liveUrl: payload.live_url,
      };
    } catch (err) {
      console.error("Error updating page publish status:", err);
      throw err;
    }
  }

  /**
   * Record snapshot entry in publications table
   * @param {Object} publicationRecord
   */
  async recordPublication(publicationRecord) {
    try {
      const response = await this.secureInsert(
        publicationRecord,
        "publications",
      );
      return {
        success: response.data?.status === "success" || response.status === 200,
        publicationGuid: publicationRecord.publication_guid,
        error: response.data?.errorMessage || null,
      };
    } catch (err) {
      console.error("Error recording publication snapshot:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Atomically clone master theme to workspace
   * @param {string} masterThemeSlug e.g. 'trades-modern'
   * @param {string} workspaceId
   * @param {string} userEmail
   */
  async cloneTheme(masterThemeSlug, workspaceId, userEmail = "system") {
    try {
      const response = await this.secureInvokeCustomSP({
        sp_name: "sp_bizfire_clone_theme_to_workspace",
        parameters: {
          p_master_theme_slug: masterThemeSlug,
          p_workspace_guid: workspaceId,
          p_user: userEmail,
        },
      });
      return response.data || { success: true };
    } catch (err) {
      console.error("Error cloning theme to workspace:", err);
      throw err;
    }
  }

  /**
   * Fetch Site Header configuration for workspace from public.menus
   * @param {string} workspaceId
   */
  async getHeader(workspaceId) {
    try {
      // 1. Query menus table for menu_key = 'header'
      let rows = await this.selectRows(
        "menus",
        "menu_guid,row_guid,workspace_guid,menu_key,name,content_json,is_active",
        [
          { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
          { Operand: "eq", UIKey: "menu_key", Value: "header" },
          { Operand: "eq", UIKey: "is_deleted", Value: "false" },
        ],
        [{ UIKey: "row_guid", Direction: "ASC" }],
        "1",
        "1"
      );

      // Fallback: check menu_key = 'primary'
      if (!rows || rows.length === 0) {
        rows = await this.selectRows(
          "menus",
          "menu_guid,row_guid,workspace_guid,menu_key,name,content_json,is_active",
          [
            { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
            { Operand: "eq", UIKey: "menu_key", Value: "primary" },
            { Operand: "eq", UIKey: "is_deleted", Value: "false" },
          ],
          [{ UIKey: "row_guid", Direction: "ASC" }],
          "1",
          "1"
        );
      }

      if (rows && rows.length > 0 && rows[0].content_json) {
        const rawJson =
          typeof rows[0].content_json === "string"
            ? JSON.parse(rows[0].content_json)
            : rows[0].content_json;

        return {
          rowGuid: rows[0].row_guid,
          menuGuid: rows[0].menu_guid,
          workspaceId,
          ...rawJson,
        };
      }

      // If no menu row exists yet, generate default configuration
      const workspace = await this.getWorkspace(workspaceId);
      const pages = await this.getPageList(workspaceId);

      const defaultItems = [
        { id: "item-home", label: "Home", url: "/", target: "_self" },
      ];

      // Automatically add published or existing pages to default menu
      (pages || []).slice(0, 5).forEach((p, idx) => {
        if (p.slug && p.slug !== "home") {
          const cleanSlug = p.slug.replace(/^\//, "").replace(/\/$/, "");
          defaultItems.push({
            id: `item-${idx + 1}`,
            label: p.title || cleanSlug.replace(/-/g, " "),
            url: `/${cleanSlug}/`,
            target: "_self",
            pageKey: cleanSlug,
          });
        }
      });

      return {
        rowGuid: null,
        workspaceId,
        branding: {
          siteTitle: workspace?.clientName || "WordPress Site",
          logoUrl: "",
          logoWidth: 180,
          tagline: "Quality Service You Can Trust",
        },
        contact: {
          phone: "(609) 555-0100",
          phoneLabel: "Call Us 24/7",
          showPhone: true,
        },
        cta: {
          text: "Schedule Service",
          url: "/contact/",
          showCta: true,
        },
        settings: {
          isSticky: true,
          showTopBar: true,
          topBarText: "Proudly Serving Local Homeowners & Businesses",
        },
        items: defaultItems,
      };
    } catch (err) {
      console.error("Error fetching header from menus:", err);
      return null;
    }
  }

  /**
   * Save Site Header configuration into public.menus
   * @param {string} workspaceId
   * @param {object} headerData
   */
  async saveHeader(workspaceId, headerData = {}) {
    try {
      const now = new Date().toISOString();
      let targetRowGuid = headerData.rowGuid;

      if (!targetRowGuid) {
        // Check if a header row already exists
        const existing = await this.selectRows(
          "menus",
          "menu_guid,row_guid,workspace_guid,menu_key",
          [
            { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
            { Operand: "eq", UIKey: "menu_key", Value: "header" },
          ],
          [{ UIKey: "row_guid", Direction: "ASC" }],
          "1",
          "1"
        );
        if (existing?.[0]?.row_guid) {
          targetRowGuid = existing[0].row_guid;
        } else {
          targetRowGuid =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : "b1000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0");
        }
      }

      const cleanJson = {
        branding: headerData.branding || {},
        contact: headerData.contact || {},
        cta: headerData.cta || {},
        settings: headerData.settings || {},
        items: Array.isArray(headerData.items) ? headerData.items : [],
      };

      const payload = {
        menu_guid: headerData.menuGuid || targetRowGuid,
        row_guid: targetRowGuid,
        workspace_guid: workspaceId,
        menu_key: "header",
        name: "Site Header & Navigation",
        content_json: cleanJson,
        is_active: true,
        updated_on: now,
        is_deleted: false,
      };

      const response = await this.merge([payload], "menus");
      if (response.data?.status === "error" || response.data?.errorMessage) {
        throw new Error(
          response.data.errorMessage || "Failed to merge header into menus table"
        );
      }

      return {
        success: true,
        rowGuid: targetRowGuid,
        savedAt: now,
        headerData: cleanJson,
      };
    } catch (err) {
      console.error("Error saving header in menus:", err);
      throw err;
    }
  }

  /**
   * Fetch Site Footer configuration for workspace from public.menus
   * @param {string} workspaceId
   */
  async getFooter(workspaceId) {
    try {
      // 1. Query menus table for menu_key = 'footer'
      let rows = await this.selectRows(
        "menus",
        "menu_guid,row_guid,workspace_guid,menu_key,name,content_json,is_active",
        [
          { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
          { Operand: "eq", UIKey: "menu_key", Value: "footer" },
          { Operand: "eq", UIKey: "is_deleted", Value: "false" },
        ],
        [{ UIKey: "row_guid", Direction: "ASC" }],
        "1",
        "1"
      );

      if (rows && rows.length > 0 && rows[0].content_json) {
        const rawJson =
          typeof rows[0].content_json === "string"
            ? JSON.parse(rows[0].content_json)
            : rows[0].content_json;

        return {
          rowGuid: rows[0].row_guid,
          menuGuid: rows[0].menu_guid,
          workspaceId,
          ...rawJson,
        };
      }

      // If no footer row exists yet, generate sensible default configuration
      const workspace = await this.getWorkspace(workspaceId);
      const pages = await this.getPageList(workspaceId);

      const quickLinks = [
        { id: "fl-home", label: "Home", url: "/", target: "_self" },
      ];
      const serviceLinks = [];

      (pages || []).forEach((p, idx) => {
        if (p.slug && p.slug !== "home") {
          const cleanSlug = p.slug.replace(/^\//, "").replace(/\/$/, "");
          const linkObj = {
            id: `fl-${idx + 1}`,
            label: p.title || cleanSlug.replace(/-/g, " "),
            url: `/${cleanSlug}/`,
            target: "_self",
            pageKey: cleanSlug,
          };
          if (cleanSlug.includes("service") || cleanSlug.includes("repair") || cleanSlug.includes("install")) {
            serviceLinks.push(linkObj);
          } else if (quickLinks.length < 5) {
            quickLinks.push(linkObj);
          }
        }
      });

      const defaultColumns = [
        {
          id: "col-quick-links",
          title: "Quick Links",
          links: quickLinks,
        },
        {
          id: "col-services",
          title: "Services",
          links: serviceLinks.length > 0 ? serviceLinks : [
            { id: "fl-s1", label: "AC Repair & Tune-Up", url: "/services/", target: "_self" },
            { id: "fl-s2", label: "Heating & Furnace Repair", url: "/services/", target: "_self" },
            { id: "fl-s3", label: "Emergency Dispatch", url: "/contact/", target: "_self" },
          ],
        },
      ];

      const currentYear = new Date().getFullYear();
      const siteTitle = workspace?.clientName || "WordPress Site";

      return {
        rowGuid: null,
        workspaceId,
        branding: {
          siteTitle,
          logoUrl: "",
          logoWidth: 160,
          tagline: "Quality Service You Can Trust",
          aboutText: "Providing reliable heating, cooling, and home comfort solutions. Dedicated to excellence, customer satisfaction, and fast 24/7 emergency dispatch.",
        },
        columns: defaultColumns,
        contact: {
          phone: "(609) 555-0100",
          phoneLabel: "Phone",
          email: "support@example.com",
          emailLabel: "Email",
          address: "100 Main Street, Princeton, NJ 08540",
          addressLabel: "Address",
          workingHours: "Mon - Fri: 8:00 AM - 6:00 PM | 24/7 Emergency Dispatch",
          showPhone: true,
          showEmail: true,
          showAddress: true,
        },
        social: {
          facebook: "https://facebook.com",
          twitter: "https://twitter.com",
          linkedin: "https://linkedin.com",
          instagram: "",
          youtube: "",
        },
        bottomBar: {
          copyrightText: `© ${currentYear} ${siteTitle}. All rights reserved.`,
          links: [
            { id: "bb-1", label: "Privacy Policy", url: "/privacy-policy/", target: "_self" },
            { id: "bb-2", label: "Terms of Service", url: "/terms-of-service/", target: "_self" },
          ],
        },
        settings: {
          theme: "dark",
          backgroundColor: "#0f172a",
          textColor: "#94a3b8",
          accentColor: "#38bdf8",
        },
      };
    } catch (err) {
      console.error("Error fetching footer from menus:", err);
      return null;
    }
  }

  /**
   * Save Site Footer configuration into public.menus
   * @param {string} workspaceId
   * @param {object} footerData
   */
  async saveFooter(workspaceId, footerData = {}) {
    try {
      const now = new Date().toISOString();
      let targetRowGuid = footerData.rowGuid;

      if (!targetRowGuid) {
        // Check if a footer row already exists
        const existing = await this.selectRows(
          "menus",
          "menu_guid,row_guid,workspace_guid,menu_key",
          [
            { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
            { Operand: "eq", UIKey: "menu_key", Value: "footer" },
          ],
          [{ UIKey: "row_guid", Direction: "ASC" }],
          "1",
          "1"
        );
        if (existing?.[0]?.row_guid) {
          targetRowGuid = existing[0].row_guid;
        } else {
          targetRowGuid =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : "b2000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0");
        }
      }

      const cleanJson = {
        branding: footerData.branding || {},
        columns: Array.isArray(footerData.columns) ? footerData.columns : [],
        contact: footerData.contact || {},
        social: footerData.social || {},
        bottomBar: footerData.bottomBar || {},
        settings: footerData.settings || {},
      };

      const payload = {
        menu_guid: footerData.menuGuid || targetRowGuid,
        row_guid: targetRowGuid,
        workspace_guid: workspaceId,
        menu_key: "footer",
        name: "Site Footer & Navigation",
        content_json: cleanJson,
        is_active: true,
        updated_on: now,
        is_deleted: false,
      };

      const response = await this.merge([payload], "menus");
      if (response.data?.status === "error" || response.data?.errorMessage) {
        throw new Error(
          response.data.errorMessage || "Failed to merge footer into menus table"
        );
      }

      return {
        success: true,
        rowGuid: targetRowGuid,
        savedAt: now,
        footerData: cleanJson,
      };
    } catch (err) {
      console.error("Error saving footer in menus:", err);
      throw err;
    }
  }

  /**
   * Save workspace global custom CSS to bizfire_workspace_styles table
   * @param {string} workspaceId
   * @param {string} customCss
   * @param {string} [rowGuid]
   */
  async saveWorkspaceCustomCss(workspaceId, customCss, rowGuid) {
    try {
      const now = new Date().toISOString();
      const payload = {
        workspace_guid: workspaceId,
        custom_css: customCss || "",
        updated_on: now,
        is_deleted: false,
      };

      let targetRowGuid = rowGuid;
      if (!targetRowGuid) {
        try {
          const existing = await this.selectRows(
            "bizfire_workspace_styles",
            "row_guid",
            [
              { Operand: "eq", UIKey: "workspace_guid", Value: workspaceId },
              { Operand: "eq", UIKey: "is_deleted", Value: "false" },
            ],
          );
          if (existing && existing[0]?.row_guid) {
            targetRowGuid = existing[0].row_guid;
          }
        } catch (fetchErr) {
          console.warn("Could not check existing bizfire_workspace_styles row_guid:", fetchErr.message);
        }
      }

      if (!targetRowGuid) {
        targetRowGuid = typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "c1000000-0000-0000-0000-" + String(workspaceId).slice(-12).padStart(12, "0");
      }
      payload.row_guid = targetRowGuid;

      const response = await this.merge([payload], "bizfire_workspace_styles");
      if (response.data?.status === "error" || response.data?.errorMessage) {
        throw new Error(response.data.errorMessage || "Failed to merge custom CSS into bizfire_workspace_styles");
      }

      return {
        success: true,
        rowGuid: targetRowGuid,
        customCss: customCss || "",
        updatedOn: now,
      };
    } catch (err) {
      console.error("Error saving workspace custom CSS:", err);
      throw err;
    }
  }
}

const dataService = new DataService();
export default dataService;
export { dataService as DataService };
