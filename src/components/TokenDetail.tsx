'use client';

import { useState, useEffect } from 'react';
import type { UnifiedToken } from '@/lib/types';
import { CHAINS, type ChainKey } from '@/lib/constants';
import { useStore } from '@/hooks/useStore';
import MediaRenderer from './MediaRenderer';

interface TokenDetailProps {
  token: UnifiedToken;
  onClose: () => void;
}

export default function TokenDetail({ token, onClose }: TokenDetailProps) {
  const chain = CHAINS[token.chain as ChainKey];
  const explorerUrl = `${chain.explorer}/address/${token.contractAddress}`;
  const truncAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: mobile ? '100%' : '420px',
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: mobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      zIndex: 100,
      padding: mobile ? '16px 16px 80px' : '24px',
      fontFamily: 'inherit',
      color: '#fff',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'sticky',
          top: 0,
          float: 'right',
          background: 'rgba(10, 10, 15, 0.9)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: mobile ? '8px 14px' : '6px 12px',
          fontFamily: 'inherit',
          fontWeight: 'bold',
          fontSize: '12px',
          textTransform: 'uppercase',
          cursor: 'crosshair',
          zIndex: 10,
        }}
      >
        CLOSE
      </button>

      <div style={{ marginTop: '48px', marginBottom: '20px' }}>
        <MediaRenderer key={token.id} token={token} />
      </div>

      <h2 style={{
        fontSize: mobile ? '14px' : '16px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        margin: '0 0 16px',
        letterSpacing: '0.05em',
      }}>
        {token.name}
      </h2>

      <div style={{ fontSize: mobile ? '11px' : '12px', lineHeight: '2', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {token.collectionName && (
          <div>
            <span style={{ color: '#666' }}>COLLECTION:</span>{' '}
            <span
              onClick={() => {
                useStore.getState().setFilter('selectedCollection', token.collectionName);
                onClose();
              }}
              style={{ color: '#228B22', cursor: 'crosshair', textDecoration: 'none' }}
            >
              {token.collectionName}
            </span>
          </div>
        )}
        {token.creator && (
          <div><span style={{ color: '#666' }}>CREATOR:</span> {truncAddr(token.creator)}</div>
        )}
        <div>
          <span style={{ color: '#666' }}>CHAIN:</span>{' '}
          <span style={{ color: chain.color }}>{chain.name.toUpperCase()}</span>
        </div>
        <div><span style={{ color: '#666' }}>STANDARD:</span> {token.standard}</div>
        {token.tokenId && (
          <div><span style={{ color: '#666' }}>TOKEN ID:</span> {token.tokenId}</div>
        )}
      </div>

      {token.description && (
        <p style={{
          fontSize: '12px',
          color: '#999',
          lineHeight: '1.6',
          marginTop: '16px',
          fontFamily: 'inherit',
        }}>
          {token.description}
        </p>
      )}

      {token.attributes && token.attributes.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            color: '#666',
            marginBottom: '8px',
            letterSpacing: '0.1em',
          }}>
            ATTRIBUTES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {token.attributes.map((attr, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '6px 10px',
                  fontSize: '10px',
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                }}
              >
                <div style={{ color: '#666' }}>{attr.trait_type}</div>
                <div style={{ color: '#fff', marginTop: '2px' }}>{attr.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          VIEW ON EXPLORER
        </a>
        {(token.media.image || token.media.thumbnail) && (
          <a
            href={`/api/download?url=${encodeURIComponent(token.media.image || token.media.thumbnail || '')}&name=${encodeURIComponent(token.name || 'wallpaper')}`}
            download
            style={{
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              cursor: 'crosshair',
            }}
          >
            DOWNLOAD MEDIA
          </a>
        )}
      </div>
    </div>
  );
}
