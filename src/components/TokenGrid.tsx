'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { CHAINS, type ChainKey } from '@/lib/constants';
import type { UnifiedToken } from '@/lib/types';

interface TokenGridProps {
  tokens: UnifiedToken[];
  onSelect: (token: UnifiedToken) => void;
}

function TokenCard({ token, onSelect, compact }: { token: UnifiedToken; onSelect: (t: UnifiedToken) => void; compact?: boolean }) {
  const chain = CHAINS[token.chain as ChainKey];
  const imageUrl = token.media.thumbnail || token.media.image;
  const videoUrl = token.media.video;
  const isVideo = token.media.mediaType === 'video';
  const [imgFailed, setImgFailed] = useState(false);
  const onImgError = useCallback(() => setImgFailed(true), []);

  return (
    <div
      onClick={() => onSelect(token)}
      style={{
        position: 'relative',
        aspectRatio: '1',
        background: '#111',
        border: compact ? 'none' : '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        cursor: 'crosshair',
      }}
    >
      {isVideo && videoUrl && (!imageUrl || imgFailed) ? (
        <video
          src={videoUrl}
          muted
          loop
          playsInline
          autoPlay
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : imageUrl && !imgFailed ? (
        <img
          src={imageUrl}
          alt={token.name}
          loading="lazy"
          onError={onImgError}
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
          {compact ? '' : token.name}
        </div>
      )}
      {!compact && (
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
      )}
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
  const mosaicOrder = useStore((s) => s.mosaicOrder);
  const mosaicCols = useStore((s) => s.mosaicCols);
  const isMobile = useIsMobile();

  const filteredTokens = useMemo(
    () => getFilteredTokens(),
    [storeTokens, filters, getFilteredTokens]
  );

  const isMosaic = !!(mosaicOrder && mosaicOrder.length > 0 && mosaicCols);

  const mosaicTokens = useMemo(() => {
    if (!mosaicOrder || mosaicOrder.length === 0) return [];
    const tokenMap = new Map(storeTokens.map((t) => [t.id, t]));
    return mosaicOrder.map((id) => tokenMap.get(id)).filter(Boolean) as UnifiedToken[];
  }, [mosaicOrder, storeTokens]);

  const displayTokens = isMosaic && mosaicTokens.length > 0
    ? mosaicTokens
    : tokens.length > 0
      ? tokens
      : filteredTokens;

  const gridColumns = isMosaic && mosaicTokens.length > 0
    ? `repeat(${mosaicCols}, 1fr)`
    : isMobile
      ? 'repeat(5, 1fr)'
      : 'repeat(auto-fill, minmax(200px, 1fr))';

  // Zoom/pan state for mosaic mode
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom/pan when mosaic changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [isMosaic]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isMosaic) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.5, Math.min(10, z * delta)));
  }, [isMosaic]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMosaic) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, [isMosaic]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (isMosaic) {
    return (
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a0a0f',
          overflow: 'hidden',
          zIndex: 1,
          cursor: dragging.current ? 'grabbing' : 'crosshair',
        }}
      >
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '0px',
        }}>
          {displayTokens.map((token, i) => (
            <TokenCard
              key={i}
              token={token}
              onSelect={onSelect}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

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
        gridTemplateColumns: gridColumns,
        gap: '2px',
      }}>
        {displayTokens.map((token) => (
          <TokenCard key={token.id} token={token} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
