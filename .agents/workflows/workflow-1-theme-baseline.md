# Workflow 1: Theme Baseline Setup & Asset Ingestion

**Purpose:** Establish the global CSS foundation, ingest all static assets, and create the
`theme.json` manifest for a new client project. Run this ONCE before any other workflow.

**Prerequisite:** Read `.agents/context/BIZFIRE_CONTEXT.md` before starting.

---

## USER INPUTS (fill before running)

```
WORKSPACE_ID     = [e.g. "acme-plumbing-001"]
THEME_ID         = [e.g. "acme-plumbing"]
THEME_NAME       = [e.g. "Acme Plumbing Theme"]
CLIENT_NAME      = [e.g. "Acme Plumbing Co."]
HTML_SOURCE_PATH = [e.g. "temp/Demo-html/index.html"]
ASSETS_SOURCE    = [e.g. "temp/Demo-html/assets/"]
WP_SITE_URL      = [e.g. "https://acme-plumbing.com"]
```

---

## Step 1 — Inspect Designer CSS

Read the CSS files linked in `[HTML_SOURCE_PATH]`'s `<head>`:

1. Identify every `@import url(...)` or `<link rel="stylesheet">`.
2. List every Google Fonts family used (check `font-family:` declarations).
3. List every icon library (Font Awesome, Bootstrap Icons, Ionicons, etc.).
4. Note any external CDN scripts in `<body>` or `<head>`.

---

## Step 2 — Inspect & Copy Static Assets

1. List every file inside `[ASSETS_SOURCE]img/` and `[ASSETS_SOURCE]js/`.
2. Copy all images from `[ASSETS_SOURCE]img/` to `public/assets/img/`.
3. Copy all JS files from `[ASSETS_SOURCE]js/` to `public/assets/js/`.
4. Verify that no image is referenced with a relative path like `../assets/img/` anywhere in
   the source HTML — correct all occurrences to `/assets/img/[filename]`.

---

## Step 3 — Build Master Stylesheet

Create `workspaces/[WORKSPACE_ID]/theme/style.css`:

1. At the very top, add `@import` lines for:
   - All Google Fonts found in Step 1 (consolidate into a single URL if possible).
   - Font Awesome 6: `@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');`
   - Any other icon library found in Step 1.
2. Below the imports, copy the FULL contents of the designer's CSS file(s) verbatim.
3. Do NOT modify any designer CSS rules. Preserve all class names, selectors, and values exactly.

---

## Step 4 — Create Theme Manifest

Create `workspaces/[WORKSPACE_ID]/theme/theme.json`:

```json
{
  "id": "[THEME_ID]",
  "name": "[THEME_NAME]",
  "version": "1.0.0",
  "description": "Theme generated from designer mockup for [CLIENT_NAME].",
  "author": "Bizfire Studio",
  "fontFamily": "[Primary font-family from Step 1, e.g. 'Inter, ui-sans-serif, sans-serif']",
  "defaultPageVariant": "[template-id to be created in Workflow 2]"
}
```

---

## Step 5 — Create Workspace Config

Create `workspaces/[WORKSPACE_ID]/workspace.json`:

```json
{
  "workspaceId": "[WORKSPACE_ID]",
  "clientName": "[CLIENT_NAME]",
  "themeId": "[THEME_ID]",
  "wpSiteUrl": "[WP_SITE_URL]",
  "wpUser": "",
  "wpAppPassword": "",
  "createdAt": "[ISO timestamp of now]"
}
```

---

## Completion Criteria

- [ ] `public/assets/img/` contains all designer images.
- [ ] `public/assets/js/` contains all designer scripts.
- [ ] `workspaces/[WORKSPACE_ID]/theme/style.css` starts with CDN `@import` lines and contains all designer CSS.
- [ ] `workspaces/[WORKSPACE_ID]/theme/theme.json` exists with correct font and ID.
- [ ] `workspaces/[WORKSPACE_ID]/workspace.json` exists with correct site URL.

**Next:** Run Workflow 2 — Section Discovery & page-template.json.
