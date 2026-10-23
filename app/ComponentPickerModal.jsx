'use client';

import React, { useState, useMemo, useEffect } from 'react';

export default function ComponentPickerModal({
  isOpen,
  onClose,
  components = [],
  onSelectComponent,
  selectedSectionIndex = null,
  totalSections = 0
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [insertPosition, setInsertPosition] = useState('bottom'); // 'bottom' | 'after_selected'

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategory('ALL');
      if (selectedSectionIndex !== null && selectedSectionIndex >= 0) {
        setInsertPosition('after_selected');
      } else {
        setInsertPosition('bottom');
      }
    }
  }, [isOpen, selectedSectionIndex]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    components.forEach(c => {
      if (c.category) {
        set.add(c.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [components]);

  // Filtered components list
  const filteredComponents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return components.filter(c => {
      // Category match
      if (activeCategory !== 'ALL' && c.category?.toLowerCase() !== activeCategory.toLowerCase()) {
        return false;
      }
      // Search match
      if (!q) return true;
      const nameMatch = c.name?.toLowerCase().includes(q);
      const catMatch = c.category?.toLowerCase().includes(q);
      const idMatch = c.id?.toLowerCase().includes(q);
      const fieldMatch = c.schema ? Object.keys(c.schema).some(f => f.toLowerCase().includes(q)) : false;
      return nameMatch || catMatch || idMatch || fieldMatch;
    });
  }, [components, searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="component-picker-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="component-picker-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="component-picker-header">
          <div>
            <h2>Component Library</h2>
            <p>Select a component block to add to your page</p>
          </div>
          <button
            type="button"
            className="component-picker-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Search & Insertion Controls */}
        <div className="component-picker-controls">
          <div className="component-picker-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="component-picker-search-input"
              placeholder="Search components by name, category, or field..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="component-picker-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {totalSections > 0 && selectedSectionIndex !== null && selectedSectionIndex >= 0 && (
            <div className="component-picker-insert-mode">
              <span className="insert-label">Insert at:</span>
              <div className="insert-pill-group">
                <button
                  type="button"
                  className={`insert-pill ${insertPosition === 'after_selected' ? 'is-active' : ''}`}
                  onClick={() => setInsertPosition('after_selected')}
                >
                  After Section {selectedSectionIndex + 1}
                </button>
                <button
                  type="button"
                  className={`insert-pill ${insertPosition === 'bottom' ? 'is-active' : ''}`}
                  onClick={() => setInsertPosition('bottom')}
                >
                  Bottom of Page
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="component-picker-categories">
          <button
            type="button"
            className={`picker-cat-pill ${activeCategory === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('ALL')}
          >
            All Components ({components.length})
          </button>
          {categories.map(cat => {
            const count = components.filter(c => c.category?.toLowerCase() === cat.toLowerCase()).length;
            return (
              <button
                key={cat}
                type="button"
                className={`picker-cat-pill ${activeCategory === cat ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Component Cards Grid */}
        <div className="component-picker-body">
          {filteredComponents.length === 0 ? (
            <div className="component-picker-empty">
              <div className="empty-icon">🔍</div>
              <h4>No matching components found</h4>
              <p>Try searching with another keyword or selecting "All Components".</p>
              {searchQuery && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="component-cards-grid">
              {filteredComponents.map(comp => {
                const fieldNames = comp.schema ? Object.keys(comp.schema) : [];
                return (
                  <div
                    key={comp.id}
                    className="component-catalog-card"
                    onClick={() => {
                      onSelectComponent(comp.id, insertPosition);
                      onClose();
                    }}
                  >
                    <div className="catalog-card-header">
                      <span className="catalog-card-category">{comp.category || 'GENERAL'}</span>
                      <span className="catalog-card-id">{comp.id}</span>
                    </div>

                    <h3 className="catalog-card-title">{comp.name}</h3>

                    {fieldNames.length > 0 && (
                      <div className="catalog-card-fields">
                        <span className="fields-label">Editable fields:</span>
                        <div className="fields-tags">
                          {fieldNames.slice(0, 4).map(f => (
                            <span key={f} className="field-tag">{f}</span>
                          ))}
                          {fieldNames.length > 4 && (
                            <span className="field-tag field-tag-more">+{fieldNames.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="catalog-card-footer">
                      <button
                        type="button"
                        className="btn-add-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComponent(comp.id, insertPosition);
                          onClose();
                        }}
                      >
                        <span>＋ Add to Page</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
