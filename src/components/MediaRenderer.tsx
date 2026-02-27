'use client';

import { useState } from 'react';
import type { UnifiedToken } from '@/lib/types';

interface MediaRendererProps {
  token: UnifiedToken;
}

export default function MediaRenderer({ token }: MediaRendererProps) {
  const { media } = token;
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  if (media.mediaType === 'video' && media.video && !videoFailed) {
    return (
      <div style={{ position: 'relative', width: '100%', maxHeight: '400px', background: '#000' }}>
        {!videoReady && media.image && (
          <img
            src={media.image}
            alt={token.name}
            style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }}
          />
        )}
        {!videoReady && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '11px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            LOADING VIDEO...
          </div>
        )}
        <video
          src={media.video}
          controls
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          style={{
            width: '100%',
            maxHeight: '400px',
            objectFit: 'contain',
            display: videoReady ? 'block' : 'none',
          }}
        />
      </div>
    );
  }

  if (media.mediaType === 'audio') {
    return (
      <div>
        {media.image && (
          <img
            src={media.image}
            alt={token.name}
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

  if (media.image) {
    return (
      <img
        src={media.image}
        alt={token.name}
        style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
      />
    );
  }

  // Text fallback
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
