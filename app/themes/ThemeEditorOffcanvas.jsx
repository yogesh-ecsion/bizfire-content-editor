'use client';

import React, { useState, useEffect } from 'react';
import { Offcanvas, Button, Form, Spinner, Alert, Badge, Tabs, Tab, Card } from 'react-bootstrap';
import {
  stripLegacyThemeTokens,
  extractTokensFromCss,
  updateCssWithTokens,
  generateStandardRootBlock
} from '@/lib/themeTokens';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ThemeEditorOffcanvas({
  show,
  onHide,
  theme, // null for create mode, theme object for edit mode
  onSuccess
}) {
  const isClone = Boolean(theme?._isClone);
  const isEditing = Boolean(theme && theme.slug && !isClone);

  const [activeTab, setActiveTab] = useState('tokens');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isMaster, setIsMaster] = useState(false);

  // Core Brand Colors (:root variables)
  const [primaryColor, setPrimaryColor] = useState('#0F766E');
  const [primaryHover, setPrimaryHover] = useState('#115E59');
  const [primarySoft, setPrimarySoft] = useState('#E6F5F2');

  const [secondaryColor, setSecondaryColor] = useState('#64748B');
  const [secondaryHover, setSecondaryHover] = useState('#475569');
  const [secondarySoft, setSecondarySoft] = useState('#F1F5F9');

  const [darkColor, setDarkColor] = useState('#18313B');
  const [lightColor, setLightColor] = useState('#F4FAFA');

  // Typography (:root variables)
  const [fontSans, setFontSans] = useState('"DM Sans", Arial, sans-serif');
  const [fontSerif, setFontSerif] = useState('"Manrope", "Helvetica Neue", sans-serif');
  const [fontUrl, setFontUrl] = useState('');

  // Stylesheet
  const [css, setCss] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  // Helper to get current tokens object
  function getCurrentTokens(overrides = {}) {
    return {
      primary: primaryColor,
      primaryHover,
      primarySoft,
      secondary: secondaryColor,
      secondaryHover,
      secondarySoft,
      dark: darkColor,
      light: lightColor,
      fontSans,
      fontSerif,
      fontUrl,
      ...overrides
    };
  }

  // Populate state on open or change
  useEffect(() => {
    if (!show) {
      setAlertInfo(null);
      return;
    }

    if (theme) {
      setName(theme.name || '');
      if (isClone) {
        setSlug(slugify(theme.name || ''));
        setSlugManuallyEdited(false);
      } else {
        setSlug(theme.slug || '');
        setSlugManuallyEdited(true);
      }
      setIsMaster(Boolean(theme.isMaster));

      const rawCss = theme.css || '';
      const cleanCss = stripLegacyThemeTokens(rawCss);
      const parsed = extractTokensFromCss(cleanCss);

      // Prioritize tokens extracted directly from the CSS stylesheet
      const colors = theme.themeSettings?.colors || {};
      const typography = theme.themeSettings?.typography || {};

      const finalPrimary = parsed.primary || colors.primary || '#0F766E';
      setPrimaryColor(finalPrimary);
      setPrimaryHover(parsed.primaryHover || colors.primaryHover || '');
      setPrimarySoft(parsed.primarySoft || colors.primarySoft || '');

      const finalSecondary = parsed.secondary || colors.secondary || '#64748B';
      setSecondaryColor(finalSecondary);
      setSecondaryHover(parsed.secondaryHover || colors.secondaryHover || '');
      setSecondarySoft(parsed.secondarySoft || colors.secondarySoft || '');

      setDarkColor(parsed.dark || colors.dark || '#18313B');
      setLightColor(parsed.light || colors.light || '#F4FAFA');

      setFontSans(parsed.fontSans || typography.fontSans || theme.fontFamily || '"DM Sans", Arial, sans-serif');
      setFontSerif(parsed.fontSerif || typography.fontSerif || '"Manrope", "Helvetica Neue", sans-serif');
      setFontUrl(parsed.fontUrl || theme.fontUrl || '');

      setCss(cleanCss);
    } else {
      // Default new theme
      setName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setIsMaster(false);

      const defaultTokens = {
        primary: '#0F766E',
        primaryHover: '#115E59',
        primarySoft: '#E6F5F2',
        secondary: '#64748B',
        secondaryHover: '#475569',
        secondarySoft: '#F1F5F9',
        dark: '#18313B',
        light: '#F4FAFA',
        fontSans: '"DM Sans", Arial, sans-serif',
        fontSerif: '"Manrope", "Helvetica Neue", sans-serif',
        fontUrl: ''
      };

      setPrimaryColor(defaultTokens.primary);
      setPrimaryHover(defaultTokens.primaryHover);
      setPrimarySoft(defaultTokens.primarySoft);
      setSecondaryColor(defaultTokens.secondary);
      setSecondaryHover(defaultTokens.secondaryHover);
      setSecondarySoft(defaultTokens.secondarySoft);
      setDarkColor(defaultTokens.dark);
      setLightColor(defaultTokens.light);
      setFontSans(defaultTokens.fontSans);
      setFontSerif(defaultTokens.fontSerif);
      setFontUrl(defaultTokens.fontUrl);

      setCss(generateStandardRootBlock(defaultTokens));
    }
  }, [show, theme]);

  // Auto-slugify when typing name (if not manually edited)
  function handleNameChange(e) {
    const val = e.target.value;
    setName(val);
    if (!slugManuallyEdited && !isEditing) {
      setSlug(slugify(val));
    }
  }

  // Handle direct slug editing
  function handleSlugChange(e) {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setSlug(raw);
    setSlugManuallyEdited(true);
  }

  function handleSlugBlur() {
    if (slug) {
      setSlug(slugify(slug));
    }
  }

  // Synchronize CSS textarea changes back into visual tokens
  function handleCssEditorChange(e) {
    const newCss = e.target.value;
    setCss(newCss);

    // Auto-extract tokens in background so Visual tab stays updated
    const parsed = extractTokensFromCss(newCss);
    if (parsed.primary) setPrimaryColor(parsed.primary);
    if (parsed.primaryHover) setPrimaryHover(parsed.primaryHover);
    if (parsed.primarySoft) setPrimarySoft(parsed.primarySoft);
    if (parsed.secondary) setSecondaryColor(parsed.secondary);
    if (parsed.secondaryHover) setSecondaryHover(parsed.secondaryHover);
    if (parsed.secondarySoft) setSecondarySoft(parsed.secondarySoft);
    if (parsed.dark) setDarkColor(parsed.dark);
    if (parsed.light) setLightColor(parsed.light);
    if (parsed.fontSans) setFontSans(parsed.fontSans);
    if (parsed.fontSerif) setFontSerif(parsed.fontSerif);
    if (parsed.fontUrl) setFontUrl(parsed.fontUrl);
  }

  // Handle file drop / upload
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const cleanCss = stripLegacyThemeTokens(text);
      setCss(cleanCss);

      // Extract tokens from uploaded file
      const parsed = extractTokensFromCss(cleanCss);
      if (parsed.primary) setPrimaryColor(parsed.primary);
      if (parsed.primaryHover) setPrimaryHover(parsed.primaryHover);
      if (parsed.primarySoft) setPrimarySoft(parsed.primarySoft);
      if (parsed.secondary) setSecondaryColor(parsed.secondary);
      if (parsed.secondaryHover) setSecondaryHover(parsed.secondaryHover);
      if (parsed.secondarySoft) setSecondarySoft(parsed.secondarySoft);
      if (parsed.dark) setDarkColor(parsed.dark);
      if (parsed.light) setLightColor(parsed.light);
      if (parsed.fontSans) setFontSans(parsed.fontSans);
      if (parsed.fontSerif) setFontSerif(parsed.fontSerif);
      if (parsed.fontUrl) setFontUrl(parsed.fontUrl);

      if (!name && file.name) {
        const cleanName = file.name.replace(/\.css$/i, '').replace(/[-_]/g, ' ');
        setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        if (!slug) setSlug(slugify(cleanName));
      }
      setAlertInfo({ type: 'info', message: `Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB) — design tokens extracted.` });
    } catch (err) {
      setAlertInfo({ type: 'danger', message: `Failed to read file: ${err.message}` });
    }
  }

  // Token update handlers for visual tab that update CSS in-place
  function updateVisualToken(key, value) {
    if (key === 'primary') {
      setPrimaryColor(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ primary: value })));
    } else if (key === 'secondary') {
      setSecondaryColor(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ secondary: value })));
    } else if (key === 'dark') {
      setDarkColor(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ dark: value })));
    } else if (key === 'light') {
      setLightColor(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ light: value })));
    } else if (key === 'fontSans') {
      setFontSans(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ fontSans: value })));
    } else if (key === 'fontSerif') {
      setFontSerif(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ fontSerif: value })));
    } else if (key === 'fontUrl') {
      setFontUrl(value);
      setCss(prev => updateCssWithTokens(prev, getCurrentTokens({ fontUrl: value })));
    }
  }

  // Save handler
  async function handleSave() {
    if (!name.trim()) {
      setAlertInfo({ type: 'danger', message: 'Theme name is required' });
      return;
    }
    const finalSlug = slugify(slug || name);
    if (!finalSlug) {
      setAlertInfo({ type: 'danger', message: 'Valid theme slug is required' });
      return;
    }

    setIsSaving(true);
    setAlertInfo(null);

    const tokens = getCurrentTokens();
    // Strip any legacy dummy block and serialize final CSS with clean tokens
    const cleanBaseCss = stripLegacyThemeTokens(css);
    const finalCss = updateCssWithTokens(cleanBaseCss, tokens);

    const payload = {
      name: name.trim(),
      slug: finalSlug,
      fontFamily: fontSans,
      fontUrl,
      css: finalCss,
      isMaster,
      themeSettings: {
        colors: {
          primary: primaryColor,
          primaryHover,
          primarySoft,
          secondary: secondaryColor,
          secondaryHover,
          secondarySoft,
          dark: darkColor,
          light: lightColor
        },
        typography: {
          fontSans,
          fontSerif
        },
        fontFamily: fontSans
      }
    };

    try {
      const url = isEditing ? `/api/admin/themes/${finalSlug}` : '/api/admin/themes';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save theme');
      }

      setAlertInfo({ type: 'success', message: isEditing ? 'Theme updated successfully!' : 'Theme created successfully!' });

      setTimeout(() => {
        if (onSuccess) onSuccess(data.theme);
        onHide();
      }, 700);
    } catch (err) {
      setAlertInfo({ type: 'danger', message: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      style={{ width: '640px', maxWidth: '100vw' }}
    >
      {/* Dynamic Google Font preview loader if fontUrl provided */}
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}

      <Offcanvas.Header closeButton style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px 20px' }}>
        <div>
          <Offcanvas.Title style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎨</span>
            <span>{isEditing ? `Edit Theme: ${theme.name || theme.slug}` : (isClone ? `Duplicate Theme: ${name || 'New Theme'}` : 'Create New Theme')}</span>
          </Offcanvas.Title>
          <small style={{ color: '#64748b' }}>
            {isEditing ? `Slug: ${theme.slug}` : (isClone ? 'Creating a new theme from a cloned template.' : 'Define theme brand tokens (:root) or edit the stylesheet.')}
          </small>
        </div>
      </Offcanvas.Header>

      <Offcanvas.Body style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {alertInfo && (
          <Alert variant={alertInfo.type} dismissible onClose={() => setAlertInfo(null)} style={{ fontSize: '13px', padding: '10px 14px' }}>
            {alertInfo.message}
          </Alert>
        )}

        {/* Top Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Theme Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <Form.Control
              type="text"
              size="sm"
              placeholder="e.g. Modern Trades, Orange Pulse"
              value={name}
              onChange={handleNameChange}
              required
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', margin: 0 }}>
                Slug <span style={{ color: '#dc2626' }}>*</span>
              </label>
              {!isEditing && slugManuallyEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setSlug(slugify(name));
                    setSlugManuallyEdited(false);
                  }}
                  title="Re-sync slug with theme name"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: '#2563eb',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ↻ Auto from name
                </button>
              )}
            </div>
            <Form.Control
              type="text"
              size="sm"
              placeholder="e.g. orange-pulse"
              value={slug}
              disabled={isEditing}
              onChange={handleSlugChange}
              onBlur={handleSlugBlur}
              required
            />
          </div>
        </div>

        {/* Tabbed Dual-Mode Creation */}
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
          {/* Tab 1: Visual Design Tokens */}
          <Tab eventKey="tokens" title="🎨 Visual Brand Tokens">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
              {/* Color Pickers */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Brand Color Palette (:root)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '10px' }}>
                  {/* Primary Color */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Primary Brand</span>
                      <code style={{ fontSize: '11px', color: '#64748b' }}>--primary</code>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={primaryColor.startsWith('#') && primaryColor.length === 7 ? primaryColor : '#0F766E'}
                        onChange={(e) => updateVisualToken('primary', e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={primaryColor}
                        onChange={(e) => updateVisualToken('primary', e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Secondary Accent</span>
                      <code style={{ fontSize: '11px', color: '#64748b' }}>--secondary</code>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={secondaryColor.startsWith('#') && secondaryColor.length === 7 ? secondaryColor : '#64748B'}
                        onChange={(e) => updateVisualToken('secondary', e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={secondaryColor}
                        onChange={(e) => updateVisualToken('secondary', e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  {/* Dark Neutral */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dark Text / Headings</span>
                      <code style={{ fontSize: '11px', color: '#64748b' }}>--dark</code>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={darkColor.startsWith('#') && darkColor.length === 7 ? darkColor : '#18313B'}
                        onChange={(e) => updateVisualToken('dark', e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={darkColor}
                        onChange={(e) => updateVisualToken('dark', e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  {/* Light Canvas */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Light Background</span>
                      <code style={{ fontSize: '11px', color: '#64748b' }}>--light</code>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={lightColor.startsWith('#') && lightColor.length === 7 ? lightColor : '#F4FAFA'}
                        onChange={(e) => updateVisualToken('light', e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={lightColor}
                        onChange={(e) => updateVisualToken('light', e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Typography Settings (:root)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Body Font</span>
                      <code style={{ fontSize: '11px', color: '#64748b' }}>--font-sans</code>
                    </label>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder='"DM Sans", Arial, sans-serif'
                      value={fontSans}
                      onChange={(e) => updateVisualToken('fontSans', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Headings Font</span>
                      <code style={{ fontSize: '11px', color: '#64748b' }}>--font-serif</code>
                    </label>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder='"Manrope", "Helvetica Neue", sans-serif'
                      value={fontSerif}
                      onChange={(e) => updateVisualToken('fontSerif', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Google Fonts CDN URL (Optional @import)
                  </label>
                  <Form.Control
                    type="url"
                    size="sm"
                    placeholder="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap"
                    value={fontUrl}
                    onChange={(e) => updateVisualToken('fontUrl', e.target.value)}
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Theme Preview
                </span>
                <Card style={{ marginTop: '8px', border: `1px solid ${secondaryColor}33`, overflow: 'hidden' }}>
                  <div style={{ height: '6px', background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
                  <Card.Body style={{ background: lightColor, color: darkColor, fontFamily: fontSans, padding: '18px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: primaryColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      THEME TOKENS PREVIEW
                    </span>
                    <h4 style={{ fontWeight: 700, color: primaryColor, fontFamily: fontSerif, margin: '6px 0 8px 0' }}>
                      {name || 'Theme Brand Showcase'}
                    </h4>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: darkColor, margin: '0 0 16px 0', opacity: 0.9 }}>
                      This preview automatically renders using your defined brand variables (<code>--primary</code>, <code>--secondary</code>, <code>--dark</code>, <code>--light</code>) and typography (<code>--font-sans</code>, <code>--font-serif</code>).
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{
                          background: primaryColor,
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Primary Action
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          color: secondaryColor,
                          border: `1.5px solid ${secondaryColor}`,
                          padding: '8px 18px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Secondary Outline
                      </button>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </Tab>

          {/* Tab 2: Stylesheet (style.css) File Upload & Code Editor */}
          <Tab eventKey="stylesheet" title="📄 Stylesheet (style.css)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
              {/* File Upload Drop Area */}
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
                <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                  Upload style.css file
                </strong>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
                  Drop your CSS file here. Brand tokens (<code>--primary</code>, <code>--secondary</code>, etc.) will be automatically detected.
                </p>
                <Form.Control
                  type="file"
                  accept=".css"
                  size="sm"
                  onChange={handleFileUpload}
                  style={{ maxWidth: '280px', margin: '0 auto' }}
                />
              </div>

              {/* Code Editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', margin: 0 }}>
                    CSS Editor ({css.length.toLocaleString()} characters)
                  </label>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      const rootBlock = generateStandardRootBlock(getCurrentTokens());
                      setCss(prev => `${rootBlock}\n\n${prev}`);
                    }}
                    style={{ fontSize: '11px', padding: 0, textDecoration: 'none' }}
                  >
                    + Insert Standard :root Block
                  </Button>
                </div>
                <Form.Control
                  as="textarea"
                  rows={15}
                  value={css}
                  onChange={handleCssEditorChange}
                  style={{
                    fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: '1px solid #1e293b',
                    borderRadius: '6px'
                  }}
                  placeholder="/* Enter theme CSS declarations here... */"
                />
              </div>
            </div>
          </Tab>
        </Tabs>

        {/* Master Theme Toggle */}
        <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'block' }}>
              Set as System Master Baseline
            </span>
            <small style={{ fontSize: '11px', color: '#64748b' }}>
              Available as the default theme for all newly created workspaces.
            </small>
          </div>
          <Form.Check
            type="switch"
            id="master-theme-switch"
            checked={isMaster}
            onChange={(e) => setIsMaster(e.target.checked)}
          />
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <Button variant="outline-secondary" size="sm" onClick={onHide} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            {isSaving && <Spinner size="sm" animation="border" />}
            <span>{isEditing ? 'Save Changes' : 'Create Theme'}</span>
          </Button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
