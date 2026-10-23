'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Handlebars from 'handlebars';
import ImageCropperModal from './ImageCropperModal';
import ImportComponentsModal from './ImportComponentsModal';
import ComponentPickerModal from './ComponentPickerModal';
import ThemeEditorOffcanvas from './themes/ThemeEditorOffcanvas';
import { compileHeader } from '@/lib/headerCompiler.js';
import { compileFooter } from '@/lib/footerCompiler.js';
import { mergeVariantProps, matchSectionsForTemplate, getLayoutSvgWireframe } from '@/lib/variantEngine.js';

function generateUniqueId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Ensure every item in array has a stable unique _id
function sanitizeArrayItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => {
    if (typeof item === 'object' && item !== null && !item._id) {
      return { _id: item.id || `itm_${idx + 1}`, ...item };
    }
    return item;
  });
}

// Generic helper to get a meaningful title for any array item without hardcoding
function getItemBadgeTitle(item, config, index) {
  if (!item || typeof item !== 'object') return `#${index + 1}`;
  if (config.labelField && item[config.labelField]) {
    const val = String(item[config.labelField]);
    return val.length > 28 ? `${val.slice(0, 28)}…` : val;
  }
  // Generic fallback: first non-empty string property that isn't _id
  for (const [k, v] of Object.entries(item)) {
    if (k !== '_id' && typeof v === 'string' && v.trim()) {
      return v.length > 28 ? `${v.slice(0, 28)}…` : v;
    }
  }
  return `#${index + 1}`;
}

// Generate empty default value from schema field configuration
function emptyFieldFromSchema(config) {
  if (config.default !== undefined) return structuredClone(config.default);
  if (config.type === 'image') return { src: '', alt: '' };
  if (config.type === 'array' || config.type === 'list') return [];
  if (config.type === 'number') return 0;
  if (config.type === 'boolean') return false;
  if (config.type === 'select') return config.options?.[0]?.value ?? config.options?.[0] ?? '';
  return '';
}

function emptyObjectFromSchema(schema) {
  return Object.fromEntries(
    Object.entries(schema).map(([key, config]) => [key, emptyFieldFromSchema(config)])
  );
}

// Image Editor Field with live thumbnail and interactive cropper
function ImageField({ name, config, value, onChange }) {
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempSrc, setTempSrc] = useState('');
  const fileInputRef = useRef(null);

  const imgSrc = value?.src || '';
  const imgAlt = value?.alt || '';

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTempSrc(reader.result);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function openCropperWithCurrent() {
    setTempSrc(imgSrc);
    setIsCropperOpen(true);
  }

  return (
    <fieldset className="editor-field editor-field--image">
      <legend>{config.label || name}</legend>

      <div className="image-field-preview-box">
        {imgSrc ? (
          <div className="image-field-thumb-wrap">
            <img src={imgSrc} alt={imgAlt || 'Preview'} className="image-field-thumb" />
            {value?.provider && (
              <span className={`image-provider-badge is-${value.provider}`}>
                {value.provider === 'wordpress' ? 'WordPress Media' : 'Local Storage'}
              </span>
            )}
          </div>
        ) : (
          <div className="image-field-empty">
            <span>No image selected</span>
          </div>
        )}

        <div className="image-field-actions">
          <button
            type="button"
            className="btn-image-action btn-crop"
            onClick={openCropperWithCurrent}
            title="Crop &amp; Upload image"
          >
            ✂ Crop &amp; Upload
          </button>
          <label className="btn-image-action">
            <span>📁 Choose File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>

      <div className="image-field-inputs">
        <label>
          <span>Image URL (or upload above)</span>
          <input
            value={imgSrc}
            placeholder="https://... or /uploads/..."
            onChange={e => onChange({ ...value, src: e.target.value })}
          />
        </label>
        <label>
          <span>Alt Text (SEO &amp; Accessibility)</span>
          <input
            value={imgAlt}
            placeholder="Descriptive image text"
            onChange={e => onChange({ ...value, alt: e.target.value })}
          />
        </label>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        initialSrc={tempSrc || imgSrc}
        initialAlt={imgAlt}
        defaultRatio={config.aspectRatio || '16:9'}
        onClose={() => setIsCropperOpen(false)}
        onComplete={({ src, alt, provider, id }) => {
          onChange({
            ...value,
            src,
            alt: alt || imgAlt,
            provider,
            mediaId: id
          });
        }}
      />
    </fieldset>
  );
}

// Collapsible Array Field Engine
function ArrayField({ name, config, value, onChange }) {
  const rawItems = Array.isArray(value) ? value : [];
  const items = sanitizeArrayItems(rawItems);
  const itemSchema = config.itemSchema || { text: { type: 'text', label: 'Item' } };
  const isComplex = typeof itemSchema === 'object' && !itemSchema.type;

  // Manage expanded items: if <= 2 items, expand all; if > 2, expand first item
  const [expandedIds, setExpandedIds] = useState(() => {
    if (items.length <= 2) {
      return new Set(items.map(it => it._id));
    }
    return new Set(items[0] ? [items[0]._id] : []);
  });

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(items.map(it => it._id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function addItem() {
    const newItem = isComplex ? emptyObjectFromSchema(itemSchema) : '';
    const newId = generateUniqueId('itm');
    const itemWithId = typeof newItem === 'object'
      ? { _id: newId, ...newItem }
      : newItem;
    // Auto-expand the newly added item
    setExpandedIds(prev => new Set([...prev, newId]));
    onChange([...items, itemWithId], true);
  }

  function updateItem(targetId, key, val) {
    const next = items.map(item => {
      if (item._id !== targetId) return item;
      return isComplex ? { ...item, [key]: val } : val;
    });
    onChange(next, false);
  }

  function removeItem(targetId) {
    onChange(items.filter(item => item._id !== targetId), true);
  }

  function moveItem(index, dir) {
    const targetIndex = index + dir;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next, true);
  }

  return (
    <fieldset className="editor-field editor-field--array">
      <legend>
        <div className="array-legend-wrap">
          <span>{config.label || name} <small>({items.length})</small></span>
          {items.length > 1 && (
            <div className="array-legend-actions">
              <button type="button" className="btn-array-toggle-all" onClick={expandAll} title="Expand all items">
                Expand All
              </button>
              <span className="dot-sep" style={{ color: '#cbd5e1' }}>·</span>
              <button type="button" className="btn-array-toggle-all" onClick={collapseAll} title="Collapse all items">
                Collapse All
              </button>
            </div>
          )}
        </div>
      </legend>
      <div className="array-items-list">
        {items.map((item, idx) => {
          const stableKey = item._id || `item_${idx}`;
          const badgeTitle = getItemBadgeTitle(item, config, idx);
          const isExpanded = expandedIds.has(item._id);

          return (
            <div
              key={stableKey}
              className={`array-item-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
            >
              <div
                className="array-item-header"
                onClick={() => toggleExpand(item._id)}
                title="Click to toggle expand/collapse"
              >
                <div className="array-item-toggle-wrap">
                  <span className="array-item-chevron">▶</span>
                  <span className="array-item-badge">#{idx + 1} {badgeTitle}</span>
                </div>
                <div className="array-item-actions" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeItem(item._id)}
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="array-item-fields">
                  {isComplex ? (
                    Object.entries(itemSchema).map(([fieldKey, fieldConf]) => (
                      <GenericField
                        key={`${stableKey}_${fieldKey}`}
                        name={fieldKey}
                        config={fieldConf}
                        value={item?.[fieldKey]}
                        onChange={(val, isDisc) => updateItem(item._id, fieldKey, val)}
                      />
                    ))
                  ) : (
                    <GenericField
                      name={`item_${idx}`}
                      config={itemSchema}
                      value={item}
                      onChange={(val, isDisc) => updateItem(item._id, null, val)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="add-array-item-btn" onClick={addItem}>
        + Add {config.itemLabel || 'Item'}
      </button>
    </fieldset>
  );
}

// 100% Generic Schema-to-Form Field Engine
function GenericField({ name, config, value, onChange }) {
  if (config.type === 'image') {
    return <ImageField name={name} config={config} value={value} onChange={val => onChange(val, true)} />;
  }

  if (config.type === 'textarea') {
    return (
      <label className="editor-field">
        <span>{config.label || name}{config.required ? ' *' : ''}</span>
        <textarea
          rows={config.rows || 3}
          value={value || ''}
          required={!!config.required}
          onChange={e => onChange(e.target.value, false)}
        />
      </label>
    );
  }

  if (config.type === 'select') {
    const options = Array.isArray(config.options) ? config.options : [];
    return (
      <label className="editor-field">
        <span>{config.label || name}{config.required ? ' *' : ''}</span>
        <select
          value={value ?? config.default ?? ''}
          required={!!config.required}
          onChange={e => onChange(e.target.value, true)}
        >
          {options.map((opt, i) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const label = typeof opt === 'object' ? opt.label : opt;
            return <option key={i} value={val}>{label}</option>;
          })}
        </select>
      </label>
    );
  }

  if (config.type === 'boolean' || config.type === 'checkbox') {
    return (
      <label className="editor-field editor-field--checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '8px 0' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked, true)}
        />
        <span style={{ fontWeight: 500 }}>{config.label || name}</span>
      </label>
    );
  }

  if (config.type === 'array' || config.type === 'list') {
    return <ArrayField name={name} config={config} value={value} onChange={onChange} />;
  }

  return (
    <label className="editor-field">
      <span>{config.label || name}{config.required ? ' *' : ''}</span>
      <input
        type={config.type === 'number' ? 'number' : 'text'}
        value={value || ''}
        required={!!config.required}
        onChange={e => onChange(e.target.value, false)}
      />
    </label>
  );
}

// 100% Generic Studio Editor Component
export default function Editor({
  mode = 'playground',
  workspace = null,
  pageData = null,
  availableThemes = [],
  initialTheme,
  initialThemeCss = '',
  initialCustomCss = '',
  initialComponents = [],
  initialPageTemplates = [],
  initialVariants = [],
  initialPage = [],
  initialHeader = null,
  initialFooter = null,
}) {
  const templates = initialPageTemplates.length > 0 ? initialPageTemplates : initialVariants;

  const [theme, setTheme] = useState(initialTheme);
  const [themeCss, setThemeCss] = useState(initialThemeCss);
  const [customCss, setCustomCss] = useState(initialCustomCss);
  const [components, setComponents] = useState(initialComponents);
  const [pageTemplates, setPageTemplates] = useState(templates);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Compile Site Header and Footer for readonly preview in workspace mode
  const compiledHeader = useMemo(() => {
    if (!initialHeader) return null;
    try {
      return compileHeader(initialHeader);
    } catch (err) {
      console.error('Error compiling header for preview:', err);
      return null;
    }
  }, [initialHeader]);

  const compiledFooter = useMemo(() => {
    if (!initialFooter) return null;
    try {
      return compileFooter(initialFooter);
    } catch (err) {
      console.error('Error compiling footer for preview:', err);
      return null;
    }
  }, [initialFooter]);

  const [showHeaderFooterPreview, setShowHeaderFooterPreview] = useState(true);

  // Initialize page ensuring all sections have stable runtime instanceIds
  const [page, setPage] = useState(() => {
    const src = (pageData?.sections && pageData.sections.length > 0) ? pageData.sections : initialPage;
    return (src || []).map((item, idx) => ({
      ...item,
      instanceId: item.instanceId || item.id || `inst_sec_${idx + 1}`
    }));
  });

  const [selectedId, setSelectedId] = useState(() => {
    const src = (pageData?.sections && pageData.sections.length > 0) ? pageData.sections : initialPage;
    const first = src?.[0];
    return first?.instanceId || first?.id || (first ? 'inst_sec_1' : '');
  });

  const [activeTemplateId, setActiveTemplateId] = useState(() => {
    return pageData?.templateId || templates[0]?.id || '';
  });

  // Stashed / Inactive sections preserved across layout/template changes
  const [stashedSections, setStashedSections] = useState(() => {
    return Array.isArray(pageData?.stashedSections) ? pageData.stashedSections : [];
  });
  const [isStashOpen, setIsStashOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState(null);

  // Workspace-specific editing state
  const [activePostId, setActivePostId] = useState(() => {
    return (pageData?.postId && !isNaN(Number(pageData.postId))) ? Number(pageData.postId) : null;
  });
  const [pageTitle, setPageTitle] = useState(() => pageData?.title || 'Untitled Page');
  const [pageSlug, setPageSlug] = useState(() => pageData?.slug || '');
  const [lastSaved, setLastSaved] = useState(() => pageData?.lastSavedAt || null);
  const [lastPublished, setLastPublished] = useState(() => pageData?.lastPublishedAt || null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [publishStatus, setPublishStatus] = useState(null);

  const [isLoadingTheme, setIsLoadingTheme] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [isPreviewFullView, setIsPreviewFullView] = useState(false);

  // Escape key exits Full View Preview
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape' && isPreviewFullView) {
        setIsPreviewFullView(false);
      }
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPreviewFullView]);

  // Phase 2: Component Picker & Drag-and-Drop state
  const [isComponentPickerOpen, setIsComponentPickerOpen] = useState(false);
  const [draggedInstanceId, setDraggedInstanceId] = useState(null);
  const [dragOverInstanceId, setDragOverInstanceId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after'

  // Phase 3: Undo / Redo History Stack
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const pageRef = useRef(page);
  pageRef.current = page;
  const historyDebounceRef = useRef(null);

  // Phase 3: Inspector Search & Category Tabs
  const [fieldSearch, setFieldSearch] = useState('');
  const [activeInspectorTab, setActiveInspectorTab] = useState('all');

  // Reset inspector search & tab when selected component changes
  useEffect(() => {
    setFieldSearch('');
    setActiveInspectorTab('all');
  }, [selectedId]);

  const leftPanelRef = useRef(null);
  const editorPanelRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const selectComponent = useCallback((instanceId, source = 'tree') => {
    if (!instanceId) return;
    setSelectedId(instanceId);

    // Smooth scroll inspector form to top so fields are immediately accessible
    if (editorPanelRef.current) {
      editorPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (source === 'tree') {
      const compEl = previewCanvasRef.current?.querySelector(`[data-instance-id="${instanceId}"]`);
      if (compEl) {
        compEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (source === 'canvas') {
      const treeRow = leftPanelRef.current?.querySelector(`[data-instance-id="${instanceId}"]`);
      if (treeRow) {
        treeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, []);

  const library = useMemo(() => Object.fromEntries(components.map(c => [c.id, c])), [components]);

  // Deduplicate Layer 2 component styles for live interactive preview canvas
  const liveComponentCss = useMemo(() => {
    const usedTypes = new Set();
    const cssList = [];
    (page || []).forEach(item => {
      if (!usedTypes.has(item.type)) {
        usedTypes.add(item.type);
        const def = library[item.type];
        const css = def?.css || def?.style_css || '';
        if (css && css.trim()) {
          cssList.push(`/* ── Component: ${item.type} ── */\n${css.trim()}`);
        }
      }
    });
    return cssList.join('\n\n');
  }, [page, library]);

  const selected = page.find(x => x.instanceId === selectedId) || page[0];
  const selectedDef = selected ? library[selected.type] : null;

  const handleSave = useCallback(async () => {
    if (mode !== 'workspace' || !workspace || !pageData) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const resolvedRowGuid = pageData.rowGuid || pageData.pageGuid || (isNaN(Number(pageData.postId)) ? pageData.postId : undefined);
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          postId: activePostId || (pageData.postId && !isNaN(Number(pageData.postId)) ? Number(pageData.postId) : resolvedRowGuid),
          rowGuid: resolvedRowGuid,
          title: pageTitle,
          slug: pageSlug,
          templateId: activeTemplateId || pageData.templateId,
          sections: page,
          stashedSections: stashedSections
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      const data = await res.json();
      setLastSaved(data.savedAt);
      setIsDirty(false);
      setSaveStatus({ type: 'success', text: `Saved at ${new Date(data.savedAt).toLocaleTimeString()}` });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  }, [mode, workspace, pageData, activePostId, pageTitle, pageSlug, activeTemplateId, page, stashedSections]);

  const handlePublish = useCallback(async () => {
    if (mode !== 'workspace' || !workspace || !pageData) return;
    setIsPublishing(true);
    setPublishStatus(null);
    try {
      // Resolve project API key: workspace object -> localStorage domain-storage
      let apiKey = workspace?.apiKey || '';
      if (!apiKey && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('domain-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            apiKey = parsed?.state?.apiKey || parsed?.apiKey || '';
          }
        } catch (_) {}
      }

      const resolvedRowGuid = pageData.rowGuid || pageData.pageGuid || (isNaN(Number(pageData.postId)) ? pageData.postId : undefined);

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          postId: activePostId || (pageData.postId && !isNaN(Number(pageData.postId)) ? Number(pageData.postId) : resolvedRowGuid),
          rowGuid: resolvedRowGuid,
          title: pageTitle,
          slug: pageSlug,
          templateId: activeTemplateId || pageData.templateId,
          sections: page,
          stashedSections: stashedSections,
          apiKey: apiKey || undefined,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish');
      }

      const data = await res.json();
      setLastPublished(data.publishedAt);
      setLastSaved(data.publishedAt);
      setIsDirty(false);

      if (data.postId && !isNaN(Number(data.postId))) {
        pageData.postId = Number(data.postId);
        setActivePostId(Number(data.postId));
      }

      if (data.wpSyncStatus === 'error') {
        setPublishStatus({
          type: 'error',
          text: `Saved locally, but WordPress sync failed: ${data.wpSyncError || 'Forbidden'}`
        });
      } else {
        // Append cache buster so clicking View Live immediately displays fresh server render
        const liveUrlWithBuster = data.liveUrl 
          ? (data.liveUrl.includes('?') ? `${data.liveUrl}&_t=${Date.now()}` : `${data.liveUrl}?_t=${Date.now()}`)
          : '';

        setPublishStatus({
          type: 'success',
          text: 'Published to WordPress!',
          liveUrl: liveUrlWithBuster
        });
        setTimeout(() => setPublishStatus(null), 8000);
      }
    } catch (err) {
      setPublishStatus({ type: 'error', text: err.message });
    } finally {
      setIsPublishing(false);
    }
  }, [mode, workspace, pageData, activePostId, pageTitle, pageSlug, activeTemplateId, page]);

  // Keyboard shortcut: Cmd+S / Ctrl+S to save in workspace mode
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (mode === 'workspace') {
          handleSave();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleSave]);

  // Warn on tab close / reload if unsaved changes exist
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  async function switchTheme(newThemeId) {
    if (newThemeId === theme?.id) return;
    setIsLoadingTheme(true);
    try {
      const res = await fetch(`/api/theme/${newThemeId}`);
      if (!res.ok) throw new Error('Failed to load theme data');
      const data = await res.json();
      setTheme(data.theme);
      setThemeCss(data.styleCss);
      setComponents(data.components);
      const incomingTemplates = data.pageTemplates || data.variants || [];
      setPageTemplates(incomingTemplates);
      setPage(data.initialPage || []);
      setActiveTemplateId(incomingTemplates[0]?.id || '');
      setSelectedId(data.initialPage[0]?.instanceId || '');
    } catch (err) {
      console.error('Error switching theme:', err);
      alert('Error switching theme: ' + err.message);
    } finally {
      setIsLoadingTheme(false);
    }
  }

  // Phase 3: History recording methods
  const recordDiscreteAction = useCallback(() => {
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current.timer);
      historyDebounceRef.current = null;
    }
    setHistoryPast(prev => [...prev.slice(-29), structuredClone(pageRef.current)]);
    setHistoryFuture([]);
  }, []);

  const recordDebouncedChange = useCallback(() => {
    if (!historyDebounceRef.current) {
      const snapshot = structuredClone(pageRef.current);
      const timer = setTimeout(() => {
        if (historyDebounceRef.current) {
          setHistoryPast(prev => [...prev.slice(-29), historyDebounceRef.current.snapshot]);
          setHistoryFuture([]);
          historyDebounceRef.current = null;
        }
      }, 700);
      historyDebounceRef.current = { snapshot, timer };
    } else {
      clearTimeout(historyDebounceRef.current.timer);
      historyDebounceRef.current.timer = setTimeout(() => {
        if (historyDebounceRef.current) {
          setHistoryPast(prev => [...prev.slice(-29), historyDebounceRef.current.snapshot]);
          setHistoryFuture([]);
          historyDebounceRef.current = null;
        }
      }, 700);
    }
  }, []);

  const undo = useCallback(() => {
    let currentPast = historyPast;
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current.timer);
      currentPast = [...historyPast.slice(-29), historyDebounceRef.current.snapshot];
      historyDebounceRef.current = null;
      setHistoryPast(currentPast);
    }
    if (currentPast.length === 0) return;

    const previousState = currentPast[currentPast.length - 1];
    setHistoryPast(currentPast.slice(0, -1));
    setHistoryFuture(prev => [structuredClone(pageRef.current), ...prev]);
    setPage(previousState);
    setIsDirty(true);

    if (previousState.length > 0 && !previousState.some(x => x.instanceId === selectedId)) {
      setSelectedId(previousState[0].instanceId);
    }
  }, [historyPast, selectedId]);

  const redo = useCallback(() => {
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current.timer);
      historyDebounceRef.current = null;
    }
    if (historyFuture.length === 0) return;

    const nextState = historyFuture[0];
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev.slice(-29), structuredClone(pageRef.current)]);
    setPage(nextState);
    setIsDirty(true);

    if (nextState.length > 0 && !nextState.some(x => x.instanceId === selectedId)) {
      setSelectedId(nextState[0].instanceId);
    }
  }, [historyFuture, selectedId]);

  // Global Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    function handleHistoryKey(e) {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (!modifier) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          if (!isInputActive) {
            e.preventDefault();
            redo();
          }
        } else {
          if (!isInputActive) {
            e.preventDefault();
            undo();
          }
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        if (!isInputActive) {
          e.preventDefault();
          redo();
        }
      }
    }
    window.addEventListener('keydown', handleHistoryKey);
    return () => window.removeEventListener('keydown', handleHistoryKey);
  }, [undo, redo]);

  // Phase 3: Categorized Inspector Schema Fields & Tabs
  const schemaEntries = useMemo(() => {
    if (!selectedDef?.schema) return [];
    return Object.entries(selectedDef.schema);
  }, [selectedDef]);

  const categorizedFields = useMemo(() => {
    const content = [];
    const media = [];
    const style = [];

    schemaEntries.forEach(([name, config]) => {
      const isMedia = config.type === 'image' ||
        /image|photo|icon|avatar|logo|bgimage|thumbnail/i.test(name) ||
        /image|photo|icon|logo/i.test(config.label || '');

      const isStyle = config.type === 'select' ||
        config.type === 'boolean' ||
        config.type === 'checkbox' ||
        /color|bg|theme|columns|variant|align|spacing|style|layout|is_?dark|show/i.test(name) ||
        /color|style|layout|alignment|theme/i.test(config.label || '');

      if (isMedia) {
        media.push([name, config]);
      } else if (isStyle) {
        style.push([name, config]);
      } else {
        content.push([name, config]);
      }
    });

    return { content, media, style };
  }, [schemaEntries]);

  // Sibling layout variations for the currently selected section
  const siblingVariants = useMemo(() => {
    if (!selectedDef) return [];
    const cat = (selectedDef.category || '').toLowerCase().trim();
    if (!cat) return [];
    return Object.values(library).filter(comp => {
      const compCat = (comp.category || '').toLowerCase().trim();
      return compCat === cat;
    });
  }, [selectedDef, library]);

  const displayedFields = useMemo(() => {
    const q = fieldSearch.toLowerCase().trim();
    let base = schemaEntries;
    if (activeInspectorTab === 'content') base = categorizedFields.content;
    else if (activeInspectorTab === 'media') base = categorizedFields.media;
    else if (activeInspectorTab === 'style') base = categorizedFields.style;

    if (!q) return base;
    return base.filter(([name, config]) => {
      const labelMatch = (config.label || '').toLowerCase().includes(q);
      const nameMatch = name.toLowerCase().includes(q);
      return labelMatch || nameMatch;
    });
  }, [schemaEntries, categorizedFields, activeInspectorTab, fieldSearch]);

  const showInspectorTabs = useMemo(() => {
    let count = 0;
    if (categorizedFields.content.length > 0) count++;
    if (categorizedFields.media.length > 0) count++;
    if (categorizedFields.style.length > 0) count++;
    return count >= 2;
  }, [categorizedFields]);

  function updateField(key, value, isDiscrete = false) {
    setIsDirty(true);
    if (isDiscrete) {
      recordDiscreteAction();
    } else {
      recordDebouncedChange();
    }
    setPage(p => p.map(x => x.instanceId === selectedId ? {
      ...x,
      content: { ...x.content, [key]: value }
    } : x));
  }

  function moveSection(id, direction) {
    recordDiscreteAction();
    setIsDirty(true);
    setPage(p => {
      const arr = [...p];
      const i = arr.findIndex(x => x.instanceId === id);
      const j = i + direction;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
    setSelectedId(id);
    setTimeout(() => {
      selectComponent(id, 'tree');
    }, 40);
  }

  function removeSection(id) {
    recordDiscreteAction();
    setIsDirty(true);
    setPage(p => {
      const next = p.filter(x => x.instanceId !== id);
      if (id === selectedId) {
        const nextId = next[0]?.instanceId || '';
        setSelectedId(nextId);
        if (nextId) {
          setTimeout(() => selectComponent(nextId, 'tree'), 40);
        }
      }
      return next;
    });
  }

  function toggleSectionVisibility(id) {
    recordDiscreteAction();
    setIsDirty(true);
    setPage(p => p.map(x => x.instanceId === id ? { ...x, hidden: !x.hidden } : x));
  }

  function duplicateSection(id) {
    recordDiscreteAction();
    setIsDirty(true);
    const targetIdx = page.findIndex(x => x.instanceId === id);
    if (targetIdx === -1) return;
    const target = page[targetIdx];
    const newInstanceId = generateUniqueId('inst');
    const cloned = {
      ...structuredClone(target),
      instanceId: newInstanceId
    };
    const next = [...page];
    next.splice(targetIdx + 1, 0, cloned);
    setPage(next);
    setSelectedId(newInstanceId);
    setTimeout(() => {
      selectComponent(newInstanceId, 'tree');
    }, 50);
  }

  function addComponent(type, position = 'bottom') {
    recordDiscreteAction();
    setIsDirty(true);
    const compDef = library[type];
    if (!compDef) return;
    const instanceId = generateUniqueId('inst');
    const content = compDef.defaults ? structuredClone(compDef.defaults) : emptyObjectFromSchema(compDef.schema);
    const newItem = { instanceId, type, content, hidden: false };

    setPage(p => {
      if (position === 'after_selected' && selectedId) {
        const curIdx = p.findIndex(x => x.instanceId === selectedId);
        if (curIdx !== -1) {
          const next = [...p];
          next.splice(curIdx + 1, 0, newItem);
          return next;
        }
      }
      return [...p, newItem];
    });

    setSelectedId(instanceId);
    setTimeout(() => {
      selectComponent(instanceId, 'tree');
    }, 60);
  }

  // HTML5 Drag-and-Drop Reordering Handlers
  const handleDragStart = (e, instanceId) => {
    setDraggedInstanceId(instanceId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', instanceId);
  };

  const handleDragOver = (e, instanceId) => {
    e.preventDefault();
    if (draggedInstanceId === instanceId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDragOverInstanceId(instanceId);
    setDropPosition(pos);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e, instanceId) => {
    if (dragOverInstanceId === instanceId) {
      setDragOverInstanceId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e, targetInstanceId) => {
    e.preventDefault();
    if (!draggedInstanceId || draggedInstanceId === targetInstanceId) {
      setDraggedInstanceId(null);
      setDragOverInstanceId(null);
      setDropPosition(null);
      return;
    }
    recordDiscreteAction();
    setIsDirty(true);
    const fromId = draggedInstanceId;
    const pos = dropPosition;

    setPage(prevPage => {
      const fromIdx = prevPage.findIndex(x => x.instanceId === fromId);
      if (fromIdx === -1) return prevPage;
      const next = [...prevPage];
      const [moved] = next.splice(fromIdx, 1);
      let toIdx = next.findIndex(x => x.instanceId === targetInstanceId);
      if (toIdx === -1) return prevPage;
      if (pos === 'after') {
        toIdx += 1;
      }
      next.splice(toIdx, 0, moved);
      return next;
    });

    setDraggedInstanceId(null);
    setDragOverInstanceId(null);
    setDropPosition(null);
    setTimeout(() => {
      selectComponent(fromId, 'tree');
    }, 40);
  };

  const handleDragEnd = () => {
    setDraggedInstanceId(null);
    setDragOverInstanceId(null);
    setDropPosition(null);
  };

  // Load a complete Page Template skeleton with non-destructive content preservation
  function loadTemplate(templateId) {
    recordDiscreteAction();
    setIsDirty(true);
    const template = pageTemplates.find(t => t.id === templateId);
    if (!template) return;
    setActiveTemplateId(templateId);

    // Non-destructively match existing sections to target template
    const { newSections, stashedSections: newlyStashed } = matchSectionsForTemplate(
      page,
      template.components || [],
      library
    );

    setPage(newSections);
    setSelectedId(newSections[0]?.instanceId || '');

    if (newlyStashed.length > 0) {
      setStashedSections(prev => [...newlyStashed, ...prev]);
      setIsStashOpen(true);
      setTemplateNotice({
        type: 'info',
        text: `Applied "${template.name}". ${newlyStashed.length} unmapped section${newlyStashed.length > 1 ? 's' : ''} moved to Stash.`
      });
      setTimeout(() => setTemplateNotice(null), 6000);
    } else {
      setTemplateNotice({
        type: 'success',
        text: `Template "${template.name}" applied with your content preserved!`
      });
      setTimeout(() => setTemplateNotice(null), 4000);
    }
  }

  // Restore a stashed section back into the active page canvas
  const restoreStashedSection = (instanceId) => {
    recordDiscreteAction();
    setIsDirty(true);
    const item = stashedSections.find(x => x.instanceId === instanceId);
    if (!item) return;

    setStashedSections(prev => prev.filter(x => x.instanceId !== instanceId));

    const restored = {
      instanceId: item.instanceId || `inst_${Date.now()}`,
      type: item.type,
      content: item.content || {},
      hidden: false
    };

    setPage(prev => [...prev, restored]);
    setSelectedId(restored.instanceId);
    setTemplateNotice({
      type: 'success',
      text: `Restored "${library[item.type]?.name || item.type}" to active page!`
    });
    setTimeout(() => setTemplateNotice(null), 3000);
  };

  // Permanently remove a section from stash
  const deleteStashedSection = (instanceId) => {
    recordDiscreteAction();
    setIsDirty(true);
    setStashedSections(prev => prev.filter(x => x.instanceId !== instanceId));
  };

  // Swap section layout variant while preserving all user-customized fields
  const swapSectionVariant = (instanceId, newType) => {
    recordDiscreteAction();
    setIsDirty(true);

    const targetDef = library[newType];
    if (!targetDef) return;

    setPage(prevPage => prevPage.map(sec => {
      if (sec.instanceId !== instanceId) return sec;

      const mergedContent = mergeVariantProps(
        sec.content || {},
        targetDef.defaults || {}
      );

      return {
        ...sec,
        type: newType,
        content: mergedContent
      };
    }));

    setTemplateNotice({
      type: 'success',
      text: `Swapped to "${targetDef.name}". Your content was preserved!`
    });
    setTimeout(() => setTemplateNotice(null), 3000);
  };

  // Backward compatibility alias
  const loadVariant = loadTemplate;

  // Save current composition as a reusable Page Template skeleton
  function saveAsTemplate() {
    const templateSkeleton = {
      id: `template-custom-${Date.now().toString(36)}`,
      name: `Custom ${theme?.name || 'Theme'} Template`,
      description: 'Exported from Bizfire Page Editor studio.',
      components: page.map(item => ({ type: item.type }))
    };

    const blob = new Blob([JSON.stringify(templateSkeleton, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateSkeleton.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Backward compatibility alias
  const saveAsPageVariant = saveAsTemplate;

  // Generate complete, self-contained, high-performance HTML (excluding hidden sections)
  function generateFullHtml() {
    const renderedSections = page
      .filter(item => !item.hidden)
      .map(item => {
        const def = library[item.type];
        if (!def) return '';
        try {
          return Handlebars.compile(def.template)(item.content);
        } catch (err) {
          console.error('Handlebars compile error:', err);
          return '';
        }
      }).join('\n\n');

    // Deduplicate Layer 2 component styles for active visible sections
    const usedTypes = new Set();
    const componentCssList = [];
    page
      .filter(item => !item.hidden)
      .forEach(item => {
        if (!usedTypes.has(item.type)) {
          usedTypes.add(item.type);
          const def = library[item.type];
          const css = def?.css || def?.style_css || '';
          if (css && css.trim()) {
            componentCssList.push(`/* ── Component: ${item.type} ── */\n${css.trim()}`);
          }
        }
      });

    const combinedComponentCss = componentCssList.join('\n\n');

    const fontLink = theme?.fontUrl
      ? `<link rel="stylesheet" href="${theme.fontUrl}">`
      : `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Page - ${theme?.name || 'Bizfire'}</title>
  <meta name="description" content="Clean, fast standalone service page powered by Bizfire Component Engine.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontLink}
  <!-- Layer 1: Theme Common Tokens & Typography -->
  <style id="theme-common-styles">
${themeCss}
  </style>
  ${combinedComponentCss ? `<!-- Layer 2: Scoped Component Styles -->\n  <style id="component-scoped-styles">\n${combinedComponentCss}\n  </style>` : ''}
  ${customCss && customCss.trim() ? `<!-- Layer 3: Workspace Custom Overrides (Cascades Last) -->\n  <style id="workspace-custom-styles">\n/* ── Workspace Custom Overrides ── */\n${customCss.trim()}\n  </style>` : ''}
</head>
<body>
${renderedSections}
  <script src="/assets/js/script.js" defer></script>
  <script>
    window.openQuotePopup = window.openQuotePopup || function() {
      alert("Schedule Service: Call our dispatch team at (123) 456-7890.");
    };
    window.openRedeemPopup = window.openRedeemPopup || function() {
      alert("Special Offer: Coupon has been claimed!");
    };
  </script>
</body>
</html>`;
  }

  function exportHtml() {
    const html = generateFullHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'page.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  }

  return (
    <main className="editor-shell">
      <header className="app-header">
        {mode === 'workspace' ? (
          <>
            <div className="brand-wrap">
              <Link
                href={`/editor/${workspace?.workspaceId}`}
                className="ws-back-btn"
                title="Back to workspace pages"
                onClick={(e) => {
                  if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
                    e.preventDefault();
                  }
                }}
              >
                ← Pages
              </Link>
              <div className="ws-header-page-info">
                <div className="ws-header-title-row">
                  <input
                    type="text"
                    className="ws-header-title-input"
                    value={pageTitle}
                    onChange={e => { setPageTitle(e.target.value); setIsDirty(true); }}
                    title="Click to edit page title"
                  />
                  {activePostId || (pageData?.postId && !isNaN(Number(pageData.postId))) ? (
                    <span className="post-id-tag">#{activePostId || pageData.postId}</span>
                  ) : (
                    <span className="post-id-tag draft-tag">Draft</span>
                  )}
                </div>
                <div className="ws-header-sub-row">
                  <span className="ws-header-client">{workspace?.clientName}</span>
                  <span className="ws-dot-separator">·</span>
                  <code className="ws-header-slug">/{pageSlug}</code>
                </div>
              </div>
            </div>

            <div className="header-actions">
              {/* Full View Preview Toggle */}
              <button
                type="button"
                className={`btn-full-preview-header ${isPreviewFullView ? 'is-active' : ''}`}
                onClick={() => setIsPreviewFullView(v => !v)}
                title={isPreviewFullView ? "Exit Full View (Show Sidebars) [Esc]" : "Full View Preview (Hide Sidebars)"}
              >
                {isPreviewFullView ? '◨ Split View' : '⛶ Full View'}
              </button>

              {/* History Undo / Redo */}
              <div className="history-btn-group" role="group" aria-label="Undo and Redo">
                <button
                  type="button"
                  className="btn-history-action"
                  onClick={undo}
                  disabled={historyPast.length === 0}
                  title="Undo (Ctrl+Z / Cmd+Z)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  className="btn-history-action"
                  onClick={redo}
                  disabled={historyFuture.length === 0}
                  title="Redo (Ctrl+Y / Cmd+Shift+Z)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                  </svg>
                  <span>Redo</span>
                </button>
              </div>

              {/* Publish / Saved Status Badge */}
              {!lastPublished ? (
                <span className="status-badge badge-draft" title="This page has never been published to WordPress">
                  ● Draft
                </span>
              ) : isDirty ? (
                <span
                  suppressHydrationWarning
                  className="status-badge badge-changes"
                  title={`Published at ${new Date(lastPublished).toLocaleTimeString()}, with unsaved edits`}
                >
                  ● Unpublished Changes
                </span>
              ) : (
                <span
                  suppressHydrationWarning
                  className="status-badge badge-published"
                  title={`Published at ${new Date(lastPublished).toLocaleTimeString()}`}
                >
                  ✓ Published
                </span>
              )}

              {saveStatus && (
                <span className={`save-status-msg ${saveStatus.type}`}>
                  {saveStatus.text}
                </span>
              )}

              {publishStatus && (
                <span className={`save-status-msg ${publishStatus.type}`}>
                  {publishStatus.text}
                  {publishStatus.liveUrl && (
                    <a
                      href={publishStatus.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ws-live-link"
                    >
                      View Live ↗
                    </a>
                  )}
                </span>
              )}

              <span className="theme-pill-badge">
                Theme: {theme?.name || 'Cloned Theme'}
              </span>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={isSaving}
                title="Save changes (Ctrl+S / Cmd+S)"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>

              <button
                type="button"
                className="btn-publish"
                onClick={handlePublish}
                disabled={isPublishing}
                title="Compile and push page HTML to WordPress"
              >
                {isPublishing ? 'Publishing...' : 'Publish to WordPress'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="brand-wrap">
              <span className="brand-mark">B</span>
              <div className="brand-title">
                <strong>Bizfire Theme Playground</strong>
                <span>Canonical Git Theme Library Engine</span>
              </div>
            </div>

            <div className="header-actions">
              {/* Full View Preview Toggle */}
              <button
                type="button"
                className={`btn-full-preview-header ${isPreviewFullView ? 'is-active' : ''}`}
                onClick={() => setIsPreviewFullView(v => !v)}
                title={isPreviewFullView ? "Exit Full View (Show Sidebars) [Esc]" : "Full View Preview (Hide Sidebars)"}
              >
                {isPreviewFullView ? '◨ Split View' : '⛶ Full View'}
              </button>

              {/* History Undo / Redo */}
              <div className="history-btn-group" role="group" aria-label="Undo and Redo">
                <button
                  type="button"
                  className="btn-history-action"
                  onClick={undo}
                  disabled={historyPast.length === 0}
                  title="Undo (Ctrl+Z / Cmd+Z)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  className="btn-history-action"
                  onClick={redo}
                  disabled={historyFuture.length === 0}
                  title="Redo (Ctrl+Y / Cmd+Shift+Z)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                  </svg>
                  <span>Redo</span>
                </button>
              </div>

              {availableThemes.length > 1 ? (
                <div className="theme-switcher-box">
                  <label htmlFor="theme-select" className="theme-switcher-label">ACTIVE THEME:</label>
                  <select
                    id="theme-select"
                    className="theme-select-input"
                    value={theme?.id}
                    onChange={e => switchTheme(e.target.value)}
                    disabled={isLoadingTheme}
                  >
                    {availableThemes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (v{t.version || '1.0'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="theme-pill-badge">
                  Theme: {theme?.name || 'Trades Modern'} (v{theme?.version || '1.0'})
                </span>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={saveAsTemplate}
                title="Export reusable layout skeleton without customer content"
              >
                Save as Template ⤓
              </button>
              <button
                type="button"
                className={`export-button ${exportSuccess ? 'is-success' : ''}`}
                onClick={exportHtml}
                title="Download standalone, ultra-optimized HTML5 page"
              >
                {exportSuccess ? '✓ Exported page.html' : 'Export as HTML ⤓'}
              </button>
            </div>
          </>
        )}
      </header>

      <div className={`page-editor-grid ${isPreviewFullView ? 'is-full-preview' : ''}`}>
        {/* Left Sidebar: Page Composition & Template Selector */}
        <aside ref={leftPanelRef} className="component-list-panel">
          {templateNotice && (
            <div className={`template-notice-banner template-notice--${templateNotice.type}`}>
              <span>{templateNotice.text}</span>
              <button type="button" onClick={() => setTemplateNotice(null)}>×</button>
            </div>
          )}

          {pageTemplates.length > 0 && (
            <div className="variant-selector-box">
              <label>PAGE TEMPLATE</label>
              <select
                value={activeTemplateId}
                onChange={e => loadTemplate(e.target.value)}
              >
                {pageTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="panel-kicker">PAGE SECTIONS ({page.length})</p>
            <div className="component-list">
              {page.map((item, idx) => {
                const def = library[item.type];
                const isSelected = item.instanceId === selectedId;
                const isDragging = item.instanceId === draggedInstanceId;
                const isDragOver = item.instanceId === dragOverInstanceId;

                return (
                  <div
                    key={item.instanceId}
                    data-instance-id={item.instanceId}
                    draggable={true}
                    onDragStart={e => handleDragStart(e, item.instanceId)}
                    onDragOver={e => handleDragOver(e, item.instanceId)}
                    onDragLeave={e => handleDragLeave(e, item.instanceId)}
                    onDrop={e => handleDrop(e, item.instanceId)}
                    onDragEnd={handleDragEnd}
                    className={`component-row ${isSelected ? 'is-selected' : ''} ${item.hidden ? 'is-hidden' : ''} ${isDragging ? 'is-dragging' : ''} ${isDragOver ? (dropPosition === 'before' ? 'drop-indicator-before' : 'drop-indicator-after') : ''}`}
                    onClick={() => selectComponent(item.instanceId, 'tree')}
                  >
                    <div className="component-row-drag-handle" title="Drag to reorder section">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="5" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="9" cy="19" r="1.5" />
                        <circle cx="15" cy="5" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="15" cy="19" r="1.5" />
                      </svg>
                    </div>

                    <div className="component-row-info">
                      <div className="component-row-meta">
                        <small>SECTION {idx + 1}</small>
                        {item.hidden && <span className="badge-hidden">Hidden</span>}
                      </div>
                      <strong>{def?.name || item.type}</strong>
                    </div>

                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-row-action"
                        onClick={e => { e.stopPropagation(); moveSection(item.instanceId, -1); }}
                        disabled={idx === 0}
                        title="Move section up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-row-action"
                        onClick={e => { e.stopPropagation(); moveSection(item.instanceId, 1); }}
                        disabled={idx === page.length - 1}
                        title="Move section down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={`btn-row-action ${item.hidden ? 'is-hidden-active' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleSectionVisibility(item.instanceId); }}
                        title={item.hidden ? "Unhide section" : "Hide section from page"}
                      >
                        {item.hidden ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-row-action"
                        onClick={e => { e.stopPropagation(); duplicateSection(item.instanceId); }}
                        title="Duplicate section"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="btn-row-action btn-danger"
                        onClick={e => { e.stopPropagation(); removeSection(item.instanceId); }}
                        title="Remove section"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="add-component-box">
            <button
              type="button"
              className="btn-add-component-trigger"
              onClick={() => setIsComponentPickerOpen(true)}
              title="Open Component Library Catalog"
            >
              <span style={{ fontSize: '15px' }}>＋</span>
              <span>Add Component to Page</span>
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Import or upload components to library"
              >
                <span>🧩</span>
                <span>Import to Library</span>
              </button>
            </div>
          </div>

          {/* Stashed / Inactive Sections Drawer (Option B) */}
          {stashedSections.length > 0 && (
            <div className="stashed-sections-drawer">
              <div
                className="stashed-drawer-header"
                onClick={() => setIsStashOpen(!isStashOpen)}
                title="Click to expand/collapse stashed sections"
              >
                <div className="stashed-drawer-title">
                  <span className="stashed-icon">📦</span>
                  <strong>STASHED SECTIONS ({stashedSections.length})</strong>
                </div>
                <span className="stashed-chevron">{isStashOpen ? '▲' : '▼'}</span>
              </div>

              {isStashOpen && (
                <div className="stashed-list">
                  <p className="stashed-hint">Preserved from previous layouts. Restore to canvas or delete permanently.</p>
                  {stashedSections.map((item, idx) => {
                    const def = library[item.type];
                    const titleSnippet = item.content?.title || item.content?.heading || item.type;
                    return (
                      <div key={item.instanceId || `stash_${idx}`} className="stashed-item-card">
                        <div className="stashed-item-info">
                          <span className="stashed-item-type">{def?.name || item.type}</span>
                          <span className="stashed-item-snippet">{String(titleSnippet).length > 25 ? `${String(titleSnippet).slice(0, 25)}…` : String(titleSnippet)}</span>
                        </div>
                        <div className="stashed-item-actions">
                          <button
                            type="button"
                            className="btn-stash-restore"
                            onClick={() => restoreStashedSection(item.instanceId)}
                            title="Restore section to page canvas"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            className="btn-stash-delete"
                            onClick={() => deleteStashedSection(item.instanceId)}
                            title="Delete permanently"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="sidebar-tools-box">
            <details>
              <summary>Page JSON State</summary>
              <pre>{JSON.stringify(page, null, 2)}</pre>
            </details>
            <details>
              <summary>Compiled HTML Markup</summary>
              <pre>{generateFullHtml()}</pre>
            </details>
          </div>
        </aside>

        {/* Center Sidebar: Generic Schema Form Engine with Component-Not-Found safety */}
        <aside ref={editorPanelRef} className="editor-panel">
          {selected ? (
            selectedDef ? (
              <>
                <div className="panel-heading">
                  <div className="panel-heading-header">
                    <div>
                      <p className="panel-kicker">{selectedDef.category || 'COMPONENT'}</p>
                      <h1>{selectedDef.name}</h1>
                    </div>
                    <span className="panel-field-count-badge">
                      {schemaEntries.length} {schemaEntries.length === 1 ? 'field' : 'fields'}
                    </span>
                  </div>
                  <span>Inferred from <code>{selectedDef.id}/schema.json</code></span>

                  {/* Option A: Sibling Layout Variations Bar */}
                  {siblingVariants.length >= 2 && (
                    <div className="variant-thumbnails-section">
                      <div className="variant-thumbnails-header">
                        <span className="variant-thumbnails-label">LAYOUT VARIATIONS ({siblingVariants.length})</span>
                        <span className="variant-thumbnails-sub">Click to swap style & preserve copy</span>
                      </div>
                      <div className="variant-thumbnails-row">
                        {siblingVariants.map(variant => {
                          const isActive = variant.id === selected.type;
                          const wireframeSvg = getLayoutSvgWireframe(variant.id, variant.category);

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              className={`variant-card ${isActive ? 'is-active' : ''}`}
                              onClick={() => {
                                if (!isActive) swapSectionVariant(selected.instanceId, variant.id);
                              }}
                              title={`${variant.name} (${variant.id})`}
                            >
                              <div
                                className="variant-card-thumbnail"
                                dangerouslySetInnerHTML={{ __html: wireframeSvg }}
                              />
                              <div className="variant-card-meta">
                                <span className="variant-card-name">{variant.name}</span>
                                {isActive && <span className="variant-badge-active">Active</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {schemaEntries.length >= 3 && (
                    <div className="inspector-search-wrap">
                      <span className="inspector-search-icon">🔍</span>
                      <input
                        type="text"
                        className="inspector-search-input"
                        placeholder="Filter fields (e.g. title, image)..."
                        value={fieldSearch}
                        onChange={e => setFieldSearch(e.target.value)}
                      />
                      {fieldSearch && (
                        <button
                          type="button"
                          className="inspector-search-clear"
                          onClick={() => setFieldSearch('')}
                          title="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}

                  {!fieldSearch && showInspectorTabs && (
                    <div className="inspector-tabs" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeInspectorTab === 'all'}
                        className={`inspector-tab ${activeInspectorTab === 'all' ? 'is-active' : ''}`}
                        onClick={() => setActiveInspectorTab('all')}
                      >
                        All ({schemaEntries.length})
                      </button>
                      {categorizedFields.content.length > 0 && (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeInspectorTab === 'content'}
                          className={`inspector-tab ${activeInspectorTab === 'content' ? 'is-active' : ''}`}
                          onClick={() => setActiveInspectorTab('content')}
                        >
                          📝 Content ({categorizedFields.content.length})
                        </button>
                      )}
                      {categorizedFields.media.length > 0 && (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeInspectorTab === 'media'}
                          className={`inspector-tab ${activeInspectorTab === 'media' ? 'is-active' : ''}`}
                          onClick={() => setActiveInspectorTab('media')}
                        >
                          🖼 Media ({categorizedFields.media.length})
                        </button>
                      )}
                      {categorizedFields.style.length > 0 && (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeInspectorTab === 'style'}
                          className={`inspector-tab ${activeInspectorTab === 'style' ? 'is-active' : ''}`}
                          onClick={() => setActiveInspectorTab('style')}
                        >
                          ⚙ Style ({categorizedFields.style.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="fields">
                  {displayedFields.length === 0 ? (
                    <div className="inspector-empty-filter">
                      <p>No fields found matching "{fieldSearch}"</p>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => { setFieldSearch(''); setActiveInspectorTab('all'); }}
                      >
                        Reset search filter
                      </button>
                    </div>
                  ) : (
                    displayedFields.map(([name, config]) => (
                      <GenericField
                        key={name}
                        name={name}
                        config={config}
                        value={selected.content?.[name]}
                        onChange={(v, isDisc) => updateField(name, v, isDisc)}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="component-missing-alert">
                <h3>⚠️ Component "{selected.type}" Not Found</h3>
                <p>
                  This section references a component that is not available in the current theme.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => removeSection(selected.instanceId)}
                >
                  Remove Section
                </button>
              </div>
            )
          ) : (
            <p>Select a section to edit.</p>
          )}
        </aside>

        {/* Right Panel: Live Handlebars Preview Styled by Active Theme */}
        <section className="preview-panel">
          <div className="preview-toolbar">
            <div className="preview-toolbar-meta">
              <strong>{mode === 'workspace' ? 'Workspace Page Preview' : 'Live Page Preview'}</strong>
              <span className="preview-meta-caption">
                {mode === 'workspace'
                  ? `Rendered with ${theme?.name || 'cloned theme'} style.css`
                  : 'pure Handlebars + active theme style.css'}
              </span>
            </div>

            {/* Device Viewport Mode Switcher */}
            <div className="viewport-switcher" role="group" aria-label="Device Viewport Switcher">
              <button
                type="button"
                className={`viewport-btn ${viewportMode === 'desktop' ? 'is-active' : ''}`}
                onClick={() => setViewportMode('desktop')}
                title="Desktop View (Full Width)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>Desktop</span>
              </button>
              <button
                type="button"
                className={`viewport-btn ${viewportMode === 'tablet' ? 'is-active' : ''}`}
                onClick={() => setViewportMode('tablet')}
                title="Tablet View (768px)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>Tablet</span>
              </button>
              <button
                type="button"
                className={`viewport-btn ${viewportMode === 'mobile' ? 'is-active' : ''}`}
                onClick={() => setViewportMode('mobile')}
                title="Mobile View (375px)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>Mobile</span>
              </button>
            </div>

            {/* Full View Preview Toggle in Canvas Toolbar */}
            <button
              type="button"
              className={`btn-preview-mode-toggle ${isPreviewFullView ? 'is-active' : ''}`}
              onClick={() => setIsPreviewFullView(v => !v)}
              title={isPreviewFullView ? "Exit Full View (Show Sidebars) [Esc]" : "Full View Preview (Hide Sidebars)"}
            >
              {isPreviewFullView ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    <path d="M15 3v18" />
                  </svg>
                  <span>Exit Full View</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  <span>Full View</span>
                </>
              )}
            </button>

            <div className="preview-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mode === 'workspace' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowThemeModal(true)}
                  title="Customize Theme in Offcanvas Drawer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>🎨</span>
                  <span>Theme: {theme?.name || 'Styling'}</span>
                </button>
              )}
              {mode === 'workspace' && (compiledHeader || compiledFooter) && (
                <button
                  type="button"
                  className={`btn-preview-toggle ${showHeaderFooterPreview ? 'is-active' : ''}`}
                  onClick={() => setShowHeaderFooterPreview(v => !v)}
                  title="Toggle Site Header & Footer preview in canvas"
                >
                  {showHeaderFooterPreview ? '✓ Header & Footer On' : 'Header & Footer Off'}
                </button>
              )}
              {mode === 'workspace' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  title="Publish changes to WordPress"
                >
                  {isPublishing ? 'Publishing...' : 'Quick Publish'}
                </button>
              ) : (
                <button
                  type="button"
                  className={`export-button export-button--toolbar ${exportSuccess ? 'is-success' : ''}`}
                  onClick={exportHtml}
                  title="Download standalone HTML file"
                >
                  {exportSuccess ? '✓ Exported!' : 'Export HTML ⤓'}
                </button>
              )}
            </div>
          </div>

          <div
            ref={previewCanvasRef}
            className={`preview-viewport-scroll-container ${viewportMode !== 'desktop' ? 'is-framed' : ''}`}
          >
            <div className={`preview-canvas page-preview preview-canvas--${viewportMode}`}>
            {/* Inject Active Theme Google Font & CSS into preview */}
            {theme?.fontUrl && (
              <link rel="stylesheet" href={theme.fontUrl} />
            )}
            {/* Layer 1: Master Theme Baseline */}
            <style id="live-theme-styles" dangerouslySetInnerHTML={{ __html: themeCss }} />
            {/* Layer 2: Deduplicated Scoped Component CSS */}
            {liveComponentCss ? (
              <style id="live-component-styles" dangerouslySetInnerHTML={{ __html: liveComponentCss }} />
            ) : null}
            {/* Layer 3: Workspace Custom Overrides (Cascades Last) */}
            {customCss ? (
              <style id="live-workspace-custom-styles" dangerouslySetInnerHTML={{ __html: customCss }} />
            ) : null}

            {mode === 'workspace' && (
              showHeaderFooterPreview && compiledHeader ? (
                <div
                  className="editor-shell-preview-wrapper header-preview-wrapper"
                  onClickCapture={(e) => {
                    const anchor = e.target.closest('a');
                    if (anchor) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    const button = e.target.closest('button');
                    if (button && !button.classList.contains('bizfire-hamburger-toggle')) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <div className="editor-shell-preview-bar top">
                    <div className="shell-preview-meta">
                      <span className="shell-preview-dot"></span>
                      <strong>Site Header</strong>
                      <span className="shell-preview-badge">Readonly Preview</span>
                    </div>
                    {workspace?.workspaceId && (
                      <Link
                        href={`/editor/${workspace.workspaceId}/header`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shell-preview-link"
                        title="Edit Header & Navigation in Studio (Opens in new tab)"
                      >
                        Edit Header Studio ↗
                      </Link>
                    )}
                  </div>
                  <div
                    className="editor-shell-preview-content"
                    dangerouslySetInnerHTML={{
                      __html: `${compiledHeader.css}\n${compiledHeader.html}`,
                    }}
                  />
                </div>
              ) : (
                <div className="wp-preview-shell-banner top">
                  <span>WordPress Theme Header & Navigation</span>
                  <small>Provided by client's active WordPress theme</small>
                </div>
              )
            )}

            {page.map((item, idx) => {
              const def = library[item.type];
              const isSelected = item.instanceId === selectedId;

              if (item.hidden) {
                return (
                  <div
                    key={item.instanceId}
                    data-instance-id={item.instanceId}
                    className={`preview-component preview-component--hidden ${isSelected ? 'is-selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectComponent(item.instanceId, 'canvas');
                    }}
                  >
                    <div className="preview-hidden-banner">
                      <div className="preview-hidden-banner-info">
                        <span className="hidden-icon">👁️‍🗨️</span>
                        <div>
                          <strong>{def?.name || item.type} (Hidden)</strong>
                          <small>This section is hidden and will not appear on published page</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-unhide-section"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionVisibility(item.instanceId);
                        }}
                      >
                        Unhide Section
                      </button>
                    </div>
                  </div>
                );
              }

              if (!def) {
                return (
                  <div
                    key={item.instanceId}
                    data-instance-id={item.instanceId}
                    className={`preview-component preview-component-missing ${isSelected ? 'is-selected' : ''}`}
                    onClick={(e) => {
                      const linkOrBtn = e.target.closest('a, button');
                      if (linkOrBtn) e.preventDefault();
                      selectComponent(item.instanceId, 'canvas');
                    }}
                  >
                    <span>⚠️ Component <code>{item.type}</code> not found in active theme</span>
                  </div>
                );
              }

              const html = Handlebars.compile(def.template)(item.content);

              return (
                <div
                  key={item.instanceId}
                  data-instance-id={item.instanceId}
                  className={`preview-component ${isSelected ? 'is-selected' : ''}`}
                  onClick={(e) => {
                    const linkOrBtn = e.target.closest('a, button');
                    if (linkOrBtn) e.preventDefault();
                    selectComponent(item.instanceId, 'canvas');
                  }}
                >
                  {isSelected && (
                    <div className="preview-floating-toolbar" onClick={e => e.stopPropagation()}>
                      <div className="preview-floating-title">
                        <span className="preview-floating-index">#{idx + 1}</span>
                        <span className="preview-floating-name">{def.name}</span>
                      </div>

                      <div className="preview-floating-divider" />

                      <div className="preview-floating-actions">
                        <button
                          type="button"
                          className="btn-floating-action"
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); moveSection(item.instanceId, -1); }}
                          title="Move section up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn-floating-action"
                          disabled={idx === page.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveSection(item.instanceId, 1); }}
                          title="Move section down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn-floating-action"
                          onClick={(e) => { e.stopPropagation(); duplicateSection(item.instanceId); }}
                          title="Duplicate section"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn-floating-action"
                          onClick={(e) => { e.stopPropagation(); toggleSectionVisibility(item.instanceId); }}
                          title="Hide section from page"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn-floating-action btn-floating-add"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsComponentPickerOpen(true);
                          }}
                          title="Insert new component below"
                        >
                          ＋ Add Below
                        </button>
                        <button
                          type="button"
                          className="btn-floating-action btn-floating-danger"
                          onClick={(e) => { e.stopPropagation(); removeSection(item.instanceId); }}
                          title="Remove section"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="preview-component-content" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              );
            })}

            {mode === 'workspace' && (
              showHeaderFooterPreview && compiledFooter ? (
                <div
                  className="editor-shell-preview-wrapper footer-preview-wrapper"
                  onClickCapture={(e) => {
                    const anchor = e.target.closest('a');
                    if (anchor) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <div className="editor-shell-preview-bar bottom">
                    <div className="shell-preview-meta">
                      <span className="shell-preview-dot"></span>
                      <strong>Site Footer</strong>
                      <span className="shell-preview-badge">Readonly Preview</span>
                    </div>
                    {workspace?.workspaceId && (
                      <Link
                        href={`/editor/${workspace.workspaceId}/footer`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shell-preview-link"
                        title="Edit Footer in Studio (Opens in new tab)"
                      >
                        Edit Footer Studio ↗
                      </Link>
                    )}
                  </div>
                  <div
                    className="editor-shell-preview-content"
                    dangerouslySetInnerHTML={{
                      __html: `${compiledFooter.css}\n${compiledFooter.html}`,
                    }}
                  />
                </div>
              ) : (
                <div className="wp-preview-shell-banner bottom">
                  <span>WordPress Theme Footer & Copyright</span>
                  <small>Provided by client's active WordPress theme</small>
                </div>
              )
            )}
            </div>
          </div>

          {/* Floating Exit Button when in Full View Preview Mode */}
          {isPreviewFullView && (
            <div
              className="full-view-exit-badge"
              onClick={() => setIsPreviewFullView(false)}
              title="Click to exit full view (or press Esc)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Exit Full View (Esc)</span>
            </div>
          )}
        </section>
      </div>

      <ImportComponentsModal
        show={isImportModalOpen}
        onHide={() => setIsImportModalOpen(false)}
        workspaceId={workspace?.workspaceId}
        onSuccess={async () => {
          try {
            if (workspace?.workspaceId) {
              const res = await fetch(`/api/theme/${workspace.workspaceId}`);
              if (res.ok) {
                const data = await res.json();
                if (data.components) {
                  setComponents(data.components);
                }
              }
            }
          } catch (err) {
            console.warn('Failed to reload components in editor:', err);
          }
        }}
      />

      <ComponentPickerModal
        isOpen={isComponentPickerOpen}
        onClose={() => setIsComponentPickerOpen(false)}
        components={components}
        onSelectComponent={(type, position) => {
          addComponent(type, position);
        }}
        selectedSectionIndex={page.findIndex(x => x.instanceId === selectedId)}
        totalSections={page.length}
      />

      {showThemeModal && (
        <ThemeEditorOffcanvas
          show={showThemeModal}
          onHide={() => setShowThemeModal(false)}
          theme={{
            name: theme?.name,
            slug: theme?.id || 'trades-modern',
            css: themeCss,
            fontFamily: theme?.fontFamily,
            fontUrl: theme?.fontUrl,
            themeSettings: theme?.themeSettings,
            isMaster: Boolean(theme?.isMaster)
          }}
          onSuccess={(updated) => {
            if (updated?.css) {
              setThemeCss(updated.css);
            }
            if (updated?.fontUrl) {
              setTheme(prev => ({
                ...prev,
                fontUrl: updated.fontUrl,
                fontFamily: updated.fontFamily,
                name: updated.name
              }));
            }
          }}
        />
      )}
    </main>
  );
}
