'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Handlebars from 'handlebars';
import ImageCropperModal from './ImageCropperModal';
import { compileHeader } from '@/lib/headerCompiler.js';
import { compileFooter } from '@/lib/footerCompiler.js';

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

// 100% Generic Schema-to-Form Field Engine
function GenericField({ name, config, value, onChange }) {
  if (config.type === 'image') {
    return <ImageField name={name} config={config} value={value} onChange={onChange} />;
  }

  if (config.type === 'textarea') {
    return (
      <label className="editor-field">
        <span>{config.label || name}{config.required ? ' *' : ''}</span>
        <textarea
          rows={config.rows || 3}
          value={value || ''}
          required={!!config.required}
          onChange={e => onChange(e.target.value)}
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
          onChange={e => onChange(e.target.value)}
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
          onChange={e => onChange(e.target.checked)}
        />
        <span style={{ fontWeight: 500 }}>{config.label || name}</span>
      </label>
    );
  }

  if (config.type === 'array' || config.type === 'list') {
    const rawItems = Array.isArray(value) ? value : [];
    const items = sanitizeArrayItems(rawItems);
    const itemSchema = config.itemSchema || { text: { type: 'text', label: 'Item' } };
    const isComplex = typeof itemSchema === 'object' && !itemSchema.type;

    function addItem() {
      const newItem = isComplex ? emptyObjectFromSchema(itemSchema) : '';
      const itemWithId = typeof newItem === 'object'
        ? { _id: generateUniqueId('itm'), ...newItem }
        : newItem;
      onChange([...items, itemWithId]);
    }

    function updateItem(targetId, key, val) {
      const next = items.map(item => {
        if (item._id !== targetId) return item;
        return isComplex ? { ...item, [key]: val } : val;
      });
      onChange(next);
    }

    function removeItem(targetId) {
      onChange(items.filter(item => item._id !== targetId));
    }

    function moveItem(index, dir) {
      const targetIndex = index + dir;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      const next = [...items];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      onChange(next);
    }

    return (
      <fieldset className="editor-field editor-field--array">
        <legend>
          <span>{config.label || name} <small>({items.length})</small></span>
        </legend>
        <div className="array-items-list">
          {items.map((item, idx) => {
            const stableKey = item._id || `item_${idx}`;
            const badgeTitle = getItemBadgeTitle(item, config, idx);

            return (
              <div key={stableKey} className="array-item-card">
                <div className="array-item-header">
                  <span className="array-item-badge">#{idx + 1} {badgeTitle}</span>
                  <div className="row-actions">
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
                <div className="array-item-fields">
                  {isComplex ? (
                    Object.entries(itemSchema).map(([fieldKey, fieldConf]) => (
                      <GenericField
                        key={fieldKey}
                        name={fieldKey}
                        config={fieldConf}
                        value={item?.[fieldKey]}
                        onChange={val => updateItem(item._id, fieldKey, val)}
                      />
                    ))
                  ) : (
                    <GenericField
                      name={`item_${idx}`}
                      config={itemSchema}
                      value={item}
                      onChange={val => updateItem(item._id, null, val)}
                    />
                  )}
                </div>
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

  return (
    <label className="editor-field">
      <span>{config.label || name}{config.required ? ' *' : ''}</span>
      <input
        type={config.type === 'number' ? 'number' : 'text'}
        value={value || ''}
        required={!!config.required}
        onChange={e => onChange(e.target.value)}
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

  // Workspace-specific editing state
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

  const library = useMemo(() => Object.fromEntries(components.map(c => [c.id, c])), [components]);

  const selected = page.find(x => x.instanceId === selectedId) || page[0];
  const selectedDef = selected ? library[selected.type] : null;

  const handleSave = useCallback(async () => {
    if (mode !== 'workspace' || !workspace || !pageData) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          postId: pageData.postId,
          rowGuid: pageData.rowGuid || pageData.pageGuid,
          title: pageTitle,
          slug: pageSlug,
          templateId: activeTemplateId || pageData.templateId,
          sections: page
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
  }, [mode, workspace, pageData, pageTitle, pageSlug, activeTemplateId, page]);

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

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.workspaceId,
          postId: pageData.postId,
          rowGuid: pageData.rowGuid || pageData.pageGuid,
          title: pageTitle,
          slug: pageSlug,
          templateId: activeTemplateId || pageData.templateId,
          sections: page,
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
        pageData.postId = data.postId;
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
  }, [mode, workspace, pageData, pageTitle, pageSlug, activeTemplateId, page]);

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

  function updateField(key, value) {
    setIsDirty(true);
    setPage(p => p.map(x => x.instanceId === selectedId ? {
      ...x,
      content: { ...x.content, [key]: value }
    } : x));
  }

  function moveSection(id, direction) {
    setIsDirty(true);
    setPage(p => {
      const arr = [...p];
      const i = arr.findIndex(x => x.instanceId === id);
      const j = i + direction;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  function removeSection(id) {
    setIsDirty(true);
    setPage(p => {
      const next = p.filter(x => x.instanceId !== id);
      if (id === selectedId) {
        setSelectedId(next[0]?.instanceId || '');
      }
      return next;
    });
  }

  function addComponent(type) {
    setIsDirty(true);
    const compDef = library[type];
    if (!compDef) return;
    const instanceId = generateUniqueId('inst');
    const content = compDef.defaults ? structuredClone(compDef.defaults) : emptyObjectFromSchema(compDef.schema);
    setPage(p => [...p, { instanceId, type, content }]);
    setSelectedId(instanceId);
  }

  // Load a complete Page Template skeleton
  function loadTemplate(templateId) {
    setIsDirty(true);
    const template = pageTemplates.find(t => t.id === templateId);
    if (!template) return;
    setActiveTemplateId(templateId);

    const newPage = (template.components || []).map((compRef, idx) => {
      const compDef = library[compRef.type];
      const instanceId = `inst_${Date.now()}_${idx + 1}`;
      const content = compDef?.defaults
        ? structuredClone(compDef.defaults)
        : (compDef?.schema ? emptyObjectFromSchema(compDef.schema) : {});
      return { instanceId, type: compRef.type, content };
    });

    setPage(newPage);
    setSelectedId(newPage[0]?.instanceId || '');
  }

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

  // Generate complete, self-contained, high-performance HTML
  function generateFullHtml() {
    const renderedSections = page.map(item => {
      const def = library[item.type];
      if (!def) return '';
      try {
        return Handlebars.compile(def.template)(item.content);
      } catch (err) {
        console.error('Handlebars compile error:', err);
        return '';
      }
    }).join('\n\n');

    // Deduplicate Layer 2 component styles
    const usedTypes = new Set();
    const componentCssList = [];
    page.forEach(item => {
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
                  {pageData?.postId && !isNaN(Number(pageData.postId)) ? (
                    <span className="post-id-tag">#{pageData.postId}</span>
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

      <div className="page-editor-grid">
        {/* Left Sidebar: Page Composition & Template Selector */}
        <aside className="component-list-panel">
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

                return (
                  <div
                    key={item.instanceId}
                    className={`component-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(item.instanceId)}
                  >
                    <div className="component-row-info">
                      <small>SECTION {idx + 1}</small>
                      <strong>{def?.name || item.type}</strong>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); moveSection(item.instanceId, -1); }}
                        disabled={idx === 0}
                        title="Move section up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); moveSection(item.instanceId, 1); }}
                        disabled={idx === page.length - 1}
                        title="Move section down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
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
            <label>+ ADD COMPONENT</label>
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  addComponent(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>Choose component from library…</option>
              {components.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
              ))}
            </select>
          </div>

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
        <aside className="editor-panel">
          {selected ? (
            selectedDef ? (
              <>
                <div className="panel-heading">
                  <p className="panel-kicker">{selectedDef.category || 'COMPONENT'}</p>
                  <h1>{selectedDef.name}</h1>
                  <span>Inferred from <code>{selectedDef.id}/schema.json</code></span>
                </div>
                <div className="fields">
                  {Object.entries(selectedDef.schema).map(([name, config]) => (
                    <GenericField
                      key={name}
                      name={name}
                      config={config}
                      value={selected.content?.[name]}
                      onChange={v => updateField(name, v)}
                    />
                  ))}
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
            <div>
              <strong>{mode === 'workspace' ? 'Workspace Page Preview' : 'Live Page Preview'}</strong>
              <span>
                {mode === 'workspace'
                  ? `Rendered with ${theme?.name || 'cloned theme'} style.css`
                  : 'pure Handlebars + active theme style.css'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          <div className="preview-canvas page-preview">
            {/* Inject Active Theme Google Font & CSS into preview */}
            {theme?.fontUrl && (
              <link rel="stylesheet" href={theme.fontUrl} />
            )}
            <style dangerouslySetInnerHTML={{ __html: themeCss }} />

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

            {page.map(item => {
              const def = library[item.type];
              const isSelected = item.instanceId === selectedId;

              if (!def) {
                return (
                  <div
                    key={item.instanceId}
                    className={`preview-component preview-component-missing ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(item.instanceId)}
                  >
                    <span>⚠️ Component <code>{item.type}</code> not found in active theme</span>
                  </div>
                );
              }

              const html = Handlebars.compile(def.template)(item.content);

              return (
                <div
                  key={item.instanceId}
                  className={`preview-component ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(item.instanceId)}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
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
        </section>
      </div>
    </main>
  );
}
