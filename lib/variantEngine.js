/**
 * Content-Preserving Variant Engine for Bizfire Content Studio.
 *
 * Provides:
 * 1. Non-destructive property merging across component variations (Option A).
 * 2. Alias mapping across cross-component synonym keys (heading/title, etc.).
 * 3. Dormant property retention so swapping back and forth never loses data.
 * 4. Page template section matching with automatic stashing of unmapped sections (Option B).
 * 5. Layout SVG wireframes for visual variation thumbnail cards.
 */

// Cross-component semantic field aliases
const ALIAS_GROUPS = [
  ['title', 'heading', 'heroTitle', 'mainHeading'],
  ['subtitle', 'subheading', 'intro', 'description', 'lead', 'paragraph1', 'body'],
  ['phone', 'phoneNumber', 'phoneText', 'tel', 'callUs'],
  ['ctaText', 'buttonText', 'btnText', 'actionText', 'label'],
  ['ctaUrl', 'ctaLink', 'buttonUrl', 'btnUrl', 'link', 'url'],
  ['badge', 'badgeText', 'eyebrow', 'tag', 'kicker', 'subTitle'],
  ['image', 'heroImage', 'bgImage', 'featuredImage', 'img'],
  ['items', 'cards', 'features', 'services', 'steps', 'list', 'faqs']
];

/**
 * Find semantic aliases for a given field key
 * @param {string} key
 * @returns {string[]}
 */
export function getAliasesForKey(key) {
  if (!key) return [];
  const lowerKey = key.toLowerCase();
  for (const group of ALIAS_GROUPS) {
    if (group.some(k => k.toLowerCase() === lowerKey)) {
      return group;
    }
  }
  return [key];
}

/**
 * Deep merge component properties from existing content onto new variant defaults.
 * Retains all user-edited values, resolves alias fields, and preserves dormant keys.
 *
 * @param {Object} currentProps - User-edited data currently on canvas
 * @param {Object} variantDefaults - Default seed data of the newly selected variant
 * @returns {Object} Reconciled properties dictionary
 */
export function mergeVariantProps(currentProps = {}, variantDefaults = {}) {
  if (!currentProps || typeof currentProps !== 'object') {
    return structuredClone(variantDefaults || {});
  }
  if (!variantDefaults || typeof variantDefaults !== 'object') {
    return structuredClone(currentProps);
  }

  // Start with full clone of defaults to establish new variant skeleton
  const result = structuredClone(variantDefaults);

  // 1. Map existing properties directly or via alias to result
  const processedCurrentKeys = new Set();

  for (const [key, val] of Object.entries(currentProps)) {
    // If the exact key exists in variantDefaults
    if (key in result) {
      if (Array.isArray(val)) {
        // If currentProps has items, preserve them
        if (val.length > 0) {
          result[key] = structuredClone(val);
        }
      } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        // Recursively merge objects (e.g. image: { src, alt })
        result[key] = {
          ...(result[key] || {}),
          ...structuredClone(val)
        };
      } else if (val !== undefined && val !== '') {
        // Primitive value (string, number, boolean)
        result[key] = val;
      }
      processedCurrentKeys.add(key);
      continue;
    }

    // 2. If exact key is not in variantDefaults, check if an alias exists in variantDefaults
    const aliases = getAliasesForKey(key);
    let matchedAlias = null;
    for (const alias of aliases) {
      if (alias in result && !processedCurrentKeys.has(alias)) {
        matchedAlias = alias;
        break;
      }
    }

    if (matchedAlias) {
      if (Array.isArray(val) && val.length > 0) {
        result[matchedAlias] = structuredClone(val);
      } else if (val !== null && typeof val === 'object') {
        result[matchedAlias] = {
          ...(result[matchedAlias] || {}),
          ...structuredClone(val)
        };
      } else if (val !== undefined && val !== '') {
        result[matchedAlias] = val;
      }
    }

    // 3. Keep the original key dormant in result so switching back restores it!
    if (!(key in result)) {
      result[key] = structuredClone(val);
    }
    processedCurrentKeys.add(key);
  }

  return result;
}

/**
 * Normalizes a category string for fuzzy role matching
 */
function normalizeCategory(cat) {
  if (!cat) return 'general';
  const c = cat.toLowerCase().trim();
  if (c.includes('hero') || c.includes('banner')) return 'hero';
  if (c.includes('service') || c.includes('feature')) return 'services';
  if (c.includes('step') || c.includes('process') || c.includes('how')) return 'process';
  if (c.includes('faq') || c.includes('question') || c.includes('accordion')) return 'faq';
  if (c.includes('review') || c.includes('testimonial')) return 'testimonials';
  if (c.includes('cta') || c.includes('call to action') || c.includes('contact')) return 'cta';
  if (c.includes('about') || c.includes('bio')) return 'about';
  return c;
}

/**
 * Compare current active page sections with an incoming template skeleton.
 * Matches sections by role/category, executes non-destructive property merge on matched sections,
 * and designates unmatched sections for archiving into stashedSections.
 *
 * @param {Array<Object>} currentSections - Active sections on page
 * @param {Array<Object>} templateComponents - Target template components [{ type: string }]
 * @param {Record<string, Object>} library - Available component definitions
 * @returns {{ newSections: Array<Object>, stashedSections: Array<Object> }}
 */
export function matchSectionsForTemplate(currentSections = [], templateComponents = [], library = {}) {
  const newSections = [];
  const usedCurrentIndices = new Set();

  // Map template components to category
  const targetSlots = (templateComponents || []).map((tComp, idx) => {
    const compDef = library[tComp.type];
    return {
      type: tComp.type,
      category: normalizeCategory(compDef?.category || tComp.type),
      index: idx
    };
  });

  // Current active sections with categories
  const sourceSlots = (currentSections || []).map((s, idx) => {
    const compDef = library[s.type];
    return {
      section: s,
      category: normalizeCategory(compDef?.category || s.type),
      index: idx
    };
  });

  // Pass 1: Match by category or exact component type
  for (const slot of targetSlots) {
    const compDef = library[slot.type];
    let matchedSource = null;

    // First try exact type match
    for (const src of sourceSlots) {
      if (!usedCurrentIndices.has(src.index) && src.section.type === slot.type) {
        matchedSource = src;
        break;
      }
    }

    // Next try category/role match
    if (!matchedSource) {
      for (const src of sourceSlots) {
        if (!usedCurrentIndices.has(src.index) && src.category === slot.category) {
          matchedSource = src;
          break;
        }
      }
    }

    if (matchedSource) {
      usedCurrentIndices.add(matchedSource.index);
      // Non-destructive content merge
      const mergedContent = mergeVariantProps(
        matchedSource.section.content || {},
        compDef?.defaults || {}
      );

      newSections.push({
        instanceId: matchedSource.section.instanceId || `inst_${Date.now()}_${slot.index}`,
        type: slot.type,
        content: mergedContent,
        hidden: Boolean(matchedSource.section.hidden)
      });
    } else {
      // No match from existing page - create with defaults
      newSections.push({
        instanceId: `inst_${Date.now()}_${slot.index}`,
        type: slot.type,
        content: compDef?.defaults ? structuredClone(compDef.defaults) : {}
      });
    }
  }

  // Pass 2: Any current sections that were NOT matched in the template go to Stash
  const stashedSections = [];
  for (const src of sourceSlots) {
    if (!usedCurrentIndices.has(src.index)) {
      stashedSections.push({
        instanceId: src.section.instanceId,
        type: src.section.type,
        content: structuredClone(src.section.content || {}),
        stashedAt: new Date().toISOString(),
        originalIndex: src.index
      });
    }
  }

  return {
    newSections,
    stashedSections
  };
}

/**
 * Returns an inline SVG wireframe diagram representing a component layout
 * for visual variation thumbnail cards.
 *
 * @param {string} componentKey
 * @param {string} category
 * @returns {string} SVG markup string
 */
export function getLayoutSvgWireframe(componentKey = '', category = '') {
  const key = componentKey.toLowerCase();
  const cat = (category || '').toLowerCase();

  // Hero Split (Left Text, Right Media/Form)
  if (key.includes('split') || key.includes('form') || (cat === 'hero' && key.includes('1'))) {
    return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="8" y="14" width="46" height="6" rx="2" fill="#38bdf8" />
      <rect x="8" y="24" width="40" height="4" rx="1.5" fill="#64748b" />
      <rect x="8" y="32" width="34" height="4" rx="1.5" fill="#64748b" />
      <rect x="8" y="44" width="24" height="10" rx="3" fill="#0284c7" />
      <rect x="62" y="12" width="50" height="46" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      <circle cx="87" cy="30" r="8" fill="#334155" />
      <path d="M72 48L82 38L96 52" stroke="#475569" stroke-width="2" stroke-linecap="round" />
    </svg>`;
  }

  // Hero Centered
  if (key.includes('centered') || key.includes('center') || (cat === 'hero' && key.includes('2'))) {
    return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="30" y="14" width="60" height="6" rx="2" fill="#38bdf8" />
      <rect x="22" y="24" width="76" height="4" rx="1.5" fill="#64748b" />
      <rect x="34" y="32" width="52" height="4" rx="1.5" fill="#64748b" />
      <rect x="44" y="44" width="32" height="10" rx="3" fill="#0284c7" />
    </svg>`;
  }

  // Cards / Grid (3 columns)
  if (key.includes('grid') || key.includes('cards') || cat === 'services' || cat === 'features') {
    return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="40" y="8" width="40" height="4" rx="1.5" fill="#38bdf8" />
      <!-- Card 1 -->
      <rect x="8" y="18" width="32" height="44" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <circle cx="24" cy="28" r="5" fill="#0284c7" />
      <rect x="12" y="38" width="24" height="3" rx="1" fill="#94a3b8" />
      <rect x="12" y="44" width="18" height="2.5" rx="1" fill="#64748b" />
      <!-- Card 2 -->
      <rect x="44" y="18" width="32" height="44" rx="3" fill="#1e293b" stroke="#0284c7" stroke-width="1.5" />
      <circle cx="60" cy="28" r="5" fill="#38bdf8" />
      <rect x="48" y="38" width="24" height="3" rx="1" fill="#94a3b8" />
      <rect x="48" y="44" width="18" height="2.5" rx="1" fill="#64748b" />
      <!-- Card 3 -->
      <rect x="80" y="18" width="32" height="44" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <circle cx="96" cy="28" r="5" fill="#0284c7" />
      <rect x="84" y="38" width="24" height="3" rx="1" fill="#94a3b8" />
      <rect x="84" y="44" width="18" height="2.5" rx="1" fill="#64748b" />
    </svg>`;
  }

  // Steps / Process / Timeline
  if (key.includes('step') || key.includes('process') || cat === 'process') {
    return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <line x1="20" y1="35" x2="100" y2="35" stroke="#334155" stroke-width="2" stroke-dasharray="3 3" />
      <circle cx="24" cy="35" r="9" fill="#0284c7" />
      <text x="24" y="39" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">1</text>
      <circle cx="60" cy="35" r="9" fill="#0284c7" />
      <text x="60" y="39" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">2</text>
      <circle cx="96" cy="35" r="9" fill="#0284c7" />
      <text x="96" y="39" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">3</text>
      <rect x="14" y="50" width="20" height="3" rx="1" fill="#64748b" />
      <rect x="50" y="50" width="20" height="3" rx="1" fill="#64748b" />
      <rect x="86" y="50" width="20" height="3" rx="1" fill="#64748b" />
    </svg>`;
  }

  // Accordion / FAQ
  if (key.includes('faq') || key.includes('accordion') || cat === 'faq') {
    return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="10" y="12" width="100" height="14" rx="2" fill="#1e293b" stroke="#0284c7" stroke-width="1" />
      <rect x="16" y="17" width="40" height="4" rx="1" fill="#38bdf8" />
      <rect x="10" y="30" width="100" height="12" rx="2" fill="#1e293b" />
      <rect x="16" y="34" width="50" height="4" rx="1" fill="#64748b" />
      <rect x="10" y="46" width="100" height="12" rx="2" fill="#1e293b" />
      <rect x="16" y="50" width="44" height="4" rx="1" fill="#64748b" />
    </svg>`;
  }

  // Header / Navigation layout
  if (key.includes('header') || cat === 'header') {
    return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="6" y="8" width="108" height="8" rx="2" fill="#1e293b" />
      <rect x="8" y="11" width="30" height="2" rx="1" fill="#64748b" />
      <rect x="84" y="11" width="26" height="2" rx="1" fill="#38bdf8" />
      <rect x="6" y="20" width="108" height="24" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <rect x="12" y="27" width="24" height="10" rx="2" fill="#0284c7" />
      <rect x="46" y="30" width="12" height="4" rx="1" fill="#94a3b8" />
      <rect x="62" y="30" width="12" height="4" rx="1" fill="#94a3b8" />
      <rect x="78" y="30" width="12" height="4" rx="1" fill="#94a3b8" />
      <rect x="94" y="27" width="16" height="10" rx="2" fill="#38bdf8" />
    </svg>`;
  }

  // Generic / Default Wireframe
  return `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="70" rx="4" fill="#0f172a" />
    <rect x="12" y="16" width="50" height="6" rx="2" fill="#38bdf8" />
    <rect x="12" y="26" width="96" height="4" rx="1.5" fill="#64748b" />
    <rect x="12" y="34" width="70" height="4" rx="1.5" fill="#64748b" />
    <rect x="12" y="46" width="28" height="10" rx="3" fill="#0284c7" />
  </svg>`;
}
