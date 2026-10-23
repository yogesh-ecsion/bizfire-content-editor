'use client';

import React, { useState, useEffect } from 'react';
import { Offcanvas, Button, Form, Spinner, Alert, Badge, Tabs, Tab, Card } from 'react-bootstrap';

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

  // Visual Design Tokens
  const [primaryColor, setPrimaryColor] = useState('#A01922');
  const [secondaryColor, setSecondaryColor] = useState('#7D1118');
  const [darkColor, setDarkColor] = useState('#1E293B');
  const [lightColor, setLightColor] = useState('#F8FAFC');
  const [fontFamily, setFontFamily] = useState('Outfit, sans-serif');
  const [fontUrl, setFontUrl] = useState('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

  // Stylesheet
  const [css, setCss] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

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
      setIsMaster(false);
      setFontFamily(theme.fontFamily || 'Outfit, sans-serif');
      setFontUrl(theme.fontUrl || '');
      setCss(theme.css || '');

      const colors = theme.themeSettings?.colors || {};
      if (colors.primary) setPrimaryColor(colors.primary);
      if (colors.secondary) setSecondaryColor(colors.secondary);
      if (colors.dark) setDarkColor(colors.dark);
      if (colors.light) setLightColor(colors.light);
    } else {
      // Default new theme
      setName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setIsMaster(false);
      setPrimaryColor('#0284c7');
      setSecondaryColor('#0369a1');
      setDarkColor('#0f172a');
      setLightColor('#f8fafc');
      setFontFamily('Outfit, sans-serif');
      setFontUrl('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
      setCss(`/* ── Custom Theme Stylesheet ── */
:root {
  --theme-primary: #0284c7;
  --theme-secondary: #0369a1;
  --theme-dark: #0f172a;
  --theme-light: #f8fafc;
  --theme-font: 'Outfit', sans-serif;
}

body {
  font-family: var(--theme-font);
  color: var(--theme-dark);
  background-color: var(--theme-light);
}

.btn-theme-primary {
  background-color: var(--theme-primary);
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
}
`);
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

  // Handle direct slug editing without prematurely stripping hyphens on keystrokes
  function handleSlugChange(e) {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setSlug(raw);
    setSlugManuallyEdited(true);
  }

  // Sanitize trailing/leading hyphens on blur
  function handleSlugBlur() {
    if (slug) {
      setSlug(slugify(slug));
    }
  }

  // Handle file drop / upload
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCss(text);
      if (!name && file.name) {
        const cleanName = file.name.replace(/\.css$/i, '').replace(/[-_]/g, ' ');
        setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        if (!slug) setSlug(slugify(cleanName));
      }
      setAlertInfo({ type: 'info', message: `Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)` });
    } catch (err) {
      setAlertInfo({ type: 'danger', message: `Failed to read file: ${err.message}` });
    }
  }

  // Generate tokens block
  function generateTokensBlock() {
    return `/* ── Design Tokens ── */
:root {
  --theme-primary: ${primaryColor};
  --theme-secondary: ${secondaryColor};
  --theme-dark: ${darkColor};
  --theme-light: ${lightColor};
  --theme-font: ${fontFamily};
}`;
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

    // Merge or prepend tokens into CSS if not already present
    let finalCss = css.trim();
    const tokensBlock = generateTokensBlock();
    if (!finalCss.includes('--theme-primary')) {
      finalCss = `${tokensBlock}\n\n${finalCss}`;
    }

    const payload = {
      name: name.trim(),
      slug: finalSlug,
      fontFamily,
      fontUrl,
      css: finalCss,
      isMaster,
      themeSettings: {
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          dark: darkColor,
          light: lightColor
        },
        fontFamily
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
      style={{ width: '620px', maxWidth: '100vw' }}
    >
      <Offcanvas.Header closeButton style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px 20px' }}>
        <div>
          <Offcanvas.Title style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎨</span>
            <span>{isEditing ? `Edit Theme: ${theme.name || theme.slug}` : (isClone ? `Duplicate Theme: ${name || 'New Theme'}` : 'Create New Theme')}</span>
          </Offcanvas.Title>
          <small style={{ color: '#64748b' }}>
            {isEditing ? `Slug: ${theme.slug}` : (isClone ? 'Creating a new theme from a cloned template.' : 'Define theme design tokens or upload a custom stylesheet.')}
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
              placeholder="e.g. Modern HVAC, Theme 2"
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
              placeholder="e.g. modern-hvac"
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
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Primary Brand Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Secondary Accent Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Dark Text / Headings
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={darkColor}
                        onChange={(e) => setDarkColor(e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={darkColor}
                        onChange={(e) => setDarkColor(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Light Canvas Background
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Form.Control
                        type="color"
                        value={lightColor}
                        onChange={(e) => setLightColor(e.target.value)}
                        style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                      />
                      <Form.Control
                        type="text"
                        size="sm"
                        value={lightColor}
                        onChange={(e) => setLightColor(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Typography Settings
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Font Family CSS Rule
                    </label>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder="Outfit, sans-serif"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Google Fonts CDN URL (Optional)
                    </label>
                    <Form.Control
                      type="url"
                      size="sm"
                      placeholder="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap"
                      value={fontUrl}
                      onChange={(e) => setFontUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Token Preview
                </span>
                <Card style={{ marginTop: '8px', border: `1px solid ${secondaryColor}33`, overflow: 'hidden' }}>
                  <div style={{ height: '6px', background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
                  <Card.Body style={{ background: lightColor, color: darkColor, fontFamily, padding: '16px' }}>
                    <h5 style={{ fontWeight: 700, color: primaryColor, marginBottom: '6px' }}>
                      {name || 'Theme Preview Heading'}
                    </h5>
                    <p style={{ fontSize: '13px', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                      This card dynamically renders using the selected brand tokens ({primaryColor}, {secondaryColor}) and typography.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{
                          background: primaryColor,
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
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
                          padding: '8px 16px',
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
                  Drop a CSS file here or click to browse from your computer.
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
                    onClick={() => setCss(`${generateTokensBlock()}\n\n${css}`)}
                    style={{ fontSize: '11px', padding: 0, textDecoration: 'none' }}
                  >
                    + Insert Tokens Block
                  </Button>
                </div>
                <Form.Control
                  as="textarea"
                  rows={14}
                  value={css}
                  onChange={(e) => setCss(e.target.value)}
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
