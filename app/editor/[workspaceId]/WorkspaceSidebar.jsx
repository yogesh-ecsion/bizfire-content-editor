'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Form } from 'react-bootstrap';

export default function WorkspaceSidebar({
  workspace,
  pages = [],
  activeThemeSlug,
  availableThemes = [],
  isChangingTheme = false,
  isPublishing = false,
  onThemeChange,
  onOpenAddPage,
  onOpenComponentLibrary,
  onOpenImportDrawer
}) {
  const pathname = usePathname() || '';
  const workspaceId = workspace?.workspaceId;

  const isPagesActive = pathname === `/editor/${workspaceId}` || pathname === `/editor/${workspaceId}/`;
  const isHeaderActive = pathname.startsWith(`/editor/${workspaceId}/header`);
  const isFooterActive = pathname.startsWith(`/editor/${workspaceId}/footer`);

  const cleanSiteUrl = workspace?.wpSiteUrl
    ? workspace.wpSiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  return (
    <aside className="ws-sidebar" aria-label="Workspace Sidebar">
      {/* 1. Sidebar Brand & Workspace Header */}
      <div className="ws-sidebar-header">
        <Link href="/" className="ws-sidebar-brand" title="Bizfire Studio Home">
          <span className="ws-sidebar-brand-icon">⚡</span>
          <span className="ws-sidebar-brand-name">Bizfire Studio</span>
        </Link>

        <div className="ws-sidebar-client-card">
          <div className="ws-sidebar-client-meta">
            <span className="ws-sidebar-label">Active Workspace</span>
            <strong className="ws-sidebar-client-name" title={workspace?.clientName}>
              {workspace?.clientName || 'Workspace'}
            </strong>
          </div>
          <div className="ws-sidebar-pills">
            <span className="ws-sidebar-id-pill" title={workspaceId}>
              {workspaceId ? `${workspaceId.slice(0, 8)}...` : 'Local'}
            </span>
            {workspace?.wpSiteUrl ? (
              <span className="ws-sidebar-status-pill online" title="WordPress Connected">
                ● WP Synced
              </span>
            ) : (
              <span className="ws-sidebar-status-pill offline" title="Local Mode">
                ● Local Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sidebar Navigation Modules */}
      <nav className="ws-sidebar-nav">
        {/* Module A: Content & Pages */}
        <div className="ws-sidebar-section">
          <div className="ws-sidebar-section-title">Content & Pages</div>
          <ul className="ws-sidebar-menu">
            <li>
              <Link
                href={`/editor/${workspaceId}`}
                className={`ws-sidebar-item ${isPagesActive ? 'active' : ''}`}
              >
                <span className="ws-sidebar-icon">📄</span>
                <span className="ws-sidebar-text">Workspace Pages</span>
                <Badge bg="secondary" className="ws-sidebar-count-badge">
                  {pages.length}
                </Badge>
              </Link>
            </li>
            {onOpenAddPage && (
              <li>
                <button
                  type="button"
                  className="ws-sidebar-item ws-sidebar-action-btn"
                  onClick={onOpenAddPage}
                  disabled={isPublishing}
                >
                  <span className="ws-sidebar-icon">➕</span>
                  <span className="ws-sidebar-text">Add New Page</span>
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Module B: Site Layout & Navigation */}
        <div className="ws-sidebar-section">
          <div className="ws-sidebar-section-title">Site Structure</div>
          <ul className="ws-sidebar-menu">
            <li>
              <Link
                href={`/editor/${workspaceId}/header`}
                className={`ws-sidebar-item ${isHeaderActive ? 'active' : ''}`}
              >
                <span className="ws-sidebar-icon">🧭</span>
                <span className="ws-sidebar-text">Site Header & Menu</span>
              </Link>
            </li>
            <li>
              <Link
                href={`/editor/${workspaceId}/footer`}
                className={`ws-sidebar-item ${isFooterActive ? 'active' : ''}`}
              >
                <span className="ws-sidebar-icon">🦶</span>
                <span className="ws-sidebar-text">Site Footer</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Module C: Styling & Themes */}
        <div className="ws-sidebar-section">
          <div className="ws-sidebar-section-title">Themes & Styling</div>
          <div className="ws-sidebar-theme-box">
            <div className="ws-sidebar-theme-header">
              <span className="ws-sidebar-theme-label">Active Workspace Theme</span>
            </div>
            {onThemeChange && (
              <Form.Select
                size="sm"
                className="ws-sidebar-theme-select"
                value={activeThemeSlug || ''}
                onChange={onThemeChange}
                disabled={isChangingTheme || isPublishing}
              >
                {availableThemes.length === 0 ? (
                  <option value={activeThemeSlug}>{activeThemeSlug}</option>
                ) : (
                  availableThemes.map(t => (
                    <option key={t.slug} value={t.slug}>
                      {t.name || t.slug} {t.isMaster ? '★' : ''}
                    </option>
                  ))
                )}
              </Form.Select>
            )}
          </div>

          <ul className="ws-sidebar-menu" style={{ marginTop: '8px' }}>
            <li>
              <Link href="/themes" className="ws-sidebar-item" title="Themes Catalog & Custom Theme Editor">
                <span className="ws-sidebar-icon">🎨</span>
                <span className="ws-sidebar-text">Themes Center</span>
              </Link>
            </li>
            <li>
              <Link href="/themes?tab=baseline" className="ws-sidebar-item" title="Global Baseline Framework (Bootstrap Grid)">
                <span className="ws-sidebar-icon">📐</span>
                <span className="ws-sidebar-text">Global Baseline CSS</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Module D: Global Component Library */}
        <div className="ws-sidebar-section">
          <div className="ws-sidebar-section-title">Global Library</div>
          <ul className="ws-sidebar-menu">
            {onOpenComponentLibrary && (
              <li>
                <button
                  type="button"
                  className="ws-sidebar-item ws-sidebar-action-btn"
                  onClick={onOpenComponentLibrary}
                  disabled={isPublishing}
                >
                  <span className="ws-sidebar-icon">🧩</span>
                  <span className="ws-sidebar-text">Component Library</span>
                </button>
              </li>
            )}
            {onOpenImportDrawer && (
              <li>
                <button
                  type="button"
                  className="ws-sidebar-item ws-sidebar-action-btn"
                  onClick={onOpenImportDrawer}
                  disabled={isPublishing}
                >
                  <span className="ws-sidebar-icon">⤓</span>
                  <span className="ws-sidebar-text">Import from WordPress</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* 3. Sidebar Footer */}
      <div className="ws-sidebar-footer">
        {workspace?.wpSiteUrl && (
          <a
            href={workspace.wpSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-sidebar-footer-link"
            title={`Open target WordPress website: ${workspace.wpSiteUrl}`}
          >
            <span className="ws-sidebar-icon">🌐</span>
            <span className="ws-sidebar-footer-text ws-truncate">
              {cleanSiteUrl || 'WordPress Site'}
            </span>
            <span className="ws-sidebar-ext">↗</span>
          </a>
        )}
        <Link href="/" className="ws-sidebar-footer-link" title="Open Studio Playground">
          <span className="ws-sidebar-icon">🧪</span>
          <span className="ws-sidebar-footer-text">Studio Playground</span>
          <span className="ws-sidebar-ext">↗</span>
        </Link>
      </div>
    </aside>
  );
}
