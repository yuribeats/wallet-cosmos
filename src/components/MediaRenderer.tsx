'use client';

import { useState, useRef } from 'react';
import type { UnifiedToken } from '@/lib/types';

interface MediaRendererProps {
  token: UnifiedToken;
}

function proxyUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export default function MediaRenderer({ token }: MediaRendererProps) {
  const { media } = token;
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Video: load directly, no proxy. Fall back to image only on true failure.
  if (media.mediaType === 'video' && media.video && !videoFailed) {
    return (
      <video
        ref={videoRef}
        key={media.video}
        src={media.video}
        poster={media.image ? proxyUrl(media.image) : undefined}
        controls
        autoPlay
        muted
        playsInline
        loop
        onError={() => setVideoFailed(true)}
        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', background: '#000' }}
      />
    );
  }

  if (media.mediaType === 'audio') {
    return (
      <div>
        {media.image && (
          <img
            src={proxyUrl(media.image)}
            alt={token.name}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
          />
        )}
        {media.audio && (
          <audio
            src={media.audio}
            controls
            autoPlay
            style={{ width: '100%', marginTop: '8px' }}
          />
        )}
      </div>
    );
  }

  if (media.mediaType === 'html') {
    return (
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
        <iframe
          src={media.video || media.audio}
          sandbox="allow-scripts"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }

  // Image, or video fallback
  const imageSrc = media.image || media.video;
  if (imageSrc && !imageError) {
    return (
      <img
        src={proxyUrl(imageSrc)}
        alt={token.name}
        onError={() => setImageError(true)}
        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
      />
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111',
      fontFamily: 'inherit',
      fontSize: '14px',
      color: '#666',
      textTransform: 'uppercase',
    }}>
      {token.name}
    </div>
  );
}
