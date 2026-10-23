import Handlebars from 'handlebars';

const SUPPORTED_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'image',
  'url',
  'array',
  'icon',
  'select',
  'boolean',
  'number'
]);

export const STANDARD_CATEGORIES = [
  'Hero',
  'Header',
  'Footer',
  'Services',
  'Call to Action',
  'Stats & Social Proof',
  'Video & Media',
  'Locations',
  'Process',
  'Testimonials',
  'Offers & Pricing',
  'Financing',
  'Membership',
  'Marquee & Badges',
  'General'
];

/**
 * Slugifies a string into a clean component key.
 * e.g. "Plumbing Service Hero!" -> "plumbing-service-hero"
 */
export function slugifyKey(input = '') {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Converts a slug into a friendly title name.
 * e.g. "plumbing-service-hero" -> "Plumbing Service Hero"
 */
export function titleizeKey(slug = '') {
  return String(slug)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Normalizes CSS content: removes placeholder comments; if empty, returns empty string.
 */
export function normalizeCss(rawCss = '') {
  if (!rawCss || typeof rawCss !== 'string') return '';
  const stripped = rawCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  return stripped.length === 0 ? '' : rawCss.trim();
}

/**
 * Normalizes component schema into a standard structure:
 * { name, category, fields, rawSchema }
 */
export function normalizeSchema(rawSchema) {
  const errors = [];
  const warnings = [];

  let parsed = rawSchema;
  if (typeof rawSchema === 'string') {
    try {
      parsed = JSON.parse(rawSchema);
    } catch (err) {
      return {
        isValid: false,
        name: '',
        category: 'General',
        fields: {},
        rawSchema: null,
        errors: [`Invalid JSON in schema.json: ${err.message}`],
        warnings: []
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      name: '',
      category: 'General',
      fields: {},
      rawSchema: parsed,
      errors: ['schema.json must be a JSON object'],
      warnings: []
    };
  }

  let name = parsed.name || '';
  let category = parsed.category || 'General';
  let fields = {};

  if (parsed.fields && typeof parsed.fields === 'object' && !Array.isArray(parsed.fields)) {
    fields = parsed.fields;
  } else {
    // Schema is direct dictionary of fields
    fields = { ...parsed };
    delete fields.name;
    delete fields.category;
  }

  // Validate field types
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (!fieldDef || typeof fieldDef !== 'object') {
      errors.push(`Field "${fieldName}" must be a definition object with a "type"`);
      continue;
    }
    const type = fieldDef.type;
    if (!type) {
      errors.push(`Field "${fieldName}" is missing required "type" property`);
    } else if (!SUPPORTED_FIELD_TYPES.has(type.toLowerCase())) {
      warnings.push(`Field "${fieldName}" uses non-standard type "${type}" (standard: ${Array.from(SUPPORTED_FIELD_TYPES).join(', ')})`);
    }

    if (type === 'array' && fieldDef.itemSchema && typeof fieldDef.itemSchema !== 'object') {
      errors.push(`Array field "${fieldName}" has invalid itemSchema (must be an object)`);
    }
  }

  return {
    isValid: errors.length === 0,
    name,
    category,
    fields,
    rawSchema: parsed,
    errors,
    warnings
  };
}

/**
 * Validates and parses defaults.json
 */
export function normalizeDefaults(rawDefaults) {
  if (typeof rawDefaults === 'object' && rawDefaults !== null) {
    return { isValid: true, data: rawDefaults, errors: [] };
  }
  if (!rawDefaults || typeof rawDefaults !== 'string') {
    return { isValid: true, data: {}, errors: [] };
  }
  try {
    const data = JSON.parse(rawDefaults);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { isValid: false, data: {}, errors: ['defaults.json must be a JSON object'] };
    }
    return { isValid: true, data, errors: [] };
  } catch (err) {
    return { isValid: false, data: {}, errors: [`Invalid JSON in defaults.json: ${err.message}`] };
  }
}

/**
 * Dry-run Handlebars compilation and test execution with defaults
 */
export function dryRunHandlebars(templateHtml = '', defaults = {}) {
  if (!templateHtml || typeof templateHtml !== 'string' || !templateHtml.trim()) {
    return {
      success: false,
      error: 'template.html is empty or missing'
    };
  }

  try {
    const compiled = Handlebars.compile(templateHtml);
    const html = compiled(defaults || {});
    return {
      success: true,
      html,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      error: `Handlebars syntax error: ${err.message}`
    };
  }
}

/**
 * Validates a complete component bundle before ingestion
 *
 * @param {object} bundle
 * @param {string} bundle.key - Component folder name or slug (e.g. plumbing-service-hero)
 * @param {string} [bundle.name] - Friendly name
 * @param {string} [bundle.category] - Component category
 * @param {string} bundle.template - Handlebars HTML string
 * @param {string|object} bundle.schema - Schema definition
 * @param {string|object} bundle.defaults - Default content
 * @param {string} [bundle.css] - Component CSS
 * @param {Array<object>} [bundle.images] - Companion image files
 * @returns {object} Normalized and validated component object
 */
export function validateComponentBundle(bundle = {}) {
  const errors = [];
  const warnings = [];

  const rawKey = bundle.key || '';
  const key = slugifyKey(rawKey);

  if (!key) {
    errors.push('Component key is missing or invalid');
  }

  // 1. Validate Schema
  const schemaRes = normalizeSchema(bundle.schema);
  if (!schemaRes.isValid) {
    errors.push(...schemaRes.errors);
  }
  if (schemaRes.warnings.length > 0) {
    warnings.push(...schemaRes.warnings);
  }

  // Determine friendly name: explicitly provided > schema.name > titleized key
  const name = bundle.name?.trim() || schemaRes.name || titleizeKey(key);

  // Determine category: explicitly provided > schema.category > auto-detect from key > 'General'
  let category = bundle.category?.trim() || schemaRes.category || '';
  if (!category || category.toLowerCase() === 'general') {
    if (key.startsWith('header-') || key.endsWith('-header') || key.includes('site-header') || key.includes('-nav')) {
      category = 'Header';
    } else if (key.startsWith('footer-') || key.endsWith('-footer') || key.includes('site-footer')) {
      category = 'Footer';
    } else {
      category = 'General';
    }
  } else if (/header/i.test(category)) {
    category = 'Header';
  } else if (/footer/i.test(category)) {
    category = 'Footer';
  }

  // 2. Validate Defaults
  const defsRes = normalizeDefaults(bundle.defaults);
  if (!defsRes.isValid) {
    errors.push(...defsRes.errors);
  }

  // 3. Dry-run Handlebars execution
  const hbRes = dryRunHandlebars(bundle.template, defsRes.data);
  if (!hbRes.success) {
    errors.push(hbRes.error);
  }

  // 4. Cross-check fields: warn if schema field missing in defaults
  if (schemaRes.fields && defsRes.data) {
    for (const fieldName of Object.keys(schemaRes.fields)) {
      if (!(fieldName in defsRes.data)) {
        warnings.push(`Field "${fieldName}" defined in schema but absent in defaults.json`);
      }
    }
  }

  // 5. Normalize CSS
  const css = normalizeCss(bundle.css);

  return {
    key,
    name,
    category,
    template: bundle.template || '',
    schema: schemaRes.rawSchema || schemaRes.fields,
    fields: schemaRes.fields,
    defaults: defsRes.data,
    css,
    images: Array.isArray(bundle.images) ? bundle.images : [],
    renderedPreview: hbRes.html || '',
    valid: errors.length === 0,
    errors,
    warnings
  };
}
