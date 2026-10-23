'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const CANVAS_HELPER_STYLES = `
/* ── Preview Canvas Isolated Scaffolding ── */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  margin: 0;
  padding: 0;
  height: 100%;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 24px;
  min-height: 100%;
  background: #ffffff;
  overflow-y: auto;
}

/* Hide scrollbars when scrolling inside device frame for clean aesthetic */
body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
body::-webkit-scrollbar-track {
  background: transparent;
}
body::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.25);
  border-radius: 9999px;
}
body::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.45);
}

/* ── Interactive Component Outlines & Hover ── */
.preview-component {
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 10px;
  margin-bottom: 16px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.preview-component:hover {
  border-color: #93c5fd;
}

.preview-component.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.preview-component-content {
  display: contents;
}

/* ── Elevated Floating Canvas Toolbar on Selected Component ── */
.preview-floating-toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 70;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #0f172a;
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 8px;
  box-shadow: 0 10px 25px -3px rgba(15, 23, 42, 0.45), 0 4px 8px -2px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  user-select: none;
  pointer-events: auto;
  animation: fadeInFloatingBar 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInFloatingBar {
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.preview-floating-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-floating-index {
  background: #2563eb;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  font-family: inherit;
}

.preview-floating-name {
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: inherit;
}

.preview-floating-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.18);
}

.preview-floating-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-floating-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
  line-height: 1;
  font-family: inherit;
}

.btn-floating-action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.btn-floating-action:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.btn-floating-add {
  background: rgba(37, 99, 235, 0.3);
  border-color: rgba(96, 165, 250, 0.45);
  color: #93c5fd;
  font-weight: 700;
}

.btn-floating-add:hover:not(:disabled) {
  background: #2563eb;
  color: #ffffff;
}

.btn-floating-danger:hover:not(:disabled) {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

/* ── Hidden Section Banner ── */
.preview-component--hidden {
  border-style: dashed;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.preview-hidden-banner {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.preview-hidden-banner-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
}

.preview-hidden-banner-info strong {
  display: block;
  font-size: 13px;
  color: #334155;
}

.preview-hidden-banner-info small {
  display: block;
  font-size: 11px;
  color: #94a3b8;
}

.btn-unhide-section {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #3b82f6;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.btn-unhide-section:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

/* ── Missing Component Banner ── */
.preview-component-missing {
  border: 2px dashed #f59e0b;
  padding: 24px;
  background: #fffbeb;
  color: #b45309;
  border-radius: 8px;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
}

/* ── Shell Preview Wrappers (Header & Footer) ── */
.editor-shell-preview-wrapper {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.editor-shell-preview-bar {
  background: #f1f5f9;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  border-bottom: 1px solid #e2e8f0;
}

.shell-preview-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
}

.shell-preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.shell-preview-badge {
  background: #e2e8f0;
  color: #64748b;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.shell-preview-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.shell-preview-link:hover {
  text-decoration: underline;
}

.wp-preview-shell-banner {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  text-align: center;
  color: #64748b;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.wp-preview-shell-banner span {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: #475569;
}

.wp-preview-shell-banner small {
  font-size: 11px;
  color: #94a3b8;
}
`;

export default function PreviewCanvasFrame({
  theme,
  themeCss,
  liveComponentCss,
  customCss,
  viewportMode = 'desktop',
  iframeRef,
  children
}) {
  const localRef = useRef(null);
  const activeRef = iframeRef || localRef;

  const [mountNode, setMountNode] = useState(null);
  const [headNode, setHeadNode] = useState(null);

  const initIframeContent = useCallback(() => {
    const iframe = activeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      if (!doc.getElementById('preview-frame-root')) {
        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <base href="/">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div id="preview-frame-root"></div>
</body>
</html>`);
        doc.close();
      }

      const root = doc.getElementById('preview-frame-root');
      if (root) {
        setMountNode(root);
        setHeadNode(doc.head);
      }

      // Safe popups inside preview window for interactive component calls
      if (iframe.contentWindow) {
        iframe.contentWindow.openQuotePopup = () => alert("Schedule Service: Call our dispatch team at (123) 456-7890.");
        iframe.contentWindow.openRedeemPopup = () => alert("Special Offer: Coupon has been claimed!");

        // Forward keyboard shortcuts (Esc, Ctrl+Z, Ctrl+Y) from iframe to parent window
        const handleIframeKey = (e) => {
          window.dispatchEvent(new KeyboardEvent('keydown', {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            bubbles: true
          }));
        };
        iframe.contentWindow.removeEventListener('keydown', handleIframeKey);
        iframe.contentWindow.addEventListener('keydown', handleIframeKey);

        // Intercept accidental link clicks from navigating the preview iframe away
        const handleAnchorClick = (e) => {
          const anchor = e.target.closest('a');
          if (anchor && !anchor.target) {
            const href = anchor.getAttribute('href');
            if (href && (href.startsWith('http') || href.startsWith('/'))) {
              e.preventDefault();
            }
          }
        };
        doc.removeEventListener('click', handleAnchorClick);
        doc.addEventListener('click', handleAnchorClick);
      }
    } catch (err) {
      console.error('Error initializing PreviewCanvasFrame document:', err);
    }
  }, [activeRef]);

  useEffect(() => {
    initIframeContent();
  }, [initIframeContent]);

  return (
    <>
      <iframe
        ref={activeRef}
        title="Editor Preview Canvas"
        onLoad={initIframeContent}
        className={`preview-canvas page-preview preview-canvas-iframe preview-canvas--${viewportMode}`}
      />

      {/* Inject Isolated Styles directly into iframe <head> */}
      {headNode && createPortal(
        <>
          <base href="/" />
          {theme?.fontUrl ? (
            <link rel="stylesheet" href={theme.fontUrl} />
          ) : (
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
              rel="stylesheet"
            />
          )}

          {/* Layer 1: Master Theme Baseline */}
          <style id="live-theme-styles" dangerouslySetInnerHTML={{ __html: themeCss || '' }} />

          {/* Layer 2: Deduplicated Scoped Component CSS */}
          {liveComponentCss ? (
            <style id="live-component-styles" dangerouslySetInnerHTML={{ __html: liveComponentCss }} />
          ) : null}

          {/* Layer 3: Workspace Custom Overrides (Cascades Last) */}
          {customCss ? (
            <style id="live-workspace-custom-styles" dangerouslySetInnerHTML={{ __html: customCss }} />
          ) : null}

          {/* Layer 4: Editor Canvas Overlays & Outlines */}
          <style id="editor-canvas-helper-styles" dangerouslySetInnerHTML={{ __html: CANVAS_HELPER_STYLES }} />
        </>,
        headNode
      )}

      {/* Render Component Sections directly into iframe <body> root */}
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}
