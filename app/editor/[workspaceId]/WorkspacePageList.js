'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Spinner, Alert, ProgressBar } from 'react-bootstrap';
import AddPageOffcanvas from '../../AddPageOffcanvas';
import ImportWpPageOffcanvas from '../../ImportWpPageOffcanvas';
import ImportComponentsModal from '../../ImportComponentsModal';
import ThemeStylingModal from '../../ThemeStylingModal';

export default function WorkspacePageList({
  workspace,
  themeBundle,
  initialPages = []
}) {
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);

  // Sync state with server-side props on router refresh
  useEffect(() => {
    setPages(initialPages);
  }, [initialPages]);

  // Drawer & Modal States
  const [isAddPageDrawerOpen, setIsAddPageDrawerOpen] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');

  // Sorting State
  const [sortField, setSortField] = useState('lastSavedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Selection & Publishing State
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [publishingKeys, setPublishingKeys] = useState(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(null);
  const [publishAlert, setPublishAlert] = useState(null);
  const [interruptedJob, setInterruptedJob] = useState(null);

  const selectAllRef = useRef(null);
  const abortPublishRef = useRef(false);

  // Check for interrupted publish job on mount or return
  useEffect(() => {
    function checkInterruptedJob() {
      try {
        const raw = sessionStorage.getItem(`bizfire_publish_job_${workspace.workspaceId}`);
        if (!raw) return;
        const job = JSON.parse(raw);
        if (!job) return;

        const isInterrupted = job.active || job.interrupted || job.wasAborted;
        const remaining = (job.pagesToPublish || []).filter(
          p => !(job.completedKeys || []).includes(p.key)
        );

        if (isInterrupted && remaining.length > 0) {
          setInterruptedJob({
            total: job.total || 0,
            completedCount: (job.completedKeys || []).length,
            remainingPages: remaining
          });
        }
      } catch (_) {}
    }

    checkInterruptedJob();
    window.addEventListener('pageshow', checkInterruptedJob);
    window.addEventListener('focus', checkInterruptedJob);
    return () => {
      window.removeEventListener('pageshow', checkInterruptedJob);
      window.removeEventListener('focus', checkInterruptedJob);
    };
  }, [workspace.workspaceId]);

  // Warn user if reloading or closing window while publishing is active
  useEffect(() => {
    if (!isPublishing) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Pages are currently being published to WordPress. If you leave now, remaining pages will not be published.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isPublishing]);

  // Intercept in-app SPA navigation clicks (Next.js Link / internal links)
  useEffect(() => {
    if (!isPublishing) return;

    const handleInAppNavigation = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      // Allow external new-tab links to open without interrupting the current tab's publish queue
      if (anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const confirmed = window.confirm(
        'Pages are currently being published to WordPress.\n\nNavigating away will cancel the remaining pages in the queue.\n\nAre you sure you want to stop publishing and leave?'
      );

      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        abortPublishRef.current = true;
        // Explicitly checkpoint sessionStorage as interrupted right now before routing occurs
        try {
          const raw = sessionStorage.getItem(`bizfire_publish_job_${workspace.workspaceId}`);
          if (raw) {
            const job = JSON.parse(raw);
            job.interrupted = true;
            job.wasAborted = true;
            job.active = false;
            sessionStorage.setItem(`bizfire_publish_job_${workspace.workspaceId}`, JSON.stringify(job));
          }
        } catch (_) {}
      }
    };

    // Use capturing phase (true) so we intercept the click BEFORE Next.js Link receives it
    document.addEventListener('click', handleInAppNavigation, true);
    return () => {
      document.removeEventListener('click', handleInAppNavigation, true);
    };
  }, [isPublishing, workspace.workspaceId]);

  function getPageKey(page) {
    return page.rowGuid || String(page.postId);
  }

  function getPageStatus(page) {
    if (!page.lastPublishedAt) {
      return 'draft';
    }
    if (page.lastSavedAt && new Date(page.lastSavedAt) > new Date(page.lastPublishedAt)) {
      return 'changes';
    }
    return 'published';
  }

  function getStatusBadge(page) {
    const status = getPageStatus(page);
    if (status === 'draft') {
      return <span className="status-badge badge-draft">Draft</span>;
    }
    if (status === 'changes') {
      return <span className="status-badge badge-changes">Unpublished Changes</span>;
    }
    return <span className="status-badge badge-published">Published</span>;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      const displayHours = hours ? String(hours).padStart(2, '0') : '12';
      return `${day} ${month}, ${displayHours}:${minutes} ${ampm}`;
    } catch {
      return isoStr;
    }
  }

  const templateMap = useMemo(() => {
    const map = {};
    if (Array.isArray(themeBundle.pageTemplates)) {
      themeBundle.pageTemplates.forEach(t => {
        map[t.id] = t.name;
      });
    }
    return map;
  }, [themeBundle]);

  // Filter and sort pages
  const filteredAndSortedPages = useMemo(() => {
    let result = [...pages];

    // Text search (ID, slug, title, rowGuid)
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(page => {
        const titleMatch = (page.title || '').toLowerCase().includes(q);
        const slugMatch = (page.slug || '').toLowerCase().includes(q);
        const postIdStr = page.postId ? String(page.postId) : '';
        const postIdMatch = postIdStr.includes(q);
        const rowGuidMatch = (page.rowGuid || '').toLowerCase().includes(q);
        return titleMatch || slugMatch || postIdMatch || rowGuidMatch;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(page => getPageStatus(page) === statusFilter);
    }

    // Template filter
    if (templateFilter !== 'all') {
      result = result.filter(page => page.templateId === templateFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'postId': {
          const valA = (a.postId && Number(a.postId) > 0) ? Number(a.postId) : -Infinity;
          const valB = (b.postId && Number(b.postId) > 0) ? Number(b.postId) : -Infinity;
          comparison = valA - valB;
          break;
        }
        case 'title': {
          const valA = (a.title || a.slug || '').toLowerCase();
          const valB = (b.title || b.slug || '').toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        }
        case 'template': {
          const nameA = (templateMap[a.templateId] || a.templateId || '').toLowerCase();
          const nameB = (templateMap[b.templateId] || b.templateId || '').toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'status': {
          const order = { draft: 1, changes: 2, published: 3 };
          comparison = (order[getPageStatus(a)] || 0) - (order[getPageStatus(b)] || 0);
          break;
        }
        case 'lastSavedAt': {
          const timeA = a.lastSavedAt ? new Date(a.lastSavedAt).getTime() : 0;
          const timeB = b.lastSavedAt ? new Date(b.lastSavedAt).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        case 'lastPublishedAt': {
          const timeA = a.lastPublishedAt ? new Date(a.lastPublishedAt).getTime() : 0;
          const timeB = b.lastPublishedAt ? new Date(b.lastPublishedAt).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [pages, searchQuery, statusFilter, templateFilter, sortField, sortDirection, templateMap]);

  // Selection calculations
  const visibleKeys = useMemo(() => {
    return filteredAndSortedPages.map(getPageKey);
  }, [filteredAndSortedPages]);

  const selectedVisibleCount = useMemo(() => {
    return visibleKeys.filter(k => selectedKeys.has(k)).length;
  }, [visibleKeys, selectedKeys]);

  const isAllVisibleSelected = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
  const isIndeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleKeys.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  function handleToggleSelectAll() {
    if (isAllVisibleSelected) {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        visibleKeys.forEach(k => next.delete(k));
        return next;
      });
    } else {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        visibleKeys.forEach(k => next.add(k));
        return next;
      });
    }
  }

  function handleToggleSelect(key) {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleResetFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setTemplateFilter('all');
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'lastSavedAt' || field === 'lastPublishedAt' ? 'desc' : 'asc');
    }
  }

  function renderSortIndicator(field) {
    if (sortField === field) {
      return (
        <span style={{ marginLeft: '4px', fontSize: '11px', color: '#0284c7' }}>
          {sortDirection === 'asc' ? '▲' : '▼'}
        </span>
      );
    }
    return (
      <span style={{ marginLeft: '4px', fontSize: '11px', color: '#94a3b8', opacity: 0.6 }}>
        ↕
      </span>
    );
  }

  function handleCancelPublish() {
    abortPublishRef.current = true;
  }

  // Publish handler with sequential queue processing and cancellation
  async function handlePublishPages(pagesToPublish) {
    if (!pagesToPublish || pagesToPublish.length === 0) return;

    abortPublishRef.current = false;
    const targetKeys = new Set(pagesToPublish.map(getPageKey));
    setPublishingKeys(new Set(targetKeys));
    setIsPublishing(true);
    setPublishAlert(null);
    setInterruptedJob(null);

    const total = pagesToPublish.length;
    setPublishProgress({
      current: 1,
      total,
      currentTitle: pagesToPublish[0]?.title || pagesToPublish[0]?.slug || 'Page',
      percent: 0,
      completedCount: 0,
      failedCount: 0
    });

    const sessionKey = `bizfire_publish_job_${workspace.workspaceId}`;
    const sessionData = {
      active: true,
      total,
      pagesToPublish: pagesToPublish.map(p => ({
        key: getPageKey(p),
        title: p.title || p.slug || 'Page',
        postId: p.postId,
        rowGuid: p.rowGuid,
        slug: p.slug,
        templateId: p.templateId
      })),
      completedKeys: [],
      failedKeys: [],
      startedAt: new Date().toISOString()
    };
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
    } catch (_) {}

    try {
      let apiKey = workspace.apiKey || '';
      if (!apiKey && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('domain-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            apiKey = parsed?.state?.apiKey || parsed?.apiKey || '';
          }
        } catch (_) {}
      }

      const successfulPages = [];
      const failedPages = [];

      for (let i = 0; i < total; i++) {
        if (abortPublishRef.current) {
          break;
        }

        const page = pagesToPublish[i];
        const pageKey = getPageKey(page);

        setPublishProgress({
          current: i + 1,
          total,
          currentTitle: page.title || page.slug || `Page #${i + 1}`,
          percent: Math.round((i / total) * 100),
          completedCount: successfulPages.length,
          failedCount: failedPages.length
        });

        try {
          const res = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId: workspace.workspaceId,
              apiKey: apiKey || undefined,
              postId: (page.postId && Number(page.postId) > 0) ? page.postId : undefined,
              rowGuid: page.rowGuid,
              slug: page.slug,
              title: page.title,
              templateId: page.templateId
            })
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to publish page');
          }

          successfulPages.push({
            page,
            postId: data.postId,
            publishedAt: data.publishedAt,
            liveUrl: data.liveUrl
          });

          sessionData.completedKeys.push(pageKey);
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
          } catch (_) {}

          // Update in-memory state for this page immediately
          setPages(prevPages => {
            return prevPages.map(p => {
              if (getPageKey(p) === pageKey) {
                return {
                  ...p,
                  postId: (data.postId && Number(data.postId) > 0) ? Number(data.postId) : p.postId,
                  lastPublishedAt: data.publishedAt || new Date().toISOString(),
                  liveUrl: data.liveUrl || p.liveUrl
                };
              }
              return p;
            });
          });

          // Deselect this page from selectedKeys
          setSelectedKeys(prev => {
            const next = new Set(prev);
            next.delete(pageKey);
            return next;
          });

        } catch (err) {
          failedPages.push({
            page,
            error: err.message
          });
          sessionData.failedKeys.push(pageKey);
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
          } catch (_) {}
        } finally {
          // Remove this key from publishingKeys so inline spinners update
          setPublishingKeys(prev => {
            const next = new Set(prev);
            next.delete(pageKey);
            return next;
          });
        }
      }

      const wasAborted = abortPublishRef.current;

      // Mark session status when batch loop finishes
      if (wasAborted) {
        sessionData.interrupted = true;
        sessionData.wasAborted = true;
        sessionData.active = false;
        sessionData.finishedAt = new Date().toISOString();
      } else {
        sessionData.interrupted = false;
        sessionData.wasAborted = false;
        sessionData.active = false;
        sessionData.finishedAt = new Date().toISOString();
      }
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
      } catch (_) {}

      if (wasAborted) {
        setPublishAlert({
          type: 'warning',
          message: `Publishing stopped by user. ${successfulPages.length} of ${total} page(s) published.` +
            (failedPages.length > 0 ? ` (${failedPages.length} failed: ${failedPages.map(f => f.error).join('; ')})` : '')
        });
      } else if (failedPages.length > 0) {
        setPublishAlert({
          type: successfulPages.length > 0 ? 'warning' : 'danger',
          message: `${successfulPages.length} of ${total} page(s) published successfully. ${failedPages.length} failed: ${failedPages.map(f => `${f.page.title || f.page.slug} (${f.error})`).join('; ')}`
        });
      } else {
        setPublishAlert({
          type: 'success',
          message: `Successfully published ${successfulPages.length} page${successfulPages.length === 1 ? '' : 's'} to WordPress!`
        });
      }

      router.refresh();
    } catch (err) {
      setPublishAlert({
        type: 'danger',
        message: err.message || 'Failed to publish to WordPress'
      });
    } finally {
      setPublishProgress(null);
      setIsPublishing(false);
      setPublishingKeys(new Set());
    }
  }

  function handleBulkPublish() {
    const selectedList = pages.filter(p => selectedKeys.has(getPageKey(p)));
    if (selectedList.length === 0) return;
    handlePublishPages(selectedList);
  }

  const existingPostIds = new Set(pages.map(p => Number(p.postId)).filter(Boolean));

  return (
    <div className="workspace-dashboard">
      {/* Top Header */}
      <header className="ws-topbar">
        <div className="ws-topbar-left">
          <Link href="/" className="ws-brand-link" title="Theme Playground">
            <div className="brand-mark">B</div>
            <span>Bizfire</span>
          </Link>
          <span className="ws-nav-separator">/</span>
          <div className="ws-client-title">
            <strong>{workspace.clientName}</strong>
            <span className="ws-id-pill">{workspace.workspaceId}</span>
          </div>
        </div>

        <div className="ws-topbar-right">
          <Link
            href={`/editor/${workspace.workspaceId}/header`}
            className="btn btn-outline-primary btn-sm"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Edit Site Header & Navigation"
          >
            <span>🧭</span> Site Header & Menu
          </Link>
          <Link
            href={`/editor/${workspace.workspaceId}/footer`}
            className="btn btn-outline-secondary btn-sm"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Edit Site Footer & Multi-Column Navigation"
          >
            <span>🦶</span> Site Footer
          </Link>
          {workspace.wpSiteUrl && (
            <a
              href={workspace.wpSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ws-ext-link"
            >
              WordPress Site ↗
            </a>
          )}
          <Link href="/" className="btn-secondary">
            Playground ↗
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="ws-main-content">
        {/* Workspace Overview Cards */}
        <div className="ws-overview-cards">
          <div className="ws-card">
            <span className="ws-card-label">Client Name</span>
            <strong className="ws-card-value">{workspace.clientName}</strong>
          </div>
          <div className="ws-card">
            <span className="ws-card-label">Workspace Theme Clone</span>
            <strong className="ws-card-value">{themeBundle.theme?.name || workspace.themeId}</strong>
            <small className="ws-card-sub">
              {themeBundle.components?.length || 0} components · {themeBundle.pageTemplates?.length || 0} templates
            </small>
          </div>
          <div className="ws-card">
            <span className="ws-card-label">Total Pages</span>
            <strong className="ws-card-value">{pages.length}</strong>
            <small className="ws-card-sub">
              {pages.filter(p => !!p.lastPublishedAt).length} published to WordPress
            </small>
          </div>
          <div className="ws-card">
            <span className="ws-card-label">Target WordPress Site</span>
            <strong className="ws-card-value ws-truncate" title={workspace.wpSiteUrl}>
              {workspace.wpSiteUrl ? workspace.wpSiteUrl.replace(/^https?:\/\//, '') : 'None configured'}
            </strong>
          </div>
        </div>

        {/* Page List Section */}
        <section className="ws-table-container">
          <div className="ws-table-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2>Workspace Pages</h2>
                <span className="badge bg-light text-secondary border" style={{ fontSize: '12px', fontWeight: '500' }}>
                  {filteredAndSortedPages.length}{pages.length !== filteredAndSortedPages.length ? ` of ${pages.length}` : ''}
                </span>
              </div>
              <p>Manage, sort, and publish component-driven pages for this client.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                href={`/editor/${workspace.workspaceId}/header`}
                className="btn btn-outline-secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Configure Site Header and Navigation Menu"
              >
                <span>🧭</span> Site Header & Menu
              </Link>
              <Link
                href={`/editor/${workspace.workspaceId}/footer`}
                className="btn btn-outline-secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Configure Site Footer and Multi-Column Navigation"
              >
                <span>🦶</span> Site Footer
              </Link>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={isPublishing}
                onClick={() => setIsThemeModalOpen(true)}
              >
                🎨 Theme & Styling
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={isPublishing}
                onClick={() => setIsComponentModalOpen(true)}
              >
                🧩 Component Library
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={isPublishing}
                onClick={() => setIsImportDrawerOpen(true)}
              >
                Import from WordPress ⤓
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPublishing}
                onClick={() => setIsAddPageDrawerOpen(true)}
              >
                + Add Page
              </button>
            </div>
          </div>

          {/* Table Filters & Bulk Actions Toolbar */}
          {pages.length > 0 && (
            <div className="ws-table-toolbar">
              <div className="ws-table-toolbar-left">
                <div style={{ position: 'relative', width: '240px' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, slug, title..."
                    style={{ paddingRight: searchQuery ? '28px' : '10px' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '14px',
                        lineHeight: 1
                      }}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto', minWidth: '150px' }}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Drafts</option>
                  <option value="changes">Unpublished Changes</option>
                  <option value="published">Published</option>
                </select>

                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto', minWidth: '170px' }}
                  value={templateFilter}
                  onChange={e => setTemplateFilter(e.target.value)}
                >
                  <option value="all">All Templates</option>
                  {themeBundle.pageTemplates?.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {(searchQuery || statusFilter !== 'all' || templateFilter !== 'all') && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none text-muted"
                    onClick={handleResetFilters}
                    style={{ fontSize: '13px', padding: '0 4px' }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="ws-table-toolbar-right">
                {selectedKeys.size > 0 && (
                  <span className="text-muted small" style={{ fontSize: '13px' }}>
                    <strong>{selectedKeys.size}</strong> selected
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  disabled={selectedKeys.size === 0 || isPublishing}
                  onClick={handleBulkPublish}
                >
                  {isPublishing ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: '6px' }} />
                      Publishing...
                    </>
                  ) : (
                    <>Publish Selected {selectedKeys.size > 0 ? `(${selectedKeys.size})` : ''}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Interrupted Publish Job Recovery Alert */}
          {interruptedJob && (
            <div style={{ padding: '12px 24px 0' }}>
              <Alert
                variant="warning"
                dismissible
                onClose={() => {
                  setInterruptedJob(null);
                  try {
                    sessionStorage.removeItem(`bizfire_publish_job_${workspace.workspaceId}`);
                  } catch (_) {}
                }}
                className="mb-0"
                style={{ fontSize: '13px', padding: '12px 16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong>Publishing was interrupted:</strong> You navigated away while pages were being published.{' '}
                    <span><strong>{interruptedJob.completedCount}</strong> of <strong>{interruptedJob.total}</strong> pages were published before leaving.</span>
                    {interruptedJob.remainingPages?.length > 0 && (
                      <span> <strong>{interruptedJob.remainingPages.length}</strong> pages were not published.</span>
                    )}
                  </div>
                  {interruptedJob.remainingPages?.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          const remaining = pages.filter(p =>
                            interruptedJob.remainingPages?.some(r => r.key === getPageKey(p))
                          );
                          setInterruptedJob(null);
                          try {
                            sessionStorage.removeItem(`bizfire_publish_job_${workspace.workspaceId}`);
                          } catch (_) {}
                          handlePublishPages(remaining.length > 0 ? remaining : interruptedJob.remainingPages);
                        }}
                        style={{ fontSize: '12px', padding: '2px 10px' }}
                      >
                        Resume Publishing Remaining ({interruptedJob.remainingPages.length}) 🚀
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setInterruptedJob(null);
                          try {
                            sessionStorage.removeItem(`bizfire_publish_job_${workspace.workspaceId}`);
                          } catch (_) {}
                        }}
                        style={{ fontSize: '12px', padding: '2px 8px' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </Alert>
            </div>
          )}

          {/* Feedback Alerts & Progress Bar */}
          {publishAlert && (
            <div style={{ padding: '12px 24px 0' }}>
              <Alert
                variant={publishAlert.type}
                dismissible
                onClose={() => setPublishAlert(null)}
                className="mb-0"
                style={{ fontSize: '13px', padding: '10px 16px' }}
              >
                {publishAlert.message}
              </Alert>
            </div>
          )}
          {isPublishing && publishProgress && (
            <div style={{ padding: '12px 24px 0' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Spinner as="span" animation="border" size="sm" variant="success" role="status" />
                    <span>
                      Publishing <strong>{publishProgress.current}</strong> of <strong>{publishProgress.total}</strong>: &ldquo;{publishProgress.currentTitle}&rdquo;
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {publishProgress.completedCount} succeeded{publishProgress.failedCount > 0 ? `, ${publishProgress.failedCount} failed` : ''}
                    </span>
                    {publishProgress.total > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        style={{ fontSize: '11px', padding: '1px 8px' }}
                        onClick={handleCancelPublish}
                      >
                        Stop Publishing
                      </button>
                    )}
                  </div>
                </div>
                <ProgressBar
                  animated
                  striped
                  variant="success"
                  now={publishProgress.percent}
                  label={`${publishProgress.percent}%`}
                  style={{ height: '14px', fontSize: '10px', fontWeight: '600' }}
                />
              </div>
            </div>
          )}

          {pages.length === 0 ? (
            <div className="ws-empty-state">
              <p>No pages created yet for this workspace.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => setIsImportDrawerOpen(true)}
                >
                  Import Existing WordPress Page
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsAddPageDrawerOpen(true)}
                >
                  + Create First Page
                </button>
              </div>
            </div>
          ) : (
            <table className="ws-pages-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllVisibleSelected}
                      onChange={handleToggleSelectAll}
                      title="Select all visible pages"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th className="sortable" onClick={() => handleSort('postId')}>
                    WordPress ID {renderSortIndicator('postId')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('title')}>
                    Page Title & Slug {renderSortIndicator('title')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('template')}>
                    Template {renderSortIndicator('template')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    Status {renderSortIndicator('status')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('lastSavedAt')}>
                    Last Saved {renderSortIndicator('lastSavedAt')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('lastPublishedAt')}>
                    Last Published {renderSortIndicator('lastPublishedAt')}
                  </th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPages.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span>No pages found matching the active filters.</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleResetFilters}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedPages.map(page => {
                    const pageKey = getPageKey(page);
                    const isSelected = selectedKeys.has(pageKey);
                    const isThisPublishing = publishingKeys.has(pageKey);
                    const targetIdentifier = page.rowGuid || page.postId;
                    const isPublished = Boolean(page.lastPublishedAt);
                    const siteBase = workspace.wpSiteUrl ? workspace.wpSiteUrl.replace(/\/$/, '') : '';
                    const cleanSlug = (page.slug || '').replace(/^\//, '');
                    const viewUrl = isPublished
                      ? page.liveUrl || (siteBase ? `${siteBase}/${cleanSlug}${cleanSlug ? '/' : ''}` : null)
                      : null;

                    return (
                      <tr key={pageKey} className={isSelected ? 'selected' : ''}>
                        <td className="col-checkbox">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(pageKey)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          {page.postId && Number(page.postId) > 0 ? (
                            <span className="post-id-tag">#{page.postId}</span>
                          ) : (
                            <span className="post-id-tag draft-tag">Draft (Unpublished)</span>
                          )}
                        </td>
                        <td>
                          <div className="page-title-cell">
                            <strong>{page.title || 'Untitled Page'}</strong>
                            {viewUrl ? (
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="page-slug-link"
                                title="Open live page in new tab"
                              >
                                /{cleanSlug} ↗
                              </a>
                            ) : (
                              <code>/{cleanSlug}</code>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="template-pill">
                            {templateMap[page.templateId] || page.templateId || 'Custom'}
                          </span>
                        </td>
                        <td>{getStatusBadge(page)}</td>
                        <td suppressHydrationWarning>{formatDate(page.lastSavedAt)}</td>
                        <td suppressHydrationWarning>{formatDate(page.lastPublishedAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={isThisPublishing || isPublishing}
                              onClick={() => handlePublishPages([page])}
                              title="Publish directly to WordPress"
                            >
                              {isThisPublishing ? (
                                <>
                                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: '4px' }} />
                                  Publishing...
                                </>
                              ) : (
                                'Publish'
                              )}
                            </button>
                            {viewUrl && (
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-secondary"
                                title="Open live page in new tab"
                              >
                                View Page ↗
                              </a>
                            )}
                            <Link
                              href={`/editor/${workspace.workspaceId}/${targetIdentifier}`}
                              className="btn btn-sm btn-primary"
                            >
                              Edit Content →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {/* Import from WordPress Offcanvas Drawer */}
      <ImportWpPageOffcanvas
        show={isImportDrawerOpen}
        onHide={() => setIsImportDrawerOpen(false)}
        workspace={workspace}
        themeBundle={themeBundle}
        existingPostIds={existingPostIds}
        onImportSuccess={() => {
          router.refresh();
        }}
      />

      {/* Add Page Offcanvas Drawer */}
      <AddPageOffcanvas
        show={isAddPageDrawerOpen}
        onHide={() => setIsAddPageDrawerOpen(false)}
        workspace={workspace}
        themeBundle={themeBundle}
      />

      {/* Component Library / Ingestion Modal */}
      <ImportComponentsModal
        show={isComponentModalOpen}
        onHide={() => setIsComponentModalOpen(false)}
        workspaceId={workspace.workspaceId}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Theme & Styling Modal */}
      <ThemeStylingModal
        show={isThemeModalOpen}
        onHide={() => setIsThemeModalOpen(false)}
        workspace={workspace}
        themeBundle={themeBundle}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
