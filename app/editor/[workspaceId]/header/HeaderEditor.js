'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { compileHeader } from '@/lib/headerCompiler.js';

const HEADER_VARIATIONS = [
  {
    id: 'split-topbar',
    name: 'Split with Topbar',
    description: 'Topbar announcement with phone, left logo, center navigation, and right CTA button.',
    svg: `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="6" y="8" width="108" height="8" rx="2" fill="#1e293b" />
      <rect x="10" y="11" width="30" height="2" rx="1" fill="#64748b" />
      <rect x="80" y="11" width="30" height="2" rx="1" fill="#38bdf8" />
      <rect x="6" y="20" width="108" height="26" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <rect x="12" y="28" width="22" height="10" rx="2" fill="#0284c7" />
      <rect x="42" y="31" width="12" height="4" rx="1" fill="#94a3b8" />
      <rect x="58" y="31" width="12" height="4" rx="1" fill="#94a3b8" />
      <rect x="74" y="31" width="12" height="4" rx="1" fill="#94a3b8" />
      <rect x="92" y="28" width="18" height="10" rx="2" fill="#38bdf8" />
    </svg>`
  },
  {
    id: 'centered-nav',
    name: 'Centered Branding & Nav',
    description: 'Logo centered at the top, primary navigation centered below with phone and CTA action buttons.',
    svg: `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="48" y="12" width="24" height="12" rx="2" fill="#0284c7" />
      <rect x="14" y="16" width="20" height="4" rx="1" fill="#64748b" />
      <rect x="86" y="16" width="20" height="4" rx="1" fill="#38bdf8" />
      <rect x="6" y="32" width="108" height="18" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <rect x="24" y="39" width="14" height="4" rx="1" fill="#94a3b8" />
      <rect x="44" y="39" width="14" height="4" rx="1" fill="#94a3b8" />
      <rect x="64" y="39" width="14" height="4" rx="1" fill="#94a3b8" />
      <rect x="84" y="39" width="14" height="4" rx="1" fill="#94a3b8" />
    </svg>`
  },
  {
    id: 'minimal-inline',
    name: 'Minimal Clean (Single Row)',
    description: 'Streamlined single-row header without topbar, brand logo left and inline navigation right.',
    svg: `<svg viewBox="0 0 120 70" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="70" rx="4" fill="#0f172a" />
      <rect x="6" y="20" width="108" height="30" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      <rect x="12" y="29" width="28" height="12" rx="2" fill="#0284c7" />
      <rect x="48" y="33" width="14" height="4" rx="1" fill="#94a3b8" />
      <rect x="66" y="33" width="14" height="4" rx="1" fill="#94a3b8" />
      <rect x="84" y="29" width="24" height="12" rx="2" fill="#38bdf8" />
    </svg>`
  }
];

export default function HeaderEditor({ workspace, initialPages = [], initialHeader }) {
  // Ensure robust defaults
  const [headerData, setHeaderData] = useState(() => {
    return {
      rowGuid: initialHeader?.rowGuid || null,
      menuGuid: initialHeader?.menuGuid || null,
      branding: {
        siteTitle: initialHeader?.branding?.siteTitle || workspace?.clientName || 'WordPress Site',
        logoUrl: initialHeader?.branding?.logoUrl || '',
        logoWidth: initialHeader?.branding?.logoWidth || 180,
        tagline: initialHeader?.branding?.tagline || '',
      },
      contact: {
        phone: initialHeader?.contact?.phone || '(609) 555-0100',
        phoneLabel: initialHeader?.contact?.phoneLabel || 'Call Us 24/7',
        showPhone: initialHeader?.contact?.showPhone !== false,
      },
      cta: {
        text: initialHeader?.cta?.text || 'Schedule Service',
        url: initialHeader?.cta?.url || '/contact/',
        showCta: initialHeader?.cta?.showCta !== false,
      },
      settings: {
        isSticky: initialHeader?.settings?.isSticky !== false,
        showTopBar: initialHeader?.settings?.showTopBar !== false,
        topBarText: initialHeader?.settings?.topBarText || 'Proudly Serving Local Homeowners & Businesses',
      },
      layoutVariation: initialHeader?.layoutVariation || 'split-topbar',
      items: Array.isArray(initialHeader?.items) && initialHeader.items.length > 0
        ? initialHeader.items
        : [
            { id: 'item-home', label: 'Home', url: '/', target: '_self' },
            { id: 'item-services', label: 'Services', url: '/services/', target: '_self', children: [] },
            { id: 'item-about', label: 'About Us', url: '/about/', target: '_self' },
            { id: 'item-contact', label: 'Contact', url: '/contact/', target: '_self' },
          ],
    };
  });

  // Track initial snapshot to detect unsaved changes
  const [lastSavedData, setLastSavedData] = useState(() => {
    return JSON.parse(JSON.stringify({
      rowGuid: initialHeader?.rowGuid || null,
      menuGuid: initialHeader?.menuGuid || null,
      branding: {
        siteTitle: initialHeader?.branding?.siteTitle || workspace?.clientName || 'WordPress Site',
        logoUrl: initialHeader?.branding?.logoUrl || '',
        logoWidth: initialHeader?.branding?.logoWidth || 180,
        tagline: initialHeader?.branding?.tagline || '',
      },
      contact: {
        phone: initialHeader?.contact?.phone || '(609) 555-0100',
        phoneLabel: initialHeader?.contact?.phoneLabel || 'Call Us 24/7',
        showPhone: initialHeader?.contact?.showPhone !== false,
      },
      cta: {
        text: initialHeader?.cta?.text || 'Schedule Service',
        url: initialHeader?.cta?.url || '/contact/',
        showCta: initialHeader?.cta?.showCta !== false,
      },
      settings: {
        isSticky: initialHeader?.settings?.isSticky !== false,
        showTopBar: initialHeader?.settings?.showTopBar !== false,
        topBarText: initialHeader?.settings?.topBarText || 'Proudly Serving Local Homeowners & Businesses',
      },
      items: Array.isArray(initialHeader?.items) && initialHeader.items.length > 0
        ? initialHeader.items
        : [
            { id: 'item-home', label: 'Home', url: '/', target: '_self' },
            { id: 'item-services', label: 'Services', url: '/services/', target: '_self', children: [] },
            { id: 'item-about', label: 'About Us', url: '/about/', target: '_self' },
            { id: 'item-contact', label: 'Contact', url: '/contact/', target: '_self' },
          ],
    }));
  });

  const [activeTab, setActiveTab] = useState('links'); // 'links' | 'branding' | 'contact' | 'settings'
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [alert, setAlert] = useState(null);
  const [clickNotice, setClickNotice] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Detect unsaved changes by comparing current state against last saved snapshot
  const isDirty = useMemo(() => {
    return JSON.stringify(headerData) !== JSON.stringify(lastSavedData);
  }, [headerData, lastSavedData]);

  // Warn user on browser reload/close if there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes in your Site Header. Are you sure you want to leave without saving?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercept client-side Next.js in-app navigation transitions if there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleInAppNavigation = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const confirmed = window.confirm(
        'You have unsaved changes in your Site Header.\n\nNavigating away will discard your changes.\n\nAre you sure you want to leave without saving?'
      );

      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('click', handleInAppNavigation, true);
    return () => document.removeEventListener('click', handleInAppNavigation, true);
  }, [isDirty]);

  // Real-time Handlebars compile for live preview
  const compiled = useMemo(() => {
    try {
      return compileHeader(headerData);
    } catch (err) {
      console.error('Compilation error:', err);
      return { html: `<div class="p-3 text-danger">Error rendering header: ${err.message}</div>`, css: '' };
    }
  }, [headerData]);

  // Available pages for the link picker dropdown
  const pageOptions = useMemo(() => {
    const list = [
      { label: 'Home (/)', url: '/' },
    ];
    (initialPages || []).forEach(p => {
      if (p.slug && p.slug !== 'home') {
        const cleanSlug = p.slug.replace(/^\//, '').replace(/\/$/, '');
        list.push({
          label: `${p.title || cleanSlug} (/${cleanSlug}/)`,
          url: `/${cleanSlug}/`,
          slug: cleanSlug,
        });
      }
    });
    return list;
  }, [initialPages]);

  // =========================================================================
  // Menu Item Mutators
  // =========================================================================

  function addMenuItem() {
    const newId = `item-${Date.now()}`;
    setHeaderData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: newId, label: 'New Link', url: '/', target: '_self', children: [] },
      ],
    }));
  }

  function updateMenuItem(index, field, value) {
    setHeaderData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function removeMenuItem(index) {
    setHeaderData(prev => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items };
    });
  }

  function moveMenuItem(index, direction) {
    setHeaderData(prev => {
      const items = [...prev.items];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return prev;
      const temp = items[index];
      items[index] = items[targetIndex];
      items[targetIndex] = temp;
      return { ...prev, items };
    });
  }

  function addSubItem(parentIndex) {
    const newId = `sub-${Date.now()}`;
    setHeaderData(prev => {
      const items = [...prev.items];
      const parent = items[parentIndex];
      const children = Array.isArray(parent.children) ? [...parent.children] : [];
      children.push({ id: newId, label: 'Sub Link', url: '/', target: '_self' });
      items[parentIndex] = { ...parent, children };
      return { ...prev, items };
    });
  }

  function updateSubItem(parentIndex, subIndex, field, value) {
    setHeaderData(prev => {
      const items = [...prev.items];
      const parent = items[parentIndex];
      const children = [...parent.children];
      children[subIndex] = { ...children[subIndex], [field]: value };
      items[parentIndex] = { ...parent, children };
      return { ...prev, items };
    });
  }

  function removeSubItem(parentIndex, subIndex) {
    setHeaderData(prev => {
      const items = [...prev.items];
      const parent = items[parentIndex];
      const children = parent.children.filter((_, i) => i !== subIndex);
      items[parentIndex] = { ...parent, children };
      return { ...prev, items };
    });
  }

  function moveSubItem(parentIndex, subIndex, direction) {
    setHeaderData(prev => {
      const items = [...prev.items];
      const parent = items[parentIndex];
      const children = [...parent.children];
      const targetIndex = subIndex + direction;
      if (targetIndex < 0 || targetIndex >= children.length) return prev;
      const temp = children[subIndex];
      children[subIndex] = children[targetIndex];
      children[targetIndex] = temp;
      items[parentIndex] = { ...parent, children };
      return { ...prev, items };
    });
  }

  // =========================================================================
  // Save & Publish Handlers
  // =========================================================================

  async function handleSaveDraft() {
    setIsSaving(true);
    setAlert(null);
    try {
      const res = await fetch('/api/header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          headerData,
          action: 'save',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save header draft');
      }
      if (data.rowGuid) {
        setHeaderData(prev => ({ ...prev, rowGuid: data.rowGuid }));
      }
      setLastSavedData(JSON.parse(JSON.stringify(headerData)));
      setAlert({
        type: 'success',
        message: 'Header draft saved successfully to database.',
      });
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message || 'Error saving header draft',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    setAlert(null);
    try {
      const res = await fetch('/api/header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          headerData,
          action: 'publish',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish header to WordPress');
      }
      if (data.rowGuid) {
        setHeaderData(prev => ({ ...prev, rowGuid: data.rowGuid }));
      }
      setLastSavedData(JSON.parse(JSON.stringify(headerData)));

      if (data.wpSyncStatus === 'failed') {
        setAlert({
          type: 'warning',
          message: `Saved to database, but WordPress sync warning: ${data.wpSyncError}`,
        });
      } else {
        setAlert({
          type: 'success',
          message: 'Site Header successfully published to WordPress! It is now active on all Bizfire custom published pages.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message || 'Error publishing header',
      });
    } finally {
      setIsPublishing(false);
    }
  }

  // Container width based on viewport preview
  const viewportWidth =
    viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';

  return (
    <div className="workspace-dashboard" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="ws-topbar">
        <div className="ws-topbar-left">
          <Link href={`/editor/${workspace.workspaceId}`} className="ws-brand-link" title="Back to Pages">
            <span style={{ fontSize: '18px', marginRight: '4px' }}>←</span>
            <span>Pages Dashboard</span>
          </Link>
          <span className="ws-nav-separator">/</span>
          <div className="ws-client-title">
            <strong>Site Header & Navigation</strong>
            <span className="ws-id-pill">{workspace.clientName}</span>
          </div>
          {isDirty ? (
            <span
              className="badge bg-warning text-dark border border-warning"
              style={{ fontSize: '11px', fontWeight: '600', marginLeft: '12px' }}
              title="You have unsaved changes"
            >
              ● Unsaved Changes
            </span>
          ) : (
            <span
              className="badge bg-light text-muted border"
              style={{ fontSize: '11px', fontWeight: '500', marginLeft: '12px' }}
              title="All changes saved to database"
            >
              All changes saved
            </span>
          )}
        </div>

        <div className="ws-topbar-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {workspace.wpSiteUrl && (
            <a
              href={workspace.wpSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ws-ext-link"
              title="Open Live WordPress Site"
            >
              WordPress Site ↗
            </a>
          )}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
          >
            {isSaving ? 'Saving...' : 'Save Draft 💾'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
          >
            {isPublishing ? 'Publishing...' : 'Publish Header to Site 🚀'}
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        {/* Left Panel: Tabbed Controls (440px) */}
        <div
          style={{
            width: '460px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Unsaved Changes Banner */}
          {isDirty && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                borderBottom: '1px solid #fef3c7',
                padding: '9px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700' }}>⚠️ Unsaved:</span> Header changes pending.
              </div>
              <button
                type="button"
                className="btn btn-warning btn-sm py-0 px-2"
                style={{ fontSize: '11px', fontWeight: '600' }}
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '6px 8px 0',
              gap: '4px',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'layouts' ? 'btn-white text-primary border-bottom-0' : 'btn-link text-muted'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontWeight: activeTab === 'layouts' ? '600' : '500',
                border: activeTab === 'layouts' ? '1px solid #e2e8f0' : 'none',
                backgroundColor: activeTab === 'layouts' ? '#ffffff' : 'transparent',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '6px 12px',
              }}
              onClick={() => setActiveTab('layouts')}
            >
              🎨 Layouts
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'links' ? 'btn-white text-primary border-bottom-0' : 'btn-link text-muted'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontWeight: activeTab === 'links' ? '600' : '500',
                border: activeTab === 'links' ? '1px solid #e2e8f0' : 'none',
                backgroundColor: activeTab === 'links' ? '#ffffff' : 'transparent',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '6px 12px',
              }}
              onClick={() => setActiveTab('links')}
            >
              Links ({headerData.items?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'branding' ? 'btn-white text-primary border-bottom-0' : 'btn-link text-muted'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontWeight: activeTab === 'branding' ? '600' : '500',
                border: activeTab === 'branding' ? '1px solid #e2e8f0' : 'none',
                backgroundColor: activeTab === 'branding' ? '#ffffff' : 'transparent',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '6px 12px',
              }}
              onClick={() => setActiveTab('branding')}
            >
              Branding
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'contact' ? 'btn-white text-primary border-bottom-0' : 'btn-link text-muted'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontWeight: activeTab === 'contact' ? '600' : '500',
                border: activeTab === 'contact' ? '1px solid #e2e8f0' : 'none',
                backgroundColor: activeTab === 'contact' ? '#ffffff' : 'transparent',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '6px 12px',
              }}
              onClick={() => setActiveTab('contact')}
            >
              Contact & CTA
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'settings' ? 'btn-white text-primary border-bottom-0' : 'btn-link text-muted'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontWeight: activeTab === 'settings' ? '600' : '500',
                border: activeTab === 'settings' ? '1px solid #e2e8f0' : 'none',
                backgroundColor: activeTab === 'settings' ? '#ffffff' : 'transparent',
                textDecoration: 'none',
                fontSize: '13px',
                padding: '6px 12px',
              }}
              onClick={() => setActiveTab('settings')}
            >
              Header Bar
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '20px', flex: 1 }}>
            {/* TAB 0: LAYOUT VARIATIONS */}
            {activeTab === 'layouts' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    Header Layout Variations
                  </h5>
                  <small className="text-muted">Choose a visual style. Your navigation links, branding, and contact details are 100% preserved.</small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {HEADER_VARIATIONS.map(variant => {
                    const isActive = (headerData.layoutVariation || 'split-topbar') === variant.id;
                    return (
                      <div
                        key={variant.id}
                        onClick={() => {
                          setHeaderData(prev => {
                            const nextSettings = { ...prev.settings };
                            if (variant.id === 'minimal-inline') {
                              nextSettings.showTopBar = false;
                            } else {
                              nextSettings.showTopBar = true;
                            }
                            return {
                              ...prev,
                              layoutVariation: variant.id,
                              settings: nextSettings
                            };
                          });
                          setAlert({ type: 'success', message: `Swapped to "${variant.name}". Your content was preserved!` });
                          setTimeout(() => setAlert(null), 3000);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '12px',
                          background: isActive ? '#f0fdfa' : '#ffffff',
                          border: isActive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.15)' : 'none'
                        }}
                      >
                        <div
                          style={{ width: '100px', height: '58px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#0f172a' }}
                          dangerouslySetInnerHTML={{ __html: variant.svg }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{variant.name}</strong>
                            {isActive && (
                              <span style={{ fontSize: '10px', background: '#0284c7', color: '#fff', padding: '1px 6px', borderRadius: '999px', fontWeight: 600 }}>
                                Active
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                            {variant.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* TAB 1: NAVIGATION MENU TREE */}
            {activeTab === 'links' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                      Primary Navigation Menu
                    </h5>
                    <small className="text-muted">Reorder links, nest sub-dropdowns, or link to workspace pages.</small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={addMenuItem}
                  >
                    + Add Link
                  </button>
                </div>

                {headerData.items?.length === 0 ? (
                  <div className="text-center p-4 border border-dashed rounded text-muted">
                    No menu links yet. Click <strong>+ Add Link</strong> to create your first navigation item.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {headerData.items?.map((item, index) => (
                      <div
                        key={item.id || index}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        {/* Top row: Label, Move Up/Down, Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', width: '20px' }}>
                            #{index + 1}
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.label || ''}
                            onChange={e => updateMenuItem(index, 'label', e.target.value)}
                            placeholder="Link Title (e.g. Services)"
                            style={{ fontWeight: '600' }}
                          />
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              type="button"
                              className="btn btn-light btn-sm p-1"
                              disabled={index === 0}
                              onClick={() => moveMenuItem(index, -1)}
                              title="Move Up"
                              style={{ lineHeight: 1 }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="btn btn-light btn-sm p-1"
                              disabled={index === headerData.items.length - 1}
                              onClick={() => moveMenuItem(index, 1)}
                              title="Move Down"
                              style={{ lineHeight: 1 }}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm p-1"
                              onClick={() => removeMenuItem(index)}
                              title="Delete Link"
                              style={{ lineHeight: 1 }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* URL / Page Picker */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <select
                            className="form-select form-select-sm"
                            value={pageOptions.some(p => p.url === item.url) ? item.url : 'custom'}
                            onChange={e => {
                              if (e.target.value !== 'custom') {
                                updateMenuItem(index, 'url', e.target.value);
                              }
                            }}
                          >
                            <option value="custom">Custom URL...</option>
                            <optgroup label="Workspace Pages">
                              {pageOptions.map(p => (
                                <option key={p.url} value={p.url}>
                                  {p.label}
                                </option>
                              ))}
                            </optgroup>
                          </select>

                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.url || ''}
                            onChange={e => updateMenuItem(index, 'url', e.target.value)}
                            placeholder="/destination-url/"
                            style={{ fontFamily: 'monospace', fontSize: '12px' }}
                          />
                        </div>

                        {/* Sub-items (Dropdown Children) */}
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                              Sub-links ({item.children?.length || 0})
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                              onClick={() => addSubItem(index)}
                            >
                              + Add Sub-item
                            </button>
                          </div>

                          {item.children?.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid #cbd5e1' }}>
                              {item.children.map((sub, sIdx) => (
                                <div
                                  key={sub.id || sIdx}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={sub.label || ''}
                                      onChange={e => updateSubItem(index, sIdx, 'label', e.target.value)}
                                      placeholder="Sub-link Title"
                                      style={{ fontSize: '12px', fontWeight: '500' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-light btn-sm p-1"
                                      disabled={sIdx === 0}
                                      onClick={() => moveSubItem(index, sIdx, -1)}
                                      style={{ fontSize: '10px' }}
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-light btn-sm p-1"
                                      disabled={sIdx === item.children.length - 1}
                                      onClick={() => moveSubItem(index, sIdx, 1)}
                                      style={{ fontSize: '10px' }}
                                    >
                                      ▼
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm p-1"
                                      onClick={() => removeSubItem(index, sIdx)}
                                      style={{ fontSize: '10px' }}
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <select
                                      className="form-select form-select-sm"
                                      style={{ fontSize: '11px' }}
                                      value={pageOptions.some(p => p.url === sub.url) ? sub.url : 'custom'}
                                      onChange={e => {
                                        if (e.target.value !== 'custom') {
                                          updateSubItem(index, sIdx, 'url', e.target.value);
                                        }
                                      }}
                                    >
                                      <option value="custom">Custom...</option>
                                      {pageOptions.map(p => (
                                        <option key={p.url} value={p.url}>
                                          {p.label}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={sub.url || ''}
                                      onChange={e => updateSubItem(index, sIdx, 'url', e.target.value)}
                                      placeholder="/sub-url/"
                                      style={{ fontFamily: 'monospace', fontSize: '11px' }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BRANDING & LOGO */}
            {activeTab === 'branding' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h5 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    Brand & Logo Settings
                  </h5>
                  <small className="text-muted">Configure company logo or text header displayed on the left.</small>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Site Title (Fallback / Alt Text)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={headerData.branding?.siteTitle || ''}
                    onChange={e =>
                      setHeaderData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, siteTitle: e.target.value },
                      }))
                    }
                    placeholder="e.g. Princeton Comfort HVAC"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Logo Image URL
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={headerData.branding?.logoUrl || ''}
                    onChange={e =>
                      setHeaderData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, logoUrl: e.target.value },
                      }))
                    }
                    placeholder="https://example.com/logo.png"
                  />
                  <small className="text-muted">Leave empty to display the site title as bold styled text.</small>
                </div>

                {headerData.branding?.logoUrl && (
                  <div className="p-3 border rounded text-center bg-light">
                    <img
                      src={headerData.branding.logoUrl}
                      alt={headerData.branding.siteTitle}
                      style={{ maxWidth: `${headerData.branding.logoWidth || 180}px`, height: 'auto', maxHeight: '60px' }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Logo Width ({headerData.branding?.logoWidth || 180}px)
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    min="80"
                    max="320"
                    step="10"
                    value={headerData.branding?.logoWidth || 180}
                    onChange={e =>
                      setHeaderData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, logoWidth: Number(e.target.value) },
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>
                    Brand Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={headerData.branding?.tagline || ''}
                    onChange={e =>
                      setHeaderData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, tagline: e.target.value },
                      }))
                    }
                    placeholder="e.g. Heating & Air Conditioning Specialists"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: CONTACT & CTA */}
            {activeTab === 'contact' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h5 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    Contact Phone & Call-to-Action
                  </h5>
                  <small className="text-muted">Highlight fast phone access and primary booking CTA.</small>
                </div>

                {/* Phone Section */}
                <div className="p-3 border rounded bg-light">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showPhoneSwitch"
                      checked={headerData.contact?.showPhone !== false}
                      onChange={e =>
                        setHeaderData(prev => ({
                          ...prev,
                          contact: { ...prev.contact, showPhone: e.target.checked },
                        }))
                      }
                    />
                    <label className="form-check-label fw-bold" htmlFor="showPhoneSwitch" style={{ fontSize: '13px' }}>
                      Show Phone Number Button
                    </label>
                  </div>

                  {headerData.contact?.showPhone !== false && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>
                          Phone Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={headerData.contact?.phone || ''}
                          onChange={e =>
                            setHeaderData(prev => ({
                              ...prev,
                              contact: { ...prev.contact, phone: e.target.value },
                            }))
                          }
                          placeholder="(609) 555-0100"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>
                          Phone Badge Label (Top bar)
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={headerData.contact?.phoneLabel || ''}
                          onChange={e =>
                            setHeaderData(prev => ({
                              ...prev,
                              contact: { ...prev.contact, phoneLabel: e.target.value },
                            }))
                          }
                          placeholder="e.g. 24/7 Emergency Dispatch"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary CTA Button */}
                <div className="p-3 border rounded bg-light">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showCtaSwitch"
                      checked={headerData.cta?.showCta !== false}
                      onChange={e =>
                        setHeaderData(prev => ({
                          ...prev,
                          cta: { ...prev.cta, showCta: e.target.checked },
                        }))
                      }
                    />
                    <label className="form-check-label fw-bold" htmlFor="showCtaSwitch" style={{ fontSize: '13px' }}>
                      Show Action CTA Button
                    </label>
                  </div>

                  {headerData.cta?.showCta !== false && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>
                          Button Text
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={headerData.cta?.text || ''}
                          onChange={e =>
                            setHeaderData(prev => ({
                              ...prev,
                              cta: { ...prev.cta, text: e.target.value },
                            }))
                          }
                          placeholder="e.g. Schedule Service"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>
                          Button Link Destination
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={headerData.cta?.url || ''}
                          onChange={e =>
                            setHeaderData(prev => ({
                              ...prev,
                              cta: { ...prev.cta, url: e.target.value },
                            }))
                          }
                          placeholder="/contact/ or https://..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: HEADER SETTINGS */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h5 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    Header Behavior & Top Bar
                  </h5>
                  <small className="text-muted">Sticky positioning and announcement strip controls.</small>
                </div>

                <div className="p-3 border rounded bg-light">
                  <div className="form-check form-switch mb-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="stickyHeaderSwitch"
                      checked={headerData.settings?.isSticky !== false}
                      onChange={e =>
                        setHeaderData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, isSticky: e.target.checked },
                        }))
                      }
                    />
                    <label className="form-check-label fw-bold" htmlFor="stickyHeaderSwitch" style={{ fontSize: '13px' }}>
                      Sticky Header
                    </label>
                  </div>
                  <small className="text-muted">Keeps header fixed to the top of the viewport when scrolling down.</small>
                </div>

                <div className="p-3 border rounded bg-light">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showTopBarSwitch"
                      checked={headerData.settings?.showTopBar !== false}
                      onChange={e =>
                        setHeaderData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, showTopBar: e.target.checked },
                        }))
                      }
                    />
                    <label className="form-check-label fw-bold" htmlFor="showTopBarSwitch" style={{ fontSize: '13px' }}>
                      Show Top Announcement Strip
                    </label>
                  </div>

                  {headerData.settings?.showTopBar !== false && (
                    <div>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>
                        Announcement Notice Text
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={headerData.settings?.topBarText || ''}
                        onChange={e =>
                          setHeaderData(prev => ({
                            ...prev,
                            settings: { ...prev.settings, topBarText: e.target.value },
                          }))
                        }
                        placeholder="e.g. Serving Princeton, NJ & Mercer County"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live Preview Studio */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Preview Toolbar */}
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                Preview Viewport:
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${viewport === 'desktop' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewport('desktop')}
                >
                  🖥 Desktop
                </button>
                <button
                  type="button"
                  className={`btn ${viewport === 'tablet' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewport('tablet')}
                >
                  📱 Tablet (768px)
                </button>
                <button
                  type="button"
                  className={`btn ${viewport === 'mobile' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewport('mobile')}
                >
                  📱 Mobile (375px)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '12px' }}>
                Scoped: Bizfire Published Pages Only
              </span>
            </div>
          </div>

          {/* Feedback Alert */}
          {alert && (
            <div style={{ padding: '16px 24px 0' }}>
              <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
                {alert.message}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAlert(null)}
                  aria-label="Close"
                ></button>
              </div>
            </div>
          )}

          {/* Click Notice Toast (Shown when user clicks links inside preview) */}
          {clickNotice && (
            <div style={{ padding: '16px 24px 0' }}>
              <div className="alert alert-info alert-dismissible fade show d-flex align-items-center mb-0" role="alert" style={{ fontSize: '13px' }}>
                <span style={{ marginRight: '8px' }}>ℹ️</span>
                <span>{clickNotice}</span>
                <button
                  type="button"
                  className="btn-close ms-auto"
                  onClick={() => setClickNotice(null)}
                  aria-label="Close"
                ></button>
              </div>
            </div>
          )}

          {/* Live Preview Container */}
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: viewportWidth,
                transition: 'width 0.25s ease-in-out',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                minHeight: '500px',
              }}
              onClickCapture={(e) => {
                // Intercept any link click inside the preview to prevent accidental navigation
                const anchor = e.target.closest('a');
                if (anchor) {
                  e.preventDefault();
                  e.stopPropagation();
                  const linkName = anchor.innerText?.trim() || anchor.getAttribute('href') || 'Navigation link';
                  setClickNotice(`"${linkName}" clicked. Link navigation is disabled in the editor preview to prevent losing unsaved progress.`);
                  return;
                }

                // Intercept any button click that is NOT the mobile hamburger drawer toggle
                const button = e.target.closest('button');
                if (button && !button.classList.contains('bizfire-hamburger-toggle')) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              {/* Header CSS + Rendered HTML */}
              <div
                dangerouslySetInnerHTML={{
                  __html: `${compiled.css}\n${compiled.html}`,
                }}
              />

              {/* Sample Page Content Simulator to demonstrate sticky behavior and layout */}
              <div style={{ padding: '60px 40px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '12px',
                    }}
                  >
                    Custom Page Content Simulator
                  </span>
                  <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                    Welcome to {headerData.branding?.siteTitle || 'Our Site'}
                  </h1>
                  <p style={{ fontSize: '16px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
                    This preview shows how your site header appears directly above your published Bizfire component pages.
                    {headerData.settings?.isSticky ? ' Notice that when scrolling, the header stays pinned to the top of the viewport.' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <div className="btn btn-primary">Sample Hero Button</div>
                    <div className="btn btn-outline-secondary">Learn More</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
