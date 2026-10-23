/**
 * Theme Tokens & CSS Parsing Utility
 * Single source of truth for extracting, synchronizing, and serializing theme variables
 * without polluting stylesheets with dummy --theme-primary tokens.
 */

/**
 * Strips legacy or auto-inserted dummy `--theme-primary` design tokens block.
 * @param {string} css
 * @returns {string}
 */
export function stripLegacyThemeTokens(css) {
  if (!css || typeof css !== 'string') return '';
  return css
    // Strips /* ── Design Tokens ── */ :root { --theme-primary ... }
    .replace(/\/\*\s*──\s*Design Tokens\s*──\s*\*\/[\s\S]*?:root\s*\{[\s\S]*?--theme-primary[\s\S]*?\}\s*/gi, '')
    // Strips /* ── Auto-generated Design Tokens ── */ ...
    .replace(/\/\*\s*──\s*Auto-generated Design Tokens\s*──\s*\*\/[\s\S]*?:root\s*\{[\s\S]*?\}\s*/gi, '')
    // Strips any :root block containing --theme-primary
    .replace(/:root\s*\{[^{}]*?--theme-primary:[^{}]*?\}\s*/gi, '')
    .trim();
}

/**
 * Extracts CSS variable value from CSS string.
 * @param {string} css
 * @param {string} varName
 * @returns {string|null}
 */
export function extractCssVar(css, varName) {
  if (!css) return null;
  const rx = new RegExp(`(?:^|[^-\\w])${varName}\\s*:\\s*([^;\\n\\r]+);?`, 'i');
  const match = css.match(rx);
  if (!match) return null;
  return match[1].trim();
}

/**
 * Extracts Google Font or CDN import URL from the top of the stylesheet.
 * @param {string} css
 * @returns {string|null}
 */
export function extractFontImportUrl(css) {
  if (!css) return null;
  const rx = /@import\s+(?:url\(['"]?([^'"\)]+)['"]?\)|['"]([^'"]+)['"])\s*;/i;
  const match = css.match(rx);
  return match ? (match[1] || match[2]).trim() : null;
}

/**
 * Parses all brand and typography tokens from CSS.
 * @param {string} rawCss
 * @returns {object}
 */
export function extractTokensFromCss(rawCss) {
  const css = stripLegacyThemeTokens(rawCss);

  // 1. Primary Colors
  const primary = extractCssVar(css, '--primary') || extractCssVar(css, '--primary-color') || '#0F766E';
  const primaryHover = extractCssVar(css, '--primary-hover') || '';
  const primarySoft = extractCssVar(css, '--primary-soft') || '';

  // 2. Secondary Colors
  const secondary = extractCssVar(css, '--secondary') || extractCssVar(css, '--secondary-color') || '#64748B';
  const secondaryHover = extractCssVar(css, '--secondary-hover') || '';
  const secondarySoft = extractCssVar(css, '--secondary-soft') || '';

  // 3. Neutrals
  const dark = extractCssVar(css, '--dark') || extractCssVar(css, '--dark-color') || '#18313B';
  const light = extractCssVar(css, '--light') || extractCssVar(css, '--light-color') || '#F4FAFA';
  const white = extractCssVar(css, '--white') || '#FFFFFF';
  const black = extractCssVar(css, '--black') || '#000000';

  // 4. Typography
  const fontSans = extractCssVar(css, '--font-sans') || extractCssVar(css, '--bs-font-sans-serif') || '"DM Sans", Arial, sans-serif';
  const fontSerif = extractCssVar(css, '--font-serif') || '"Manrope", "Helvetica Neue", sans-serif';

  // 5. CDN Font Import
  const fontUrl = extractFontImportUrl(css) || '';

  return {
    primary,
    primaryHover,
    primarySoft,
    secondary,
    secondaryHover,
    secondarySoft,
    dark,
    light,
    white,
    black,
    fontSans,
    fontSerif,
    fontUrl
  };
}

/**
 * Helper to update or set a CSS variable inside existing CSS text.
 * @param {string} css
 * @param {string} varName
 * @param {string} newVal
 * @returns {string}
 */
export function setVarInCss(css, varName, newVal) {
  if (!newVal) return css;
  const rx = new RegExp(`((?:^|[^-\\w])${varName}\\s*:\\s*)([^;\\r\\n]+)(;?)`, 'i');
  if (rx.test(css)) {
    return css.replace(rx, `$1${newVal}$3`);
  }

  // If variable does not exist, try inserting into first :root { ... }
  const rootRx = /(:root\s*\{)/i;
  if (rootRx.test(css)) {
    return css.replace(rootRx, `$1\n  ${varName}: ${newVal};`);
  }

  // Fallback: prepend a :root block
  return `:root {\n  ${varName}: ${newVal};\n}\n\n${css}`;
}

/**
 * Builds a clean standard :root design tokens block.
 * @param {object} tokens
 * @returns {string}
 */
export function generateStandardRootBlock(tokens = {}) {
  const primary = tokens.primary || '#0F766E';
  const primaryHover = tokens.primaryHover || primary;
  const primarySoft = tokens.primarySoft || '#F1F5F9';

  const secondary = tokens.secondary || '#64748B';
  const secondaryHover = tokens.secondaryHover || secondary;
  const secondarySoft = tokens.secondarySoft || '#F8FAFC';

  const dark = tokens.dark || '#18313B';
  const light = tokens.light || '#F4FAFA';
  const white = tokens.white || '#FFFFFF';
  const black = tokens.black || '#000000';

  const fontSans = tokens.fontSans || '"DM Sans", Arial, sans-serif';
  const fontSerif = tokens.fontSerif || '"Manrope", "Helvetica Neue", sans-serif';

  return `:root {
  /* BRAND COLORS */
  --primary: ${primary};
  --primary-hover: ${primaryHover};
  --primary-soft: ${primarySoft};

  /* SECONDARY COLORS */
  --secondary: ${secondary};
  --secondary-hover: ${secondaryHover};
  --secondary-soft: ${secondarySoft};

  /* NEUTRAL COLORS */
  --dark: ${dark};
  --light: ${light};
  --white: ${white};
  --black: ${black};

  /* TYPOGRAPHY */
  --font-sans: ${fontSans};
  --font-serif: ${fontSerif};
}`;
}

/**
 * Synchronizes updated tokens into the CSS text without inserting dummy blocks.
 * @param {string} rawCss
 * @param {object} tokens
 * @returns {string}
 */
export function updateCssWithTokens(rawCss, tokens) {
  let css = stripLegacyThemeTokens(rawCss || '');

  // If CSS is empty or lacks :root, initialize with standard :root block
  if (!css.includes(':root') && !css.includes('--primary')) {
    css = generateStandardRootBlock(tokens);
  } else {
    // Update variables in place
    if (tokens.primary) css = setVarInCss(css, '--primary', tokens.primary);
    if (tokens.primaryHover) css = setVarInCss(css, '--primary-hover', tokens.primaryHover);
    if (tokens.primarySoft) css = setVarInCss(css, '--primary-soft', tokens.primarySoft);

    if (tokens.secondary) css = setVarInCss(css, '--secondary', tokens.secondary);
    if (tokens.secondaryHover) css = setVarInCss(css, '--secondary-hover', tokens.secondaryHover);
    if (tokens.secondarySoft) css = setVarInCss(css, '--secondary-soft', tokens.secondarySoft);

    if (tokens.dark) css = setVarInCss(css, '--dark', tokens.dark);
    if (tokens.light) css = setVarInCss(css, '--light', tokens.light);

    if (tokens.fontSans) css = setVarInCss(css, '--font-sans', tokens.fontSans);
    if (tokens.fontSerif) css = setVarInCss(css, '--font-serif', tokens.fontSerif);
  }

  // Handle fontUrl @import if specified
  if (tokens.fontUrl && tokens.fontUrl.trim()) {
    const importStatement = `@import url('${tokens.fontUrl.trim()}');\n`;
    if (!css.includes(tokens.fontUrl.trim())) {
      // Remove any existing Google Font @import
      css = css.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^'"]+['"]\);\s*/gi, '');
      css = `${importStatement}${css.trim()}`;
    }
  }

  return css.trim();
}
