"use client";

import React from 'react';

export default function Lightbox({
  src,
  alt,
  title,
  shareUrl,
  onClose,
}: {
  src: string;
  alt?: string;
  title?: string;
  shareUrl?: string;
  onClose: () => void;
}) {
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Close">×</button>
        <div className="lightbox-media">
          <img src={src} alt={alt || title || 'Photo preview'} />
        </div>
        <div className="lightbox-meta">
          {title && <h3>{title}</h3>}
          <div className="lightbox-actions">
            {shareUrl && (
              <a className="btn-primary" href={shareUrl} target="_blank" rel="noreferrer">Open profile</a>
            )}
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
