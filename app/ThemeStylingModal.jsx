'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge, Tabs, Tab, Card } from 'react-bootstrap';

export default function ThemeStylingModal({
  show,
  onHide,
  workspace,
  themeBundle,
  onSuccess
}) {
  const workspaceId = workspace?.workspaceId;

  // Active edit mode: 'workspace' (tenant override) vs 'master' (global baseline)
  const [editMode, setEditMode] = useState('workspace');
  const [activeTab, setActiveTab] = useState('tokens');

  // Theme Data State
  const [masterTheme, setMasterTheme] = useState(null);
  const [primaryColor, setPrimaryColor] = useState('#A01922');
  const [secondaryColor, setSecondaryColor] = useState('#7D1118');
  const [darkColor, setDarkColor] = useState('#1E293B');
  const [lightColor, setLightColor] = useState('#F8FAFC');
  const [fontFamily, setFontFamily] = useState('Outfit, sans-serif');
  const [fontUrl, setFontUrl] = useState('');
  const [masterCss, setMasterCss] = useState('');
  const [customCss, setCustomCss] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingWp, setIsSyncingWp] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  // 1. Fetch live theme & custom CSS on modal open
  useEffect(() => {
    if (!show) {
      setAlertInfo(null);
      return;
    }

    async function fetchThemeData() {
      setIsLoading(true);
      setAlertInfo(null);
      try {
        const res = await fetch(`/api/admin/theme?workspaceId=${workspaceId || ''}`);
        const data = await res.json();
        if (data.success && data.masterTheme) {
          setMasterTheme(data.masterTheme);
          setMasterCss(data.masterTheme.css || '');
          setFontFamily(data.masterTheme.fontFamily || 'Outfit, sans-serif');
          setFontUrl(data.masterTheme.fontUrl || '');

          // Parse colors from themeSettings if available
          const colors = data.masterTheme.themeSettings?.colors || {};
          if (colors.primary) setPrimaryColor(colors.primary);
          if (colors.secondary) setSecondaryColor(colors.secondary);
          if (colors.dark) setDarkColor(colors.dark);
          if (colors.light) setLightColor(colors.light);

          // Workspace custom CSS
          setCustomCss(data.workspaceStyles?.customCss || '');
        }
      } catch (err) {
        console.warn('Could not fetch theme metadata:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchThemeData();
  }, [show, workspaceId]);

  // Handle CSS file upload
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (editMode === 'workspace') {
        setCustomCss(text);
      } else {
        setMasterCss(text);
      }
      setAlertInfo({ type: 'info', message: `Imported styles from ${file.name}` });
    } catch (err) {
      setAlertInfo({ type: 'danger', message: `Failed to read file: ${err.message}` });
    }
  }

  // 2. Save changes (Workspace or Master)
  async function handleSave(syncWpAfter = false) {
    setIsSaving(true);
    setAlertInfo(null);

    // Compute generated :root custom CSS variables
    const generatedTokensCss = `/* ── Auto-generated Design Tokens ── */
:root {
  --theme-primary: ${primaryColor};
  --theme-secondary: ${secondaryColor};
  --theme-dark: ${darkColor};
  --theme-light: ${lightColor};
  --theme-font: ${fontFamily};
}`;

    const effectiveCustomCss = editMode === 'workspace'
      ? `${generatedTokensCss}\n\n${customCss.replace(/\/\* ── Auto-generated Design Tokens ── \*\/[\s\S]*?:root\s*\{[\s\S]*?\}\s*/, '').trim()}`
      : customCss;

    try {
      const payload = {
        workspaceId,
        mode: editMode,
        themeCss: masterCss,
        customCss: effectiveCustomCss,
        fontFamily,
        fontUrl,
        themeSettings: {
          ...(masterTheme?.themeSettings || {}),
          colors: {
            primary: primaryColor,
            secondary: secondaryColor,
            dark: darkColor,
            light: lightColor
          }
        }
      };

      const res = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save theme settings');
      }

      setAlertInfo({
        type: 'success',
        message: editMode === 'workspace'
          ? 'Workspace styling overrides saved successfully!'
          : 'Master Theme baseline updated successfully across all workspaces!'
      });

      if (syncWpAfter) {
        await handleSyncToWordPress();
      }

      if (onSuccess) {
        onSuccess({
          themeCss: masterCss,
          customCss: effectiveCustomCss,
          fontFamily,
          fontUrl,
          themeSettings: payload.themeSettings
        });
      }
    } catch (err) {
      console.error('Save failed:', err);
      setAlertInfo({ type: 'danger', message: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  // 3. Sync global Theme CSS to WordPress REST API
  async function handleSyncToWordPress() {
    setIsSyncingWp(true);
    try {
      const res = await fetch('/api/admin/theme/sync-wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync theme CSS to WordPress');
      }

      setAlertInfo({
        type: 'success',
        message: `Global Theme CSS synced to WordPress (${data.wpSiteUrl})! Enqueued at priority 998.`
      });
    } catch (err) {
      console.error('Sync failed:', err);
      setAlertInfo({ type: 'danger', message: `WordPress sync failed: ${err.message}` });
    } finally {
      setIsSyncingWp(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <Modal.Title style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🎨 Theme & Global Styling</span>
          <Badge bg="primary" style={{ fontSize: '12px', fontWeight: 500 }}>
            {masterTheme?.name || 'Trades Modern'}
          </Badge>
          {workspace?.clientName && (
            <Badge bg="light" text="dark" style={{ border: '1px solid #cbd5e1', fontSize: '12px' }}>
              {workspace.clientName}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '24px', maxHeight: '78vh', overflowY: 'auto' }}>
        {/* Scope Mode Selector Banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e3a8a' }}>
                Styling Target Scope
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                {editMode === 'workspace'
                  ? `Customizing for "${workspace?.clientName || 'Current Workspace'}" alone. Master theme baseline remains protected.`
                  : 'Editing Master Theme Baseline. Changes will propagate to all workspaces using this theme.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="sm"
                variant={editMode === 'workspace' ? 'primary' : 'outline-primary'}
                onClick={() => setEditMode('workspace')}
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                Workspace Customization
              </Button>
              <Button
                size="sm"
                variant={editMode === 'master' ? 'danger' : 'outline-danger'}
                onClick={() => setEditMode('master')}
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                Master Baseline (Global)
              </Button>
            </div>
          </div>
        </div>

        {alertInfo && (
          <Alert variant={alertInfo.type} dismissible onClose={() => setAlertInfo(null)}>
            {alertInfo.message}
          </Alert>
        )}

        <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k || 'tokens')} className="mb-3">
          {/* Tab 1: Design Tokens */}
          <Tab eventKey="tokens" title="🎨 Brand Tokens & Colors">
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              {/* Controls */}
              <div>
                <h6 style={{ fontWeight: 600, marginBottom: '14px', color: '#1e293b' }}>
                  Brand Color Palette (:root tokens)
                </h6>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Primary Brand Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => setPrimaryColor(e.target.value)}
                        style={{ width: '38px', height: '36px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                      />
                      <Form.Control
                        size="sm"
                        value={primaryColor}
                        onChange={e => setPrimaryColor(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Secondary / Accent Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={e => setSecondaryColor(e.target.value)}
                        style={{ width: '38px', height: '36px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                      />
                      <Form.Control
                        size="sm"
                        value={secondaryColor}
                        onChange={e => setSecondaryColor(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Dark Text / Background
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={darkColor}
                        onChange={e => setDarkColor(e.target.value)}
                        style={{ width: '38px', height: '36px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                      />
                      <Form.Control
                        size="sm"
                        value={darkColor}
                        onChange={e => setDarkColor(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Light Section Background
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={lightColor}
                        onChange={e => setLightColor(e.target.value)}
                        style={{ width: '38px', height: '36px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                      />
                      <Form.Control
                        size="sm"
                        value={lightColor}
                        onChange={e => setLightColor(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>

                <h6 style={{ fontWeight: 600, marginBottom: '14px', color: '#1e293b' }}>
                  Typography & Fonts
                </h6>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    Font Family CSS Value
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    placeholder="e.g. Outfit, sans-serif or Inter, sans-serif"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    Google Font CDN URL
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    value={fontUrl}
                    onChange={e => setFontUrl(e.target.value)}
                    placeholder="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap"
                  />
                </Form.Group>
              </div>

              {/* Live Preview Card */}
              <div>
                <h6 style={{ fontWeight: 600, marginBottom: '14px', color: '#1e293b' }}>
                  Live Typography & Button Preview
                </h6>

                <Card style={{ padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: lightColor, fontFamily }}>
                  {fontUrl && <link rel="stylesheet" href={fontUrl} />}
                  <h3 style={{ color: darkColor, fontWeight: 700, margin: '0 0 8px 0', fontSize: '24px' }}>
                    Reliable Heating & Plumbing
                  </h3>
                  <p style={{ color: darkColor, opacity: 0.85, fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
                    Experience comfort that runs without a second thought. Licensed technicians ready 24/7.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      style={{
                        backgroundColor: primaryColor,
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Schedule Service
                    </button>
                    <button
                      type="button"
                      style={{
                        backgroundColor: 'transparent',
                        color: secondaryColor,
                        border: `2px solid ${secondaryColor}`,
                        padding: '6px 14px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      (609) 555-0100
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          </Tab>

          {/* Tab 2: Theme Stylesheet (style.css) */}
          <Tab eventKey="stylesheet" title="📄 Theme Stylesheet (style.css)">
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                {editMode === 'workspace'
                  ? 'Workspace-specific custom CSS overrides cascading on top of Master Theme'
                  : 'Master Theme stylesheet applied across all standard workspaces'}
              </span>

              <div>
                <input
                  type="file"
                  id="theme-css-upload"
                  style={{ display: 'none' }}
                  accept=".css"
                  onChange={handleFileUpload}
                />
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => document.getElementById('theme-css-upload')?.click()}
                >
                  Upload style.css
                </Button>
              </div>
            </div>

            <Form.Control
              as="textarea"
              rows={14}
              value={editMode === 'workspace' ? customCss : masterCss}
              onChange={e => editMode === 'workspace' ? setCustomCss(e.target.value) : setMasterCss(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                background: '#0f172a',
                color: '#f8fafc',
                padding: '14px',
                borderRadius: '6px'
              }}
              placeholder={editMode === 'workspace' ? '/* Enter client-specific CSS overrides here... */' : '/* Master theme CSS... */'}
            />
          </Tab>

          {/* Tab 3: Base Framework (bootstrap.css) */}
          <Tab eventKey="base" title="📐 Base Framework (bootstrap.css)">
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h6 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                Base Grid Framework: Bootstrap 5.3+
              </h6>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Base framework CSS is loaded globally on every page via WordPress core and inside the editor. It handles the 12-column responsive grid (<code>col-12</code>, <code>col-lg-6</code>), flexbox alignment, and layout containers.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: '#e2e8f0', padding: '20px', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                .col-lg-4 (33.3%)
              </div>
              <div style={{ background: '#e2e8f0', padding: '20px', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                .col-lg-4 (33.3%)
              </div>
              <div style={{ background: '#e2e8f0', padding: '20px', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}>
                .col-lg-4 (33.3%)
              </div>
            </div>
          </Tab>

          {/* Tab 4: WordPress Global Sync */}
          <Tab eventKey="sync" title="🌐 WordPress Global Sync">
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
              <h6 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Global WordPress Stylesheet Delivery
              </h6>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                Pushes the combined Theme CSS (Master Theme + Workspace Overrides) directly to WordPress via the <code>/save-theme-css</code> REST endpoint. Injected on <code>wp_head</code> at priority 998 site-wide.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Target WordPress Site:</span>
                <code style={{ fontSize: '13px', color: '#2563eb' }}>{workspace?.wpSiteUrl || 'https://bizfireseo.staging1a.com'}</code>
              </div>

              <Button
                variant="primary"
                onClick={handleSyncToWordPress}
                disabled={isSyncingWp || isSaving}
              >
                {isSyncingWp ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Syncing Theme CSS to WordPress...
                  </>
                ) : (
                  'Sync Global Theme CSS to WordPress'
                )}
              </Button>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Mode: <b>{editMode === 'workspace' ? 'Workspace Customization' : 'Master Theme Baseline'}</b>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={onHide} disabled={isSaving || isSyncingWp}>
            Close
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => handleSave(false)}
            disabled={isSaving || isSyncingWp}
          >
            {isSaving ? <Spinner animation="border" size="sm" /> : 'Save Styling'}
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(true)}
            disabled={isSaving || isSyncingWp}
          >
            Save & Sync to WordPress
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
