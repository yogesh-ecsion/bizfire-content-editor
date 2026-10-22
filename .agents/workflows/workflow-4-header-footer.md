# Workflow 4: Header & Footer Extraction

**Purpose:** Extract the site header (navigation + logo + CTA) and footer (links, social,
copyright) from the designer HTML into standalone JSON files. Run ONCE per site.

**Prerequisite:** Read `.agents/context/BIZFIRE_CONTEXT.md` before starting.

---

## USER INPUTS (fill before running)

```
WORKSPACE_ID     = [e.g. "acme-plumbing-001"]
HTML_SOURCE_PATH = [e.g. "temp/Demo-html/index.html"]
```

---

## Part A: Header Extraction

### Step A1 — Extract Header HTML

Read `[HTML_SOURCE_PATH]`. Locate the topmost `<header>` tag or the first major navigation
wrapper (e.g. `<div class="navbar">`, `<nav class="site-nav">`).

Extract the complete block (opening to closing tag) and paste it here for reference.

---

### Step A2 — Analyze Header Content

Identify every distinct piece of data in the header:

1. **Logo** — image src and alt text, or SVG text logo string.
2. **Navigation links** — each link label and href.
3. **Phone number / CTA button** — visible phone text, href (tel:...), button label.
4. **Secondary links** — any top-bar links, emergency links, or utility nav items.
5. **Social icons** — any social media links with icon class/type.

---

### Step A3 — Generate Header Template

Create `workspaces/[WORKSPACE_ID]/theme/components/site-header/template.html`:

1. Preserve the designer's exact HTML structure, classes, and IDs.
2. Replace the logo `src` with `{{logo.src}}` and `alt` with `{{logo.alt}}`.
3. Replace nav links with an `{{#each navLinks}}` loop:
   ```html
   {{#each navLinks}}
   <li><a href="{{url}}">{{label}}</a></li>
   {{/each}}
   ```
4. Replace phone CTA: `<a href="{{phone.href}}">{{phone.label}}</a>`
5. Replace CTA button text with `{{ctaButton.label}}` and href with `{{ctaButton.url}}`.
6. NO raw `<svg>` — replace social icons with Font Awesome `<i class="fa-brands fa-..."></i>`.

---

### Step A4 — Generate Header Schema

Create `workspaces/[WORKSPACE_ID]/theme/components/site-header/schema.json`:

```json
{
  "logo": {
    "type": "image",
    "label": "Site Logo",
    "default": { "src": "/assets/img/logo.png", "alt": "Company Name" }
  },
  "navLinks": {
    "type": "array",
    "label": "Navigation Links",
    "labelField": "label",
    "itemSchema": {
      "label": { "type": "text", "label": "Link Text", "required": true },
      "url":   { "type": "url",  "label": "URL", "required": true }
    }
  },
  "phone": {
    "label": { "type": "text", "label": "Phone Display Text", "default": "(800) 555-0199" },
    "href":  { "type": "text", "label": "Phone href (tel:...)", "default": "tel:8005550199" }
  },
  "ctaButton": {
    "label": { "type": "text", "label": "CTA Button Text", "default": "Book Now" },
    "url":   { "type": "url",  "label": "CTA Button URL",  "default": "/contact" }
  }
}
```

Adjust fields based on what is actually present in the designer's header.

---

### Step A5 — Generate Header Defaults

Create `workspaces/[WORKSPACE_ID]/theme/components/site-header/defaults.json`
with all values extracted from the actual HTML:

```json
{
  "logo": { "src": "/assets/img/logo.png", "alt": "Acme Plumbing" },
  "navLinks": [
    { "_id": "nav-01", "label": "Services", "url": "#services" },
    { "_id": "nav-02", "label": "About", "url": "#about" }
  ],
  "phone": { "label": "(800) 555-0199", "href": "tel:8005550199" },
  "ctaButton": { "label": "Request Service", "url": "/contact" }
}
```

---

## Part B: Footer Extraction

### Step B1 — Extract Footer HTML

Read `[HTML_SOURCE_PATH]`. Locate the `<footer>` tag or the last major wrapper block
(often contains copyright text, privacy policy link, and/or multiple column nav groups).

Extract the complete block.

---

### Step B2 — Analyze Footer Content

Identify:
1. **Logo or brand name** in footer.
2. **Footer nav columns** — each column has a heading and list of links.
3. **Social media links** — platform and URL.
4. **Copyright text** — the full copyright string.
5. **Legal links** — Privacy Policy, Terms of Service, etc.
6. **Contact info** — address, phone, email if present.

---

### Step B3 — Generate Footer Template

Create `workspaces/[WORKSPACE_ID]/theme/components/site-footer/template.html`:

1. Preserve designer's outer wrapper classes and grid exactly.
2. Replace brand/logo: `{{#if logo.src}}<img src="{{logo.src}}" alt="{{logo.alt}}" />{{/if}}`
3. For footer nav columns use `{{#each navColumns}}` with nested `{{#each links}}`:
   ```html
   {{#each navColumns}}
   <div class="footer-col">
     <h4>{{heading}}</h4>
     <ul>
       {{#each links}}
       <li><a href="{{url}}">{{label}}</a></li>
       {{/each}}
     </ul>
   </div>
   {{/each}}
   ```
4. Social icons: `{{#each socialLinks}}<a href="{{url}}"><i class="fa-brands fa-{{platform}}"></i></a>{{/each}}`
5. Copyright: `<p>{{copyright}}</p>`

---

### Step B4 — Generate Footer Schema

Create `workspaces/[WORKSPACE_ID]/theme/components/site-footer/schema.json`:

```json
{
  "logo": {
    "type": "image",
    "label": "Footer Logo",
    "default": { "src": "/assets/img/logo.png", "alt": "Company Name" }
  },
  "navColumns": {
    "type": "array",
    "label": "Footer Nav Columns",
    "labelField": "heading",
    "itemSchema": {
      "heading": { "type": "text", "label": "Column Heading", "required": true },
      "links": {
        "type": "array",
        "label": "Links",
        "labelField": "label",
        "itemSchema": {
          "label": { "type": "text", "label": "Link Text", "required": true },
          "url":   { "type": "url",  "label": "URL", "required": true }
        }
      }
    }
  },
  "socialLinks": {
    "type": "array",
    "label": "Social Media Links",
    "labelField": "platform",
    "itemSchema": {
      "platform": { "type": "text", "label": "Platform (e.g. facebook, instagram, x-twitter)" },
      "url":      { "type": "url",  "label": "Profile URL" }
    }
  },
  "copyright": {
    "type": "text",
    "label": "Copyright Text",
    "default": "© 2025 Company Name. All rights reserved."
  }
}
```

---

### Step B5 — Generate Footer Defaults

Create `workspaces/[WORKSPACE_ID]/theme/components/site-footer/defaults.json`
with all values extracted from the actual HTML.

---

## Completion Criteria

- [ ] `site-header/template.html` — exact designer markup, Handlebars-ified, no raw SVG.
- [ ] `site-header/schema.json` — navLinks as array, phone and CTA as flat objects.
- [ ] `site-header/defaults.json` — real nav links from the HTML, correct phone/CTA.
- [ ] `site-footer/template.html` — footer columns as `{{#each navColumns}}`.
- [ ] `site-footer/schema.json` — navColumns and socialLinks as array types.
- [ ] `site-footer/defaults.json` — real footer data from the HTML.

**After completing all 4 workflows:** All components, header, footer, and the page template
are ready. Proceed to database seeding or local JSON wiring.
