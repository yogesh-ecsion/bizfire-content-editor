# Workflow 3: Single Component Generation

**Purpose:** Generate the three files for ONE component (`template.html`, `schema.json`,
`defaults.json`) by extracting the exact section from the designer HTML.

**IMPORTANT:** Run this workflow ONCE PER COMPONENT. Each invocation handles exactly one
section. This is intentional — it prevents context drift and guarantees accuracy.

**Prerequisite:** Read `.agents/context/BIZFIRE_CONTEXT.md` before starting.

---

## USER INPUTS (fill before running)

```
WORKSPACE_ID      = [e.g. "acme-plumbing-001"]
COMPONENT_KEY     = [e.g. "acme-services-grid"]
COMPONENT_NAME    = [e.g. "Services Detailed Grid"]
COMPONENT_CATEGORY = [e.g. "Services"]
HTML_SOURCE_PATH  = [e.g. "temp/Demo-html/index.html"]
SECTION_SELECTOR  = [e.g. "<section class=\"services-wrapper\">" — the outermost tag from Workflow 2 inventory]
```

---

## Step 1 — Extract Section HTML

Read the file at `[HTML_SOURCE_PATH]`.

Locate the section identified by `[SECTION_SELECTOR]`. Extract the COMPLETE HTML block from
its opening tag to its matching closing tag. Include all nested elements verbatim.

Paste the extracted block here for reference before proceeding:
```
[Antigravity will paste the extracted HTML here]
```

---

## Step 2 — Analyze Schema Type

Examine the extracted HTML and apply the Schema Intelligence Rules from `BIZFIRE_CONTEXT.md`:

Ask: **Does this section contain 3 or more repeating items with the same structure?**

- If YES → Schema type is **ARRAY**. Identify the repeating item wrapper and the fields inside each item.
- If NO → Schema type is **FLAT**. Identify each distinct editable text, image, and link.

State your decision and reasoning before writing any files.

---

## Step 3 — Plan Fields

List every field that will be editable. For each field record:
- Field name (camelCase key)
- Type: `text`, `textarea`, `image`, `url`, `array`
- Whether it is optional (should be wrapped in `{{#if}}`)
- The actual text value from the HTML to use as the default

For ARRAY fields, also list the `itemSchema` fields for each repeating item.

---

## Step 4 — Generate `template.html`

Create `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/template.html`.

Rules:
1. Use the EXACT outer wrapper from the designer HTML (`class`, `id`, `data-*` attributes all preserved).
2. Replace static text with Handlebars tokens: `{{fieldName}}` or `{{{fieldName}}}` for HTML.
3. Wrap ALL optional elements in `{{#if fieldName}}...{{/if}}`.
4. For array fields: wrap the repeating item block in `{{#each items}}...{{/each}}`.
5. Replace ANY `<svg>` icon with the equivalent Font Awesome class:
   `<i class="fa-solid fa-[icon-name]"></i>`
6. Preserve all CSS classes, IDs, and structural nesting exactly — do NOT restructure the HTML.
7. Preserve all inline `style=""` attributes from the designer HTML verbatim (e.g. `style="background: #1EA7A8;"`) — do NOT strip or remove them.

---

## Step 5 — Generate `schema.json`

Create `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/schema.json`.

For FLAT sections:
```json
{
  "fieldName": {
    "type": "text|textarea|image|url",
    "label": "Human Readable Label",
    "default": "Exact text from HTML"
  }
}
```

For ARRAY sections:
```json
{
  "sectionTitle": {
    "type": "text",
    "label": "Section Heading",
    "default": "Exact heading text from HTML"
  },
  "items": {
    "type": "array",
    "label": "Items",
    "labelField": "title",
    "itemSchema": {
      "title": { "type": "text", "label": "Title", "required": true },
      "desc":  { "type": "textarea", "label": "Description" },
      "icon":  { "type": "text",    "label": "Font Awesome class (e.g. fa-wrench)" }
    }
  }
}
```

---

## Step 6 — Generate `defaults.json`

Create `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/defaults.json`.

- All values are extracted from the ACTUAL designer HTML — do NOT invent placeholder text.
- For images: use `/assets/img/[filename]` root-relative paths (files copied in Workflow 1).
- For ARRAY items: include 2–4 real items from the HTML, each with a unique `_id` key:
  ```json
  { "_id": "[component-key]-item-01", "title": "...", "desc": "...", "icon": "fa-wrench" }
  ```

---

## Step 7 — Create Empty `style.css`

Create `workspaces/[WORKSPACE_ID]/theme/components/[COMPONENT_KEY]/style.css` with content:

```css
/* Component styles handled by master theme stylesheet. */
```

Only add actual CSS here if this component has styles that are 100% unique to it and
do NOT exist anywhere in `workspaces/[WORKSPACE_ID]/theme/style.css`.

---

## Completion Criteria

- [ ] `template.html` uses exact designer classes, no restructured HTML, no raw `<svg>`.
- [ ] `schema.json` uses ARRAY for repeating sections and FLAT for singular sections.
- [ ] `defaults.json` contains ONLY text and values extracted from the actual HTML source.
- [ ] `style.css` created (empty or minimal).
- [ ] All optional fields wrapped in `{{#if}}`.

**Repeat:** Run this workflow again for the next component in the Workflow 2 inventory table.
