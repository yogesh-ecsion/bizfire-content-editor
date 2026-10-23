'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Badge, Spinner, Alert, Tabs, Tab, Form } from 'react-bootstrap';
import ThemeEditorOffcanvas from './ThemeEditorOffcanvas';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ThemesManagementPage() {
  const [activeMainTab, setActiveMainTab] = useState('catalog');

  // Themes state
  const [themes, setThemes] = useState([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [themesError, setThemesError] = useState(null);

  // Offcanvas state
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);

  // Baseline CSS state
  const [baselineMeta, setBaselineMeta] = useState(null);
  const [selectedTargetSite, setSelectedTargetSite] = useState(null);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(true);
  const [isUploadingBaseline, setIsUploadingBaseline] = useState(false);
  const [isSyncingBaseline, setIsSyncingBaseline] = useState(false);
  const [baselineAlert, setBaselineAlert] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Themes
  async function fetchThemes() {
    setIsLoadingThemes(true);
    setThemesError(null);
    try {
      const res = await fetch('/api/admin/themes');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load themes');
      }
      setThemes(data.themes || []);
    } catch (err) {
      setThemesError(err.message);
    } finally {
      setIsLoadingThemes(false);
    }
  }

  // 2. Fetch Baseline CSS Metadata
  async function fetchBaselineMeta() {
    setIsLoadingBaseline(true);
    try {
      const res = await fetch('/api/admin/baseline');
      const data = await res.json();
      if (data.success) {
        setBaselineMeta(data);
        if (data.targetSites && data.targetSites.length > 0) {
          setSelectedTargetSite(prev => prev || data.targetSites[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch baseline CSS metadata:', err);
    } finally {
      setIsLoadingBaseline(false);
    }
  }

  useEffect(() => {
    fetchThemes();
    fetchBaselineMeta();
  }, []);

  // Handle Baseline File Upload
  async function handleBaselineUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBaseline(true);
    setBaselineAlert(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/baseline', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload baseline CSS');
      }
      setBaselineAlert({
        type: 'success',
        message: `Global baseline CSS (${file.name}, ${(file.size / 1024).toFixed(1)} KB) successfully saved to database (themes table with identifier 'global-baseline') and synchronized locally.`
      });
      fetchBaselineMeta();
    } catch (err) {
      setBaselineAlert({ type: 'danger', message: err.message });
    } finally {
      setIsUploadingBaseline(false);
    }
  }

  // Handle Sync Baseline to WordPress
  async function handleSyncBaselineToWp() {
    setIsSyncingBaseline(true);
    setBaselineAlert(null);
    try {
      const target = selectedTargetSite || baselineMeta?.targetSites?.[0] || {};
      const payload = {
        workspaceId: target.workspaceId || '',
        siteUrl: target.siteUrl || '',
        name: target.name || ''
      };

      const res = await fetch('/api/admin/baseline/sync-wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync baseline CSS to WordPress');
      }
      setBaselineAlert({
        type: 'success',
        message: data.message || `Global baseline CSS successfully pushed and enqueued on ${target.siteUrl || 'WordPress'}!`
      });
    } catch (err) {
      setBaselineAlert({ type: 'danger', message: err.message });
    } finally {
      setIsSyncingBaseline(false);
    }
  }

  // Handle Delete Theme
  async function handleDeleteTheme(slug, name) {
    if (!confirm(`Are you sure you want to delete the theme "${name || slug}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/themes/${slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete theme');
      }
      fetchThemes();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  }

  // Handle Clone Theme
  function handleCloneTheme(t) {
    const cloneName = `${t.name || t.slug || 'Theme'} Copy`;
    setSelectedTheme({
      ...t,
      _isClone: true,
      name: cloneName,
      slug: slugify(cloneName),
      isMaster: false
    });
    setShowDrawer(true);
  }

  const filteredThemes = themes.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (t.name && t.name.toLowerCase().includes(q)) || (t.slug && t.slug.toLowerCase().includes(q));
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                background: '#f1f5f9',
                padding: '6px 12px',
                borderRadius: '6px'
              }}
            >
              ← Back to Dashboard
            </Link>
            <div style={{ height: '24px', width: '1px', background: '#cbd5e1' }} />
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎨</span>
                <span>Themes & Styling Center</span>
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Create, customize, and manage modular stylesheets across all client workspaces.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setActiveMainTab('baseline')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
            >
              <span>📐</span>
              <span>Global Baseline CSS</span>
              {baselineMeta && (
                <Badge bg="secondary" style={{ fontSize: '11px', fontWeight: 500 }}>
                  {(baselineMeta.sizeBytes / 1024).toFixed(0)} KB
                </Badge>
              )}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedTheme(null);
                setShowDrawer(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, padding: '7px 16px' }}
            >
              <span>+</span>
              <span>Create New Theme</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1380px', margin: '0 auto', padding: '24px' }}>
        <Tabs
          activeKey={activeMainTab}
          onSelect={(k) => setActiveMainTab(k)}
          className="mb-4"
          style={{ borderBottom: '2px solid #e2e8f0', fontSize: '14px', fontWeight: 600 }}
        >
          <Tab eventKey="catalog" title={`🎨 Theme Catalog (${themes.length})`} />
          <Tab eventKey="baseline" title="📐 Global Baseline (bootstrap.css)" />
        </Tabs>

        {/* VIEW 1: THEMES CATALOG */}
        {activeMainTab === 'catalog' && (
          <div>
            {/* Toolbar: Search & Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ width: '320px', maxWidth: '100%' }}>
                <Form.Control
                  type="search"
                  placeholder="Search themes by name or slug..."
                  size="sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Showing <strong>{filteredThemes.length}</strong> of <strong>{themes.length}</strong> themes
              </div>
            </div>

            {themesError && (
              <Alert variant="danger" style={{ marginBottom: '20px' }}>
                Failed to load themes: {themesError}
              </Alert>
            )}

            {isLoadingThemes ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Spinner animation="border" variant="primary" />
                <p style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>Loading themes catalog...</p>
              </div>
            ) : filteredThemes.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎨</div>
                <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>No themes found</h4>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '0 auto 20px auto' }}>
                  {searchQuery ? `No themes matched "${searchQuery}".` : 'Get started by creating your first modular theme.'}
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedTheme(null);
                    setShowDrawer(true);
                  }}
                  style={{ fontWeight: 600 }}
                >
                  + Create First Theme
                </Button>
              </div>
            ) : (
              /* Themes Grid */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                {filteredThemes.map((t) => {
                  const colors = t.themeSettings?.colors || {};
                  const primary = colors.primary || '#A01922';
                  const secondary = colors.secondary || '#7D1118';
                  const dark = colors.dark || '#1E293B';
                  const light = colors.light || '#F8FAFC';

                  return (
                    <Card
                      key={t.slug}
                      style={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Color Accent Bar */}
                      <div style={{ height: '8px', background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

                      <Card.Body style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 2px 0', color: '#0f172a' }}>
                              {t.name || t.slug}
                            </h3>
                            <code style={{ fontSize: '12px', color: '#64748b' }}>{t.slug}</code>
                          </div>
                          {t.isMaster && (
                            <Badge bg="primary" style={{ fontSize: '11px', padding: '5px 8px', fontWeight: 600 }}>
                              ★ Master Baseline
                            </Badge>
                          )}
                        </div>

                        {/* Visual Palette Preview */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '14px 0 16px 0' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Palette:</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <div title={`Primary: ${primary}`} style={{ width: '22px', height: '22px', borderRadius: '50%', background: primary, border: '1px solid rgba(0,0,0,0.1)' }} />
                            <div title={`Secondary: ${secondary}`} style={{ width: '22px', height: '22px', borderRadius: '50%', background: secondary, border: '1px solid rgba(0,0,0,0.1)' }} />
                            <div title={`Dark: ${dark}`} style={{ width: '22px', height: '22px', borderRadius: '50%', background: dark, border: '1px solid rgba(0,0,0,0.1)' }} />
                            <div title={`Light: ${light}`} style={{ width: '22px', height: '22px', borderRadius: '50%', background: light, border: '1px solid rgba(0,0,0,0.1)' }} />
                          </div>
                        </div>

                        {/* Metadata badges */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Font: {t.fontFamily ? t.fontFamily.split(',')[0] : 'Outfit'}
                          </span>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            CSS: {(t.cssLength / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedTheme(t);
                              setShowDrawer(true);
                            }}
                            style={{ flex: 1, fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <span>✎</span>
                            <span>Edit Theme</span>
                          </Button>

                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleCloneTheme(t)}
                            title="Duplicate this theme as a new baseline"
                            style={{ fontSize: '12px' }}
                          >
                            ⎘ Duplicate
                          </Button>

                          {!t.isMaster && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteTheme(t.slug, t.name)}
                              title="Delete theme"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              🗑
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: GLOBAL BASELINE CSS (bootstrap.css) */}
        {activeMainTab === 'baseline' && (
          <div style={{ maxWidth: '900px' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📐</span>
                    <span>Global Baseline Framework (bootstrap.css)</span>
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '640px' }}>
                    The Global Baseline CSS contains foundational grid classes (<code>container</code>, <code>row</code>, <code>col-12</code>, <code>col-lg-6</code>), flexbox alignment, and resets. It is loaded on all pages via WordPress and in the content editor.
                  </p>
                </div>
                <Badge bg="success" style={{ fontSize: '12px', padding: '6px 10px', fontWeight: 600 }}>
                  ✓ Active Framework
                </Badge>
              </div>

              {baselineAlert && (
                <Alert variant={baselineAlert.type} dismissible onClose={() => setBaselineAlert(null)} style={{ fontSize: '13px', padding: '10px 14px' }}>
                  {baselineAlert.message}
                </Alert>
              )}

              {/* Status Box */}
              {isLoadingBaseline ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <Spinner animation="border" size="sm" />
                </div>
              ) : baselineMeta ? (
                <div>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>File Name</span>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{baselineMeta.fileName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>File Size</span>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{(baselineMeta.sizeBytes / 1024).toFixed(1)} KB</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Database Storage</span>
                      <strong style={{ fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓</span>
                        <code>themes</code> (global-baseline)
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Fingerprint</span>
                      <code style={{ fontSize: '12px', color: '#2563eb' }}>{baselineMeta.hash}</code>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Upload & Sync Actions */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '7px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: 0
                    }}
                  >
                    <span>📁</span>
                    <span>{isUploadingBaseline ? 'Uploading to DB...' : 'Upload New Baseline (bootstrap.css)'}</span>
                    <input
                      type="file"
                      accept=".css"
                      onChange={handleBaselineUpload}
                      disabled={isUploadingBaseline}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {isUploadingBaseline && <Spinner size="sm" animation="border" />}
                </div>

                {/* Target WordPress Site & Sync Trigger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {baselineMeta?.targetSites && baselineMeta.targetSites.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Target Site:</span>
                      <select
                        value={selectedTargetSite?.siteUrl || ''}
                        onChange={(e) => {
                          const site = baselineMeta.targetSites.find(s => s.siteUrl === e.target.value);
                          if (site) setSelectedTargetSite(site);
                        }}
                        style={{
                          fontSize: '13px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontWeight: 500,
                          color: '#0f172a',
                          maxWidth: '280px'
                        }}
                      >
                        {baselineMeta.targetSites.map(s => (
                          <option key={s.siteUrl} value={s.siteUrl}>
                            {s.name} ({s.siteUrl})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSyncBaselineToWp}
                    disabled={isSyncingBaseline}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, padding: '7px 16px' }}
                  >
                    {isSyncingBaseline ? <Spinner size="sm" animation="border" /> : <span>🌐</span>}
                    <span>Push to WordPress</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Baseline Preview */}
            {baselineMeta?.preview && (
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    Baseline Stylesheet Preview (First 4,000 characters)
                  </span>
                  <Badge bg="secondary">public/assets/css/baseline.css</Badge>
                </div>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#e2e8f0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    maxHeight: '380px',
                    overflow: 'auto',
                    margin: 0
                  }}
                >
                  {baselineMeta.preview}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Offcanvas Drawer for Theme CRUD */}
      <ThemeEditorOffcanvas
        show={showDrawer}
        onHide={() => setShowDrawer(false)}
        theme={selectedTheme}
        onSuccess={() => {
          fetchThemes();
        }}
      />
    </div>
  );
}
