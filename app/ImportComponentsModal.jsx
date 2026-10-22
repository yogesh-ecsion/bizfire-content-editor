'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import { parseComponentUpload } from '@/lib/clientComponentParser';
import { STANDARD_CATEGORIES, slugifyKey } from '@/lib/componentValidator';

export default function ImportComponentsModal({
  show,
  onHide,
  workspaceId = null,
  onSuccess
}) {
  const [stagedComponents, setStagedComponents] = useState([]);
  const [dbComponents, setDbComponents] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedThemeGuid, setSelectedThemeGuid] = useState('a1000000-0000-0000-0000-000000000001');
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [errorAlert, setErrorAlert] = useState(null);

  // Selected component keys to ingest
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  // Overwrite map: key -> boolean
  const [overwriteMap, setOverwriteMap] = useState({});

  // Active preview component
  const [previewItem, setPreviewItem] = useState(null);
  const [previewTab, setPreviewTab] = useState('render');

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // 1. Fetch DB components & themes whenever modal opens
  useEffect(() => {
    if (!show) {
      setStagedComponents([]);
      setSelectedKeys(new Set());
      setOverwriteMap({});
      setPreviewItem(null);
      setIngestResult(null);
      setErrorAlert(null);
      return;
    }

    async function fetchDbMetadata() {
      setIsLoadingDb(true);
      try {
        const res = await fetch(`/api/admin/components?themeGuid=${selectedThemeGuid}`);
        const data = await res.json();
        if (data.success) {
          setDbComponents(data.components || []);
          if (data.themes && data.themes.length > 0) {
            setThemes(data.themes);
          }
        }
      } catch (err) {
        console.warn('Could not fetch existing DB components:', err.message);
      } finally {
        setIsLoadingDb(false);
      }
    }

    fetchDbMetadata();
  }, [show, selectedThemeGuid]);

  // Set of existing DB component keys for fast conflict lookup
  const existingKeySet = useMemo(() => {
    return new Set(dbComponents.map(c => c.key));
  }, [dbComponents]);

  // 2. Handle File Processing
  async function handleFiles(items) {
    setIsParsing(true);
    setErrorAlert(null);
    try {
      const parsed = await parseComponentUpload(items);
      if (parsed.length === 0) {
        setErrorAlert('No valid component folders found. Ensure folders contain template.html, schema.json, and defaults.json.');
        return;
      }

      setStagedComponents(prev => {
        // Merge with existing staged components, replacing by key
        const map = new Map(prev.map(c => [c.key, c]));
        for (const item of parsed) {
          map.set(item.key, item);
        }
        const merged = Array.from(map.values());
        
        // Auto-select all valid components
        const newSelected = new Set(selectedKeys);
        for (const item of merged) {
          if (item.valid) newSelected.add(item.key);
        }
        setSelectedKeys(newSelected);

        return merged;
      });

      // Auto-preview first parsed component if none active
      if (parsed.length > 0 && !previewItem) {
        setPreviewItem(parsed[0]);
      }
    } catch (err) {
      console.error('File parsing error:', err);
      setErrorAlert(`Failed to parse files: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  }

  // Drag and Drop event handlers
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.items) {
      handleFiles(e.dataTransfer.items);
    }
  }

  // Update a staged component's property (e.g. name, key, category)
  function updateComponent(oldKey, field, value) {
    setStagedComponents(prev =>
      prev.map(c => {
        if (c.key !== oldKey) return c;
        if (field === 'key') {
          const newSlug = slugifyKey(value);
          // Also update selectedKeys and overwriteMap
          setSelectedKeys(keys => {
            const copy = new Set(keys);
            if (copy.has(oldKey)) {
              copy.delete(oldKey);
              copy.add(newSlug);
            }
            return copy;
          });
          return { ...c, key: newSlug };
        }
        return { ...c, [field]: value };
      })
    );

    if (previewItem && previewItem.key === oldKey) {
      setPreviewItem(prev => ({
        ...prev,
        [field]: field === 'key' ? slugifyKey(value) : value
      }));
    }
  }

  // Toggle selection
  function toggleSelect(key) {
    setSelectedKeys(prev => {
      const copy = new Set(prev);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      return copy;
    });
  }

  function toggleSelectAll() {
    if (selectedKeys.size === stagedComponents.filter(c => c.valid).length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(stagedComponents.filter(c => c.valid).map(c => c.key)));
    }
  }

  // Toggle overwrite for an existing component
  function toggleOverwrite(key) {
    setOverwriteMap(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  // Remove a staged component
  function removeComponent(key) {
    setStagedComponents(prev => prev.filter(c => c.key !== key));
    setSelectedKeys(prev => {
      const copy = new Set(prev);
      copy.delete(key);
      return copy;
    });
    if (previewItem?.key === key) {
      setPreviewItem(null);
    }
  }

  // 3. Submit Ingestion to POST /api/admin/components
  async function handleIngest() {
    const toIngest = stagedComponents.filter(c => selectedKeys.has(c.key) && c.valid);
    if (toIngest.length === 0) {
      setErrorAlert('Please select at least one valid component to ingest.');
      return;
    }

    // Check if any conflicting items are NOT marked for overwrite
    const unconfirmedConflicts = toIngest.filter(
      c => existingKeySet.has(c.key) && !overwriteMap[c.key]
    );

    if (unconfirmedConflicts.length > 0) {
      const names = unconfirmedConflicts.map(c => `"${c.key}"`).join(', ');
      setErrorAlert(
        `Component(s) ${names} already exist in the database. Please check "Overwrite" or rename them before proceeding.`
      );
      return;
    }

    setIsIngesting(true);
    setErrorAlert(null);
    setIngestResult(null);

    try {
      const payload = {
        themeGuid: selectedThemeGuid,
        workspaceId,
        components: toIngest.map(c => ({
          key: c.key,
          name: c.name,
          category: c.category,
          template: c.template,
          schema: c.schema,
          defaults: c.defaults,
          css: c.css,
          images: c.images || [],
          overwrite: Boolean(overwriteMap[c.key])
        }))
      };

      const res = await fetch('/api/admin/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to ingest components');
      }

      setIngestResult({
        success: true,
        count: data.mergedCount,
        components: data.mergedComponents
      });

      // Refresh DB components list in background
      const refreshRes = await fetch(`/api/admin/components?themeGuid=${selectedThemeGuid}`);
      const refreshData = await refreshRes.json();
      if (refreshData.success) {
        setDbComponents(refreshData.components || []);
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error('Ingestion failed:', err);
      setErrorAlert(err.message);
    } finally {
      setIsIngesting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <Modal.Title style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🧩 Component Library & Ingestion</span>
          <Badge bg="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>
            PostgreSQL Sync
          </Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '24px', maxHeight: '78vh', overflowY: 'auto' }}>
        {/* Top Controls: Target Theme & Dropzone */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Target Theme:</span>
            <Form.Select
              size="sm"
              value={selectedThemeGuid}
              onChange={e => setSelectedThemeGuid(e.target.value)}
              style={{ width: '280px', fontWeight: 500 }}
              disabled={isLoadingDb || isIngesting}
            >
              {themes.map(t => (
                <option key={t.themeGuid} value={t.themeGuid}>
                  {t.name} {t.isMaster ? '(Master Theme)' : ''}
                </option>
              ))}
            </Form.Select>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {isLoadingDb ? (
              <span><Spinner animation="border" size="sm" /> Syncing database metadata...</span>
            ) : (
              <span><b>{dbComponents.length}</b> components currently registered in database</span>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed #3b82f6' : '2px dashed #cbd5e1',
            borderRadius: '10px',
            background: isDragging ? '#eff6ff' : '#f8fafc',
            padding: '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => folderInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".zip"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          <input
            type="file"
            ref={folderInputRef}
            style={{ display: 'none' }}
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />

          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
            Drag & drop component folders or .zip archives here
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
            Accepts single or multiple folders containing <code>template.html</code>, <code>schema.json</code>, <code>defaults.json</code>, and <code>style.css</code>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={e => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              disabled={isParsing}
            >
              Browse Folders
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={e => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isParsing}
            >
              Browse .ZIP Archive
            </Button>
          </div>

          {isParsing && (
            <div style={{ marginTop: '12px', color: '#3b82f6', fontSize: '13px' }}>
              <Spinner animation="border" size="sm" /> Extracting and validating components in-memory...
            </div>
          )}
        </div>

        {/* Alerts */}
        {errorAlert && (
          <Alert variant="danger" dismissible onClose={() => setErrorAlert(null)}>
            {errorAlert}
          </Alert>
        )}

        {ingestResult && (
          <Alert variant="success" dismissible onClose={() => setIngestResult(null)}>
            <b>Ingestion Complete!</b> Successfully saved {ingestResult.count} component(s) into Azure PostgreSQL.
          </Alert>
        )}

        {/* Staging Area & Live Preview Split */}
        {stagedComponents.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: previewItem ? '1.4fr 1fr' : '1fr', gap: '20px' }}>
            {/* Left: Staging Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  Staged Components ({stagedComponents.length})
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button size="sm" variant="link" onClick={toggleSelectAll} style={{ textDecoration: 'none', padding: 0 }}>
                    {selectedKeys.size === stagedComponents.filter(c => c.valid).length ? 'Deselect All' : 'Select All Valid'}
                  </Button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <Button size="sm" variant="link" onClick={() => setStagedComponents([])} style={{ textDecoration: 'none', padding: 0, color: '#ef4444' }}>
                    Clear
                  </Button>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="table table-hover mb-0" style={{ fontSize: '13px' }}>
                  <thead style={{ background: '#f8fafc', color: '#475569' }}>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedKeys.size > 0 && selectedKeys.size === stagedComponents.filter(c => c.valid).length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Key / Friendly Name</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedComponents.map(comp => {
                      const isConflict = existingKeySet.has(comp.key);
                      const isOverwritten = Boolean(overwriteMap[comp.key]);
                      const isSelected = selectedKeys.has(comp.key);
                      const isPreviewing = previewItem?.key === comp.key;

                      return (
                        <tr
                          key={comp.key}
                          style={{
                            background: isPreviewing ? '#f0f9ff' : undefined,
                            opacity: comp.valid ? 1 : 0.75
                          }}
                        >
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!comp.valid}
                              onChange={() => toggleSelect(comp.key)}
                            />
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={comp.name}
                                onChange={e => updateComponent(comp.key, 'name', e.target.value)}
                                style={{ fontWeight: 600, marginBottom: '2px', padding: '2px 6px', fontSize: '13px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{ fontSize: '11px', color: '#64748b' }}>{comp.key}</code>
                              {comp.images?.length > 0 && (
                                <Badge bg="light" text="dark" style={{ border: '1px solid #cbd5e1', fontSize: '10px' }}>
                                  {comp.images.length} image{comp.images.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <Form.Select
                              size="sm"
                              value={comp.category}
                              onChange={e => updateComponent(comp.key, 'category', e.target.value)}
                              style={{ fontSize: '12px', padding: '2px 6px' }}
                            >
                              {STANDARD_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </Form.Select>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            {!comp.valid ? (
                              <div>
                                <Badge bg="danger">Error</Badge>
                                <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }} title={comp.errors?.join('\n')}>
                                  {comp.errors?.[0]?.slice(0, 40)}...
                                </div>
                              </div>
                            ) : isConflict ? (
                              <div>
                                <Badge bg="warning" text="dark">Exists in DB</Badge>
                                <Form.Check
                                  type="switch"
                                  id={`overwrite-${comp.key}`}
                                  label={<span style={{ fontSize: '11px' }}>{isOverwritten ? 'Overwrite' : 'Keep existing'}</span>}
                                  checked={isOverwritten}
                                  onChange={() => toggleOverwrite(comp.key)}
                                  style={{ marginTop: '2px' }}
                                />
                              </div>
                            ) : (
                              <Badge bg="success">Ready (New)</Badge>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                              <Button
                                size="sm"
                                variant={isPreviewing ? 'primary' : 'outline-primary'}
                                style={{ padding: '2px 8px', fontSize: '12px' }}
                                onClick={() => setPreviewItem(comp)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                style={{ padding: '2px 8px', fontSize: '12px' }}
                                onClick={() => removeComponent(comp.key)}
                              >
                                ✕
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Live Preview & Code Inspector Drawer */}
            {previewItem && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{previewItem.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>({previewItem.category})</span>
                  </div>
                  <Button size="sm" variant="link" onClick={() => setPreviewItem(null)} style={{ textDecoration: 'none', color: '#94a3b8', padding: 0 }}>
                    Close ✕
                  </Button>
                </div>

                <Tabs
                  activeKey={previewTab}
                  onSelect={k => setPreviewTab(k || 'render')}
                  className="px-2 pt-2"
                  style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
                >
                  <Tab eventKey="render" title="Live Preview" />
                  <Tab eventKey="html" title="template.html" />
                  <Tab eventKey="schema" title="schema.json" />
                  <Tab eventKey="defaults" title="defaults.json" />
                  <Tab eventKey="css" title="style.css" />
                </Tabs>

                <div style={{ flex: 1, padding: '14px', background: '#ffffff', overflowY: 'auto', maxHeight: '450px' }}>
                  {previewTab === 'render' && (
                    <div>
                      {previewItem.css && (
                        <style dangerouslySetInnerHTML={{ __html: previewItem.css }} />
                      )}
                      {previewItem.renderedPreview ? (
                        <div
                          className="bizfire-live-render-sandbox"
                          dangerouslySetInnerHTML={{ __html: previewItem.renderedPreview }}
                          style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#fff' }}
                        />
                      ) : (
                        <Alert variant="warning">No preview available (Handlebars execution failed)</Alert>
                      )}
                    </div>
                  )}

                  {previewTab === 'html' && (
                    <pre style={{ fontSize: '11px', background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                      {previewItem.template}
                    </pre>
                  )}

                  {previewTab === 'schema' && (
                    <pre style={{ fontSize: '11px', background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                      {JSON.stringify(previewItem.schema, null, 2)}
                    </pre>
                  )}

                  {previewTab === 'defaults' && (
                    <pre style={{ fontSize: '11px', background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                      {JSON.stringify(previewItem.defaults, null, 2)}
                    </pre>
                  )}

                  {previewTab === 'css' && (
                    <pre style={{ fontSize: '11px', background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                      {previewItem.css || '/* No component-specific CSS */'}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          {stagedComponents.length > 0 && (
            <span>
              <b>{selectedKeys.size}</b> of {stagedComponents.length} component(s) selected for ingestion
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={onHide} disabled={isIngesting}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleIngest}
            disabled={isIngesting || selectedKeys.size === 0}
          >
            {isIngesting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Ingesting to PostgreSQL...
              </>
            ) : (
              `Ingest Selected (${selectedKeys.size})`
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
