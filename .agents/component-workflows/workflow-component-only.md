# Workflow: Standalone Component & Variation Ingestion Pipeline

**Purpose:** Convert a designer's standalone component HTML mockup (e.g., `temp/components-only/hero/hero-01.html` or `temp/components-only/header/header-01.html`) into an editor-ready component package:
1. `template.html` (Pure Handlebars markup, stripped of `<head>`, `<style>`, and `<script>`)
2. `schema.json` (Strictly standardized to Category Handlebars Keys from `BIZFIRE_CONTEXT.md`)
3. `defaults.json` (Seed values from the HTML source)
4. `style.css` (Extracted component-specific CSS)
5. `script.js` (Optional companion JS if the component has client-side behavior)

**Prerequisite:** Read `.agents/context/BIZFIRE_CONTEXT.md` before starting. All field names MUST conform to the **Category Standard Handlebars Key Dictionary** defined in `BIZFIRE_CONTEXT.md`.

---

## 1. Context & Architecture Rules

### 1.1 Category as Component Family, File as Layout Variation
In Bizfire:
- **Category** defines the functional section family (e.g. `Hero`, `Header`, `Services`, `Testimonials`, `FAQ`, `CTA`, `Footer`).
- **Component Entry** represents an individual **Layout Variation** within that category (e.g. `hvac-hero-split-01`, `hvac-hero-centered-04`).
- In the Content Studio, switching variations allows clients to change visual layouts without re-typing their content.

### 1.2 The Category-Fixed Handlebars Schema Contract
> **CRITICAL RULE:** All variations in the same Category MUST use the EXACT SAME Handlebars keys for common content elements, as defined in `BIZFIRE_CONTEXT.md`.
> 
> If `hero-01` uses `{{title}}`, `hero-02` through `hero-04` **MUST** also use `{{title}}` (never `{{heading}}` or `{{heroTitle}}`). This guarantees that swapping variations transfers 100% of user data seamlessly with zero data loss.
>
> If a variation introduces a unique layout-specific field (e.g. `videoUrl`), add it cleanly—it will remain safely dormant when swapped to variations that do not use it.

### 1.3 Stylesheet Separation Rule
Designers supply standalone HTML files with two distinct style sections:
1. **`<head>` Style Tag:** Contains theme design tokens (`:root`), global typography, Bootstrap/FontAwesome CDNs, and generic element defaults (`.section`, `.btn-primary`). **DO NOT include this in the component package.**
2. **`<body>` Style Tag (Near/Inside the Component):** Contains the CSS specific to this component variation. **Extract this verbatim into `style.css` and remove the `<style>` tag from `template.html`.**

### 1.4 Script Separation & KSES Safety
- Never leave `<script>` tags inside `template.html` (WordPress KSES sanitization strips them).
- Extract any interactive JS (e.g. mobile toggle, accordion, carousel) into `script.js`.

### 1.5 Preserve Inline CSS
- Retain all inline `style="..."` attributes on markup elements verbatim (e.g., `style="background: #1EA7A8;"` or `style="background-image: url('...');"`). Do NOT strip inline styles.

---

## 2. USER INPUTS (Configure Before Execution)

```yaml
WORKSPACE_ID: "97a4a4ae-c293-4aad-9bbe-c4a423e49bdd" # or "master" / custom workspace
HTML_SOURCE_PATH: "temp/components-only/hero/hero-01.html"
COMPONENT_CATEGORY: "Hero"                           # e.g., Hero | Header | Services | Testimonials | CTA | FAQ | Footer
COMPONENT_KEY: "hvac-hero-01"                        # Unique variation identifier (kebab-case)
COMPONENT_NAME: "Hero - Offset Bleed Split"          # Human label in studio inspector
IS_FIRST_VARIATION_IN_CATEGORY: false                # true if establishing standard keys; false if conforming to existing sibling keys
```

---

## 3. Schema Standardization Requirement

Before generating any template or schema:
1. Open `.agents/context/BIZFIRE_CONTEXT.md` and locate the section **"Component Variations & Category Standard Handlebars Keys"**.
2. Identify the standard keys for your `[COMPONENT_CATEGORY]` (e.g., `Hero`, `Header`, `Services`, `Testimonials`, `CTA`, `FAQ`, `Footer`).
3. If sibling variations for this category already exist in `workspaces/[WORKSPACE_ID]/theme/components/`, cross-check their `schema.json` and `defaults.json` to ensure 100% key and data-type alignment.
4. Map the HTML content to these exact standard keys. Do NOT invent new key names for common elements.


## 4. Step-by-Step Execution Instructions

### Step 1 — Parse HTML & Separate Elements
1. Read the input HTML file at `[HTML_SOURCE_PATH]`.
2. Locate the main component container inside `<body>` (e.g. `<section class="... ...">` or `<header class="site-header">`).
3. Locate the companion `<style>` block located inside or adjacent to the component in `<body>`.
4. Locate any companion `<script>` block located inside or adjacent to the component in `<body>`.
5. Ignore the entire `<head>` block (Bootstrap, Font Awesome CDN, `:root` design tokens, global resets).

### Step 2 — Extract & Clean Component CSS (`style.css`)
1. Extract the CSS code from the `<body>` component `<style>` tag.
2. Ensure there are no leftover `<style>` opening/closing tags.
3. Verify that all selectors are scoped to the component class (e.g. `.hvac-hero`, `.site-header`) to prevent bleeding.
4. Save to `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/style.css`.

### Step 3 — Extract Companion JavaScript (`script.js`, if present)
1. If the file contains an adjacent `<script>` block:
   - Extract the pure JavaScript code.
   - Ensure the script is wrapped in an IIFE or checks for `dataset.initialized` to prevent multiple event listener attachments.
   - Save to `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/script.js`.
2. If no script exists, omit this file.

### Step 4 — Build Handlebars Template (`template.html`)
1. Take the pure HTML markup block (with the `<style>` and `<script>` tags removed).
2. Retain the exact outermost tag (`<section ...>` or `<header ...>`) and all classes/IDs.
3. Retain all inline `style="..."` attributes verbatim.
4. Map text, links, and assets to the **Category Standard Keys**:
   - Flat text: `{{fieldName}}`
   - Formatted HTML text (with spans/br): `{{{fieldName}}}`
   - Optional elements: `{{#if fieldName}}...{{/if}}`
   - Array collections: `{{#each items}}...{{/each}}`
   - Dynamic image tags: `{{#if image.src}}<img src="{{image.src}}" alt="{{image.alt}}" />{{/if}}`
   - Dynamic background image: `style="background-image: url('{{image.src}}');"`
   - Font Awesome icons: `<i class="fa-solid {{icon}}"></i>` (never raw `<svg>`)
5. Save to `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/template.html`.

### Step 5 — Generate Schema (`schema.json`)
1. Create schema definitions strictly using the Category Standard Keys.
2. Assign accurate `type`: `text`, `textarea`, `url`, `image`, `array`.
3. Provide descriptive human labels for each field.
4. For `type: "array"`, specify `labelField` and declare `itemSchema`.
5. Save to `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/schema.json`.

### Step 6 — Generate Defaults (`defaults.json`)
1. Extract actual copy, URLs, phone numbers, and image links directly from the designer's HTML mockup.
2. Never invent placeholder strings if real copy is present in the source HTML.
3. For array items, populate 2 to 4 items with unique `_id` strings (e.g., `"${COMPONENT_KEY}-item-01"`).
4. Save to `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/defaults.json`.

---

## 5. Verification & Variation Compatibility Checklist

Before completing execution, verify:
- [ ] **No `<head>` Leakage:** Neither Bootstrap CDN nor `:root` tokens leaked into `style.css` or `template.html`.
- [ ] **No `<style>` or `<script>` tags in `template.html`:** The template is clean HTML + Handlebars.
- [ ] **Inline Styles Preserved:** Any inline `style=""` attributes in the original component remain verbatim.
- [ ] **Key Uniformity:** All Handlebars keys match the Category Standard Key Dictionary 100%.
- [ ] **Sibling Swap Check:** If another variation of this category exists in the theme, verify that fields like `title`, `description`, `phoneText`, `primaryButtonText`, and array keys use the exact same property names.
- [ ] **File Presence:**
  - `template.html` created.
  - `schema.json` created and valid JSON.
  - `defaults.json` created and valid JSON.
  - `style.css` created with component-specific CSS.
  - `script.js` created if client-side JS was present.
