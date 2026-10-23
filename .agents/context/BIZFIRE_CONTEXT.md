# Bizfire Component Page Editor — Agent Context

> This file is the single source of truth for AI agents (Google Antigravity, Codex, etc.) working
> on the Bizfire Component Page Editor. Read this before executing any workflow.

---

## Project Purpose

The Bizfire Component Page Editor converts any designer HTML mockup into a set of
**editable, database-driven page components**. Clients edit content through a studio UI;
changes publish directly to WordPress via REST API.

---

## Directory Structure

```
bizfire-component-page-editor-poc/
│
├── themes/                         ← SHARED base theme library (not workspace-specific)
│   └── [theme-id]/
│       ├── theme.json              ← Theme metadata (id, name, fontFamily)
│       ├── style.css               ← Global theme stylesheet
│       └── components/             ← Shared/reusable component definitions
│           └── [component-key]/
│               ├── template.html   ← Handlebars template
│               ├── schema.json     ← Editor field definitions
│               └── defaults.json   ← Default content values
│
├── workspaces/
│   └── [workspace-id]/
│       ├── workspace.json          ← Workspace config (clientName, themeId, wpSiteUrl)
│       ├── theme/                  ← WORKSPACE-SPECIFIC overrides (wins over /themes/)
│       │   ├── style.css           ← 319KB full theme stylesheet
│       │   ├── theme.json          ← Theme manifest
│       │   ├── page-templates/     ← Page layout recipes
│       │   │   └── [template-id].json
│       │   └── components/         ← Per-client component overrides
│       │       └── [component-key]/
│       │           ├── template.html
│       │           ├── schema.json
│       │           └── defaults.json
│       └── pages/
│           └── [page-id].json      ← Page instance (templateId + content per section)
│
├── temp/
│   └── [client-html-folder]/
│       ├── index.html              ← RAW designer HTML mockup (INPUT for all workflows)
│       └── assets/                 ← Designer images and JS
│
└── public/
    └── assets/
        ├── img/                    ← All images served at /assets/img/[filename]
        └── js/                     ← Companion JS served at /assets/js/[filename]
```

---

## Component File Formats

### `template.html` — Handlebars HTML

- Preserves designer outer wrapper classes and IDs exactly.
- Use `{{fieldName}}` for flat text fields.
- Use `{{{fieldName}}}` (triple braces) ONLY for safe HTML (e.g. `<br />`).
- Use `{{#if field}}...{{/if}}` to suppress optional elements when empty.
- Use `{{#each items}}...{{/each}}` for array (repeating) collections.
- NEVER inline raw `<svg>` — replace with Font Awesome `<i class="fa-solid fa-..."></i>`.

Flat section example:
```html
<section class="designer-class-name">
  {{#if eyebrow}}<p class="eyebrow">{{eyebrow}}</p>{{/if}}
  <h2>{{{title}}}</h2>
  {{#if subtitle}}<p>{{subtitle}}</p>{{/if}}
  {{#if buttonText}}<a href="{{buttonUrl}}" class="btn">{{buttonText}}</a>{{/if}}
</section>
```

Array section example:
```html
<section class="services-grid">
  <h2>{{sectionTitle}}</h2>
  <div class="grid">
    {{#each items}}
    <div class="card">
      <i class="fa-solid {{icon}}"></i>
      <h3>{{title}}</h3>
      <p>{{desc}}</p>
    </div>
    {{/each}}
  </div>
</section>
```

---

### `schema.json` — Editor Field Definitions

Flat section:
```json
{
  "fieldName": { "type": "text|textarea|image|url", "label": "Human Label", "default": "..." },
  "image": { "type": "image", "label": "Image", "default": { "src": "/assets/img/x.webp", "alt": "..." } }
}
```

Array section:
```json
{
  "sectionTitle": { "type": "text", "label": "Section Heading", "default": "Our Services" },
  "items": {
    "type": "array",
    "label": "Items",
    "labelField": "title",
    "itemSchema": {
      "title": { "type": "text", "label": "Card Title", "required": true },
      "desc":  { "type": "textarea", "label": "Description" },
      "icon":  { "type": "text", "label": "Font Awesome class (e.g. fa-wrench)" }
    }
  }
}
```

---

### `defaults.json` — Default Content

Flat:
```json
{
  "title": "Section Title Here",
  "intro": "Supporting paragraph text here.",
  "image": { "src": "/assets/img/hero.webp", "alt": "Alt text" }
}
```

Array (include 2–4 seed items with `_id`):
```json
{
  "sectionTitle": "Our Services",
  "items": [
    { "_id": "item-01", "title": "Service One", "desc": "Description.", "icon": "fa-water" },
    { "_id": "item-02", "title": "Service Two", "desc": "Description.", "icon": "fa-fire" }
  ]
}
```

---

### `page-template.json` — Page Layout Recipe

Saved to `workspaces/[workspace-id]/theme/page-templates/[template-id].json`:
```json
{
  "id": "template-id",
  "name": "Human Name",
  "description": "Description of this page layout.",
  "components": [
    { "type": "component-key-1" },
    { "type": "component-key-2" }
  ]
}
```

---

## Schema Intelligence Rules (MANDATORY)

| Section Contains | Required Schema |
| :--- | :--- |
| Single headline + paragraphs + 1 image + 1 button | Flat key-value fields |
| 3+ repeating cards with same structure | `type: "array"` with `itemSchema` |
| Accordion Q&A, numbered checklists | `type: "array"` with `itemSchema` |
| Customer review/testimonial cards | `type: "array"` with `itemSchema` |
| Scrolling logo marquee / partner strip | `type: "array"` with `itemSchema` |
| Numbered process steps | `type: "array"` with `itemSchema` |
| Coupon / promo card grid | `type: "array"` with `itemSchema` |

When in doubt: use array. It gives the client the ability to add items later.

---

## Component Variations & Category Standard Handlebars Keys (MANDATORY)

In Bizfire:
- **Category** defines the functional component family (e.g. `Hero`, `Header`, `Services`, `Testimonials`, `FAQ`, `CTA`, `Footer`).
- **Component Entry** represents an individual **Layout Variation** within that category (e.g. `hvac-hero-split`, `hvac-hero-full-02`).
- When a user swaps layout variations in the Content Studio, the editor non-destructively merges existing user copy onto the new layout defaults.

> **CRITICAL RULE:** All variations belonging to the same Category MUST use the exact same Handlebars keys for identical content elements. Do not invent arbitrary field names per layout.
>
> If a variation introduces a unique layout-specific field (e.g. `videoUrl`), add it cleanly—it will stay dormant when swapped to variations that do not use it.

### Standard Category Key Dictionary

#### 1. Category: `Hero`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `eyebrow` | text | Optional top badge / kicker text |
| `eyebrowIcon` | text | Font Awesome icon class (e.g. `fa-shield-halved`) |
| `title` | text | Section headline (`{{{title}}}` if HTML formatting like `<span>` or `<br>` is present) |
| `description` | textarea | Lead intro paragraph |
| `primaryButtonText` | text | Primary action button label (e.g. `Schedule Service`) |
| `primaryButtonUrl` | url | Destination for primary action button |
| `primaryButtonIcon` | text | Font Awesome icon class (e.g. `fa-arrow-right`) |
| `phoneText` | text | Visible phone number / call label (e.g. `(609) 555-0100`) |
| `phoneUrl` | text | Tel link (e.g. `tel:+16095550100`) |
| `phoneIcon` | text | Font Awesome icon class (e.g. `fa-phone`) |
| `image` | image | Main hero image object: `{ "src": "...", "alt": "..." }` |
| `trustItems` | array | Trust bullets / badges: `[{ "_id": "...", "icon": "fa-circle-check", "text": "..." }]` |

#### 2. Category: `Header`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `topbarLocation` | text | Service area / location notification text |
| `topbarEmergencyText` | text | Emergency dispatch notification text |
| `phoneText` | text | Main phone display string |
| `phoneUrl` | text | Tel link (`tel:+1...`) |
| `brandName` | text | Company / site name text |
| `brandTagline` | text | Subtitle / slogan text below brand name |
| `brandLogo` | image | `{ "src": "/assets/img/logo.png", "alt": "..." }` |
| `navLinks` | array | Main navigation items: `[{ "_id": "...", "label": "...", "url": "..." }]` |
| `ctaButtonText` | text | Primary action button label |
| `ctaButtonUrl` | url | Primary action link |

#### 3. Category: `Services` / `Features`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `eyebrow` | text | Optional section kicker |
| `title` | text | Section headline (`{{{title}}}`) |
| `description` | textarea | Section intro / supporting copy |
| `items` | array | Service cards: `[{ "_id": "...", "title": "...", "desc": "...", "icon": "fa-...", "url": "...", "image": {...} }]` |

#### 4. Category: `Testimonials`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `eyebrow` | text | Section kicker |
| `title` | text | Section headline (`{{{title}}}`) |
| `description` | textarea | Section intro copy |
| `items` | array | Review cards: `[{ "_id": "...", "name": "...", "location": "...", "quote": "...", "rating": 5, "initial": "J", "avatar": {...} }]` |

#### 5. Category: `CTA` / `Banner`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `eyebrow` | text | Section kicker |
| `title` | text | Banner headline (`{{{title}}}`) |
| `description` | textarea | Banner descriptive paragraph |
| `primaryButtonText` | text | Action button label |
| `primaryButtonUrl` | url | Action button URL |
| `phoneText` | text | Optional phone display text |
| `phoneUrl` | text | Optional phone tel URL |

#### 6. Category: `FAQ`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `eyebrow` | text | Section kicker |
| `title` | text | Section headline (`{{{title}}}`) |
| `description` | textarea | Section intro paragraph |
| `items` | array | Q&A items: `[{ "_id": "...", "question": "...", "answer": "..." }]` |

#### 7. Category: `Footer`
| Handlebars Key | Type | Description / Usage |
| :--- | :--- | :--- |
| `brandName` | text | Company / footer brand |
| `brandDescription` | textarea | Short about summary |
| `copyright` | text | Full copyright statement |
| `navColumns` | array | Grouped footer columns: `[{ "_id": "...", "heading": "...", "links": [{ "label": "...", "url": "..." }] }]` |
| `socialLinks` | array | Social icons: `[{ "_id": "...", "platform": "facebook", "url": "..." }]` |

---

## WordPress KSES Safety Rules (Non-Negotiable)

1. NO raw `<svg>` in templates — use Font Awesome `<i class="fa-solid fa-..."></i>`.
2. NO `<script>` tags inside templates — companion JS registered separately.
3. Preserve inline `style=""` attributes verbatim from the designer HTML (e.g. `style="background: #1EA7A8;"`). Do NOT strip them out. Keep them intact in `template.html` to preserve exact visual styling.

---

## Style Architecture

- `workspaces/[workspace-id]/theme/style.css` — Master stylesheet (~319KB). ALL styles live here.
- Component `style.css` files: leave empty unless truly unique to that one component.
- CDN imports at the very top of the master stylesheet:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=...');
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
  ```

---

## Naming Conventions

- Component keys: `kebab-case`, descriptive. Examples: `plumbing-hero-split`, `services-detailed-grid`
- Template IDs: match page slug. Examples: `demo-plumbing`, `service-standard`
- Image paths: always root-relative `/assets/img/[filename]`

---

## DO NOT

- Do NOT run Cheerio parsing scripts or manual file assembly.
- Do NOT write `<svg>` inside any Handlebars template.
- Do NOT add CSS inside component `style.css` unless truly component-unique.
- Do NOT invent arbitrary field names — strictly adhere to the Category Standard Handlebars Key Dictionary above, mapping real values from the HTML source to the standard keys.
- Do NOT mention `compileHeader`, `HeaderEditor`, `compileFooter`, or any internal Next.js API
  in prompts sent to a designer environment. Those are internal studio implementation details.

