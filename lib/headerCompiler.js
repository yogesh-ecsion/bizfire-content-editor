import Handlebars from 'handlebars/dist/handlebars.js';

/**
 * Handlebars template for the Bizfire Site Header & Navigation.
 * Self-contained HTML and scoped CSS, mobile responsive, with dropdown navigation,
 * branding, contact quick-actions, and CTA buttons.
 */
const HEADER_TEMPLATE = `
<!-- Bizfire Site Header Component -->
<header class="bizfire-site-header{{#if settings.isSticky}} is-sticky{{/if}}{{#if layoutVariation}} layout-{{layoutVariation}}{{/if}}" data-component="site-header">
  {{#if settings.showTopBar}}
  <div class="bizfire-header-topbar">
    <div class="bizfire-header-container topbar-container">
      <div class="topbar-left">
        {{#if settings.topBarText}}
        <span class="topbar-notice">{{settings.topBarText}}</span>
        {{/if}}
      </div>
      <div class="topbar-right">
        {{#if contact.showPhone}}
        {{#if contact.phone}}
        <a href="tel:{{contact.phone}}" class="topbar-phone">
          <span class="phone-icon">&#9742;</span>
          {{#if contact.phoneLabel}}<span class="phone-label">{{contact.phoneLabel}}:</span>{{/if}}
          <strong>{{contact.phone}}</strong>
        </a>
        {{/if}}
        {{/if}}
      </div>
    </div>
  </div>
  {{/if}}

  <div class="bizfire-header-main">
    <div class="bizfire-header-container main-container">
      <!-- Brand / Logo -->
      <div class="bizfire-header-brand">
        <a href="/" class="brand-link" title="{{branding.siteTitle}}">
          {{#if branding.logoUrl}}
          <img src="{{branding.logoUrl}}" alt="{{branding.siteTitle}}" class="brand-logo" style="max-width: {{#if branding.logoWidth}}{{branding.logoWidth}}px{{else}}180px{{/if}};" />
          {{else}}
          <span class="brand-text">{{branding.siteTitle}}</span>
          {{/if}}
          {{#if branding.tagline}}
          <span class="brand-tagline">{{branding.tagline}}</span>
          {{/if}}
        </a>
      </div>

      <!-- Desktop Navigation Menu -->
      <nav class="bizfire-header-nav" aria-label="Primary Navigation">
        <ul class="nav-list">
          {{#each items}}
          {{#if children.length}}
          <li class="nav-item has-dropdown">
            <a href="{{url}}" class="nav-link dropdown-toggle" target="{{#if target}}{{target}}{{else}}_self{{/if}}">
              <span>{{label}}</span>
              <span class="dropdown-caret">&#9662;</span>
            </a>
            <ul class="dropdown-menu">
              {{#each children}}
              <li class="dropdown-item">
                <a href="{{url}}" class="dropdown-link" target="{{#if target}}{{target}}{{else}}_self{{/if}}">{{label}}</a>
              </li>
              {{/each}}
            </ul>
          </li>
          {{else}}
          <li class="nav-item">
            <a href="{{url}}" class="nav-link" target="{{#if target}}{{target}}{{else}}_self{{/if}}">{{label}}</a>
          </li>
          {{/if}}
          {{/each}}
        </ul>
      </nav>

      <!-- Action Buttons & Quick Contact -->
      <div class="bizfire-header-actions">
        {{#if contact.showPhone}}
        {{#if contact.phone}}
        <a href="tel:{{contact.phone}}" class="action-phone-btn" title="Call Us">
          <span class="phone-icon">&#128222;</span>
          <span class="phone-text">{{contact.phone}}</span>
        </a>
        {{/if}}
        {{/if}}

        {{#if cta.showCta}}
        {{#if cta.text}}
        <a href="{{#if cta.url}}{{cta.url}}{{else}}#{{/if}}" class="action-cta-btn">
          {{cta.text}}
        </a>
        {{/if}}
        {{/if}}

        <!-- Mobile Hamburger Button -->
        <button type="button" class="bizfire-hamburger-toggle" aria-label="Toggle Navigation" onclick="(function(btn){var h=btn.closest('.bizfire-site-header');if(h)h.classList.toggle('mobile-menu-active');})(this)">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile Drawer Menu -->
  <div class="bizfire-mobile-drawer">
    <div class="mobile-drawer-inner">
      <ul class="mobile-nav-list">
        {{#each items}}
        <li class="mobile-nav-item">
          <a href="{{url}}" class="mobile-nav-link" target="{{#if target}}{{target}}{{else}}_self{{/if}}">{{label}}</a>
          {{#if children.length}}
          <ul class="mobile-sub-list">
            {{#each children}}
            <li class="mobile-sub-item">
              <a href="{{url}}" class="mobile-sub-link" target="{{#if target}}{{target}}{{else}}_self{{/if}}">{{label}}</a>
            </li>
            {{/each}}
          </ul>
          {{/if}}
        </li>
        {{/each}}
      </ul>

      <div class="mobile-drawer-actions">
        {{#if contact.showPhone}}
        {{#if contact.phone}}
        <a href="tel:{{contact.phone}}" class="mobile-phone-btn">
          <span>&#128222; Call: {{contact.phone}}</span>
        </a>
        {{/if}}
        {{/if}}

        {{#if cta.showCta}}
        {{#if cta.text}}
        <a href="{{#if cta.url}}{{cta.url}}{{else}}#{{/if}}" class="mobile-cta-btn">
          {{cta.text}}
        </a>
        {{/if}}
        {{/if}}
      </div>
    </div>
  </div>
</header>
`;

/**
 * Scoped CSS for the Bizfire Site Header.
 * Prevents styles from bleeding into the rest of the page.
 */
const HEADER_STYLES = `
<style id="bizfire-site-header-css">
/* Bizfire Scoped Site Header Styles */
/* Suppress native theme header, mobile navigation, and entry headers strictly on Bizfire custom pages */
body.has-bizfire-custom-header header:not(.bizfire-site-header):not(.ws-topbar),
body.has-bizfire-custom-header #masthead,
body.has-bizfire-custom-header .site-header,
body.has-bizfire-custom-header #mobileMenu,
body.has-bizfire-custom-header .mobile-menu,
body.has-bizfire-custom-header .entry-header,
body.has-bizfire-custom-header .ast-mobile-header-wrap,
body.has-bizfire-custom-header #ast-mobile-header,
body.wp-singular:has(.bizfire-site-header) header:not(.bizfire-site-header):not(.ws-topbar),
body.wp-singular:has(.bizfire-site-header) #masthead,
body.wp-singular:has(.bizfire-site-header) .site-header,
body.wp-singular:has(.bizfire-site-header) #mobileMenu,
body.wp-singular:has(.bizfire-site-header) .mobile-menu,
body.wp-singular:has(.bizfire-site-header) .entry-header,
body.wp-singular:has(.bizfire-site-header) .ast-mobile-header-wrap,
body.wp-singular:has(.bizfire-site-header) #ast-mobile-header {
  display: none !important;
}

body.has-bizfire-custom-header #primary,
body.has-bizfire-custom-header .site-content,
body.has-bizfire-custom-header article,
body.has-bizfire-custom-header .ast-container,
body.wp-singular:has(.bizfire-site-header) #primary,
body.wp-singular:has(.bizfire-site-header) .site-content,
body.wp-singular:has(.bizfire-site-header) article,
body.wp-singular:has(.bizfire-site-header) .ast-container {
  margin-top: 0 !important;
  padding-top: 0 !important;
  max-width: 100% !important;
  width: 100% !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.bizfire-site-header {
  width: 100%;
  position: relative;
  background-color: #ffffff;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e2e8f0;
  z-index: 9999;
}

.bizfire-site-header.is-sticky {
  position: sticky;
  top: 0;
}

.bizfire-site-header * {
  box-sizing: border-box;
}

.bizfire-site-header .bizfire-header-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Top bar */
.bizfire-site-header .bizfire-header-topbar {
  background-color: #0f172a;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.bizfire-site-header .topbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  padding-bottom: 6px;
}

.bizfire-site-header .topbar-phone {
  color: #f8fafc;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.15s ease;
}

.bizfire-site-header .topbar-phone:hover {
  color: #38bdf8;
}

/* Main header */
.bizfire-site-header .bizfire-header-main {
  background: #ffffff;
}

.bizfire-site-header .main-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  gap: 20px;
}

/* Brand */
.bizfire-site-header .bizfire-header-brand {
  flex-shrink: 0;
}

.bizfire-site-header .brand-link {
  display: inline-flex;
  flex-direction: column;
  text-decoration: none;
  color: #0f172a;
}

.bizfire-site-header .brand-logo {
  display: block;
  height: auto;
  object-fit: contain;
}

.bizfire-site-header .brand-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
  line-height: 1.2;
}

.bizfire-site-header .brand-tagline {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-top: 2px;
}

/* Navigation Menu */
.bizfire-site-header .bizfire-header-nav {
  display: flex;
  align-items: center;
}

.bizfire-site-header .nav-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 6px;
}

.bizfire-site-header .nav-item {
  position: relative;
}

.bizfire-site-header .nav-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  color: #334155;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.bizfire-site-header .nav-link:hover {
  color: #0284c7;
  background-color: #f0f9ff;
}

.bizfire-site-header .dropdown-caret {
  font-size: 11px;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

/* Dropdown Menu */
.bizfire-site-header .dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  list-style: none;
  margin: 0;
  padding: 8px 0;
  z-index: 1000;
}

.bizfire-site-header .nav-item.has-dropdown:hover .dropdown-menu,
.bizfire-site-header .nav-item.has-dropdown:focus-within .dropdown-menu {
  display: block;
}

.bizfire-site-header .dropdown-link {
  display: block;
  padding: 8px 18px;
  color: #334155;
  font-size: 14px;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.bizfire-site-header .dropdown-link:hover {
  background-color: #f0f9ff;
  color: #0284c7;
}

/* Action Area */
.bizfire-site-header .bizfire-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.bizfire-site-header .action-phone-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #0f172a;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  transition: all 0.15s ease;
}

.bizfire-site-header .action-phone-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0284c7;
}

.bizfire-site-header .action-cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 18px;
  background: #0284c7;
  color: #ffffff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
}

.bizfire-site-header .action-cta-btn:hover {
  background: #0369a1;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Hamburger Toggle Button */
.bizfire-site-header .bizfire-hamburger-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 38px;
  height: 38px;
  padding: 8px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  gap: 5px;
}

.bizfire-site-header .bizfire-hamburger-toggle .bar {
  display: block;
  width: 20px;
  height: 2px;
  background-color: #334155;
  border-radius: 2px;
  transition: all 0.2s ease;
}

/* Mobile Drawer */
.bizfire-site-header .bizfire-mobile-drawer {
  display: none;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 16px 20px;
}

.bizfire-site-header.mobile-menu-active .bizfire-mobile-drawer {
  display: block;
}

.bizfire-site-header .mobile-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.bizfire-site-header .mobile-nav-item {
  border-bottom: 1px solid #f1f5f9;
  padding: 10px 0;
}

.bizfire-site-header .mobile-nav-link {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  text-decoration: none;
  display: block;
}

.bizfire-site-header .mobile-sub-list {
  list-style: none;
  padding-left: 16px;
  margin: 8px 0 0;
}

.bizfire-site-header .mobile-sub-item {
  padding: 6px 0;
}

.bizfire-site-header .mobile-sub-link {
  font-size: 14px;
  color: #475569;
  text-decoration: none;
}

.bizfire-site-header .mobile-drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.bizfire-site-header .mobile-phone-btn,
.bizfire-site-header .mobile-cta-btn {
  display: block;
  text-align: center;
  padding: 11px 16px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.bizfire-site-header .mobile-phone-btn {
  background: #f8fafc;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

.bizfire-site-header .mobile-cta-btn {
  background: #0284c7;
  color: #ffffff;
}

/* Responsive Media Queries */
@media (max-width: 991px) {
  .bizfire-site-header .bizfire-header-nav {
    display: none;
  }

  .bizfire-site-header .action-phone-btn,
  .bizfire-site-header .action-cta-btn {
    display: none;
  }

  .bizfire-site-header .bizfire-hamburger-toggle {
    display: flex;
  }

  .bizfire-site-header .topbar-notice {
    font-size: 12px;
  }
}

/* ── Layout Variations ── */
.bizfire-site-header.layout-centered-nav .main-container {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding-top: 14px;
  padding-bottom: 14px;
}
.bizfire-site-header.layout-centered-nav .bizfire-header-brand {
  margin: 0 auto;
}
.bizfire-site-header.layout-centered-nav .bizfire-header-nav .nav-list {
  justify-content: center;
}

.bizfire-site-header.layout-minimal-inline .bizfire-header-topbar {
  display: none !important;
}
.bizfire-site-header.layout-minimal-inline .bizfire-header-main {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
</style>
`;

/**
 * Compiles the header configuration JSON into self-contained HTML and CSS.
 *
 * @param {object} headerData Header configuration object
 * @returns {{ html: string, css: string, compiledHeader: string }}
 */
export function compileHeader(headerData = {}) {
  // Ensure default structures
  const context = {
    branding: {
      siteTitle: headerData.branding?.siteTitle || 'Company Name',
      logoUrl: headerData.branding?.logoUrl || '',
      logoWidth: headerData.branding?.logoWidth || 180,
      tagline: headerData.branding?.tagline || '',
    },
    contact: {
      phone: headerData.contact?.phone || '',
      phoneLabel: headerData.contact?.phoneLabel || 'Call Us',
      showPhone: headerData.contact?.showPhone !== false,
    },
    cta: {
      text: headerData.cta?.text || 'Get in Touch',
      url: headerData.cta?.url || '/contact/',
      showCta: headerData.cta?.showCta !== false,
    },
    settings: {
      isSticky: headerData.settings?.isSticky !== false,
      showTopBar: headerData.settings?.showTopBar !== false,
      topBarText: headerData.settings?.topBarText || 'Quality Service You Can Trust',
    },
    layoutVariation: headerData.layoutVariation || 'split-topbar',
    items: Array.isArray(headerData.items) ? headerData.items : [],
  };

  const compiledTemplate = Handlebars.compile(HEADER_TEMPLATE);
  const html = compiledTemplate(context);

  return {
    html: html.trim(),
    css: HEADER_STYLES.trim(),
    compiledHeader: `${HEADER_STYLES}\n${html}`.trim(),
  };
}
