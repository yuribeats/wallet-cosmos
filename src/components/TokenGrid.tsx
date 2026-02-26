'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { CHAINS, type ChainKey } from '@/lib/constants';
import type { UnifiedToken } from '@/lib/types';

interface TokenGridProps {
  tokens: UnifiedToken[];
  onSelect: (token: UnifiedToken) => void;
}

function TokenCard({ token, onSelect }: { token: UnifiedToken; onSelect: (t: UnifiedToken) => void }) {
  const chain = CHAINS[token.chain as ChainKey];
  const imageUrl = token.media.thumbnail || token.media.image;

  return (
    <div
      onClick={() => onSelect(token)}
      style={{
        position: 'relative',
        aspectRatio: '1',
        background: '#111',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        cursor: 'crosshair',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={token.name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 'bold',
          color: '#333',
          textTransform: 'uppercase',
          padding: '8px',
          textAlign: 'center',
          wordBreak: 'break-all',
        }}>
          {token.name}
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        padding: '16px 6px 4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div style={{
          fontSize: '8px',
          fontWeight: 'bold',
          color: '#aaa',
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '70%',
        }}>
          {token.name}
        </div>
        <div style={{
          fontSize: '7px',
          fontWeight: 'bold',
          color: chain.color,
          textTransform: 'uppercase',
        }}>
          {chain.name}
        </div>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export default function TokenGrid({ tokens, onSelect }: TokenGridProps) {
  const filters = useStore((s) => s.filters);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);
  const storeTokens = useStore((s) => s.tokens);
  const isMobile = useIsMobile();

  const filteredTokens = useMemo(
    () => getFilteredTokens(),
    [storeTokens, filters, getFilteredTokens]
  );

  const displayTokens = tokens.length > 0 ? tokens : filteredTokens;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0f',
      overflowY: 'auto',
      padding: 0,
      zIndex: 1,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(5, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '2px',
      }}>
        {displayTokens.map((token) => (
          <TokenCard key={token.id} token={token} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
