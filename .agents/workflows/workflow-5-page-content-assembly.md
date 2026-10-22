# Workflow 5: Page Content Instance Assembly

**Purpose:** Assemble the initial page content record by READING existing `defaults.json` files.
This is a MECHANICAL step — NOT an AI content extraction step.
NO HTML is read. NO content is invented. All content already exists in `defaults.json` files
produced by Workflow 3.

**Run:** Once per page, AFTER all Workflow 3 sessions are complete.

**Prerequisite:** Read `.agents/context/BIZFIRE_CONTEXT.md` before starting.

---

## Why This Workflow Exists

Generating all component content in one AI pass causes drift:
- The AI re-reads the full HTML and reinterprets it differently each time.
- Long context causes the AI to fabricate field values or misattribute text between sections.
- The output does NOT match the individual `defaults.json` files you already verified.

**Solution:** Content was already extracted with 1:1 accuracy, one component at a time,
in Workflow 3. This workflow simply merges those files mechanically.

---

## USER INPUTS (fill before running)

```
WORKSPACE_ID   = [e.g. "acme-plumbing-001"]
TEMPLATE_ID    = [e.g. "acme-plumbing-main"]
PAGE_ID        = [e.g. "101"]
PAGE_SLUG      = [e.g. "new-jersey-plumbing-services"]
PAGE_TITLE     = [e.g. "New Jersey Plumbing Services"]
```

---

## Step 1 — Read the Page Template

Open `workspaces/[WORKSPACE_ID]/theme/page-templates/[TEMPLATE_ID].json`.

List every `type` value from the `components` array in order. This is the exact sequence
of components that appear on the page.

Example output:
```
1. acme-hero-split
2. acme-cta-strip
3. acme-services-grid
4. acme-testimonials
5. acme-faq
```

---

## Step 2 — Read defaults.json for Each Component

For each component key from Step 1, read the file at:
`workspaces/[WORKSPACE_ID]/theme/components/[component-key]/defaults.json`

Do NOT modify any content. Do NOT re-read the HTML source. Copy the JSON verbatim.

If a `defaults.json` file does not exist for a component key, STOP and report which
component is missing. Do NOT continue or fabricate missing content.

---

## Step 3 — Assemble the Page Content Record

Create `workspaces/[WORKSPACE_ID]/pages/[PAGE_ID].json` with this structure:

```json
{
  "postId": "[PAGE_ID]",
  "slug": "[PAGE_SLUG]",
  "title": "[PAGE_TITLE]",
  "templateId": "[TEMPLATE_ID]",
  "sections": [
    {
      "type": "acme-hero-split",
      "content": { ...exact contents of acme-hero-split/defaults.json... }
    },
    {
      "type": "acme-cta-strip",
      "content": { ...exact contents of acme-cta-strip/defaults.json... }
    }
  ]
}
```

Rules:
- The `sections` array order must EXACTLY match the `components` array in the page template.
- Each `content` object must be a verbatim copy of the component's `defaults.json`.
- Add NO additional fields. Change NO values. This is a copy operation.

---

## Step 4 — Validate the Assembly

Before saving, perform these checks:

1. **Count check:** Number of items in `sections` array = number of components in template.
2. **Key check:** Every `type` in `sections` matches a corresponding component in the template, in the same order.
3. **Content check:** Each `content` object is non-empty and contains at least one field.

Report any discrepancies. Fix by re-reading the correct `defaults.json` file — never by inventing content.

---

## Completion Criteria

- [ ] `workspaces/[WORKSPACE_ID]/pages/[PAGE_ID].json` created.
- [ ] Number of sections = number of components in page-template.json.
- [ ] All content values match the individual `defaults.json` files exactly.
- [ ] No content was invented, inferred, or extracted from HTML in this step.

**Next:** Proceed to database seeding. All 5 workflows are now complete.
