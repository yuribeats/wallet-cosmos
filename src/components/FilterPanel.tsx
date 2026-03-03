'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { CHAINS, CHAIN_KEYS } from '@/lib/constants';
import type { ChainKey } from '@/lib/constants';
import { filtersToParams } from '@/lib/urlFilters';
import type { UnifiedToken } from '@/lib/types';
import {
  analyzeImage,
  extractTokenColorsBatched,
  assignTokensToGrid,
  computeGridDimensions,
} from '@/lib/mosaic';

const STANDARDS = ['ERC721', 'ERC1155'];
const MEDIA_TYPES = ['image', 'video', 'audio'];
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'chain', label: 'SPHERE' },
  { value: 'grid', label: 'GRID' },
  { value: 'creator', label: 'CREATOR' },
  { value: 'mediaType', label: 'MEDIA' },
  { value: 'date', label: 'DATE' },
  { value: 'tokenType', label: 'TYPE' },
];

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  color: '#666',
  letterSpacing: '0.1em',
  marginBottom: '6px',
  display: 'block',
};

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

function ToggleButton({ active, label, color, onClick }: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? (color || 'rgba(255,255,255,0.15)') : 'transparent',
        border: `1px solid ${active ? (color || 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)'}`,
        color: active ? '#fff' : '#555',
        padding: '6px 10px',
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: 'inherit',
        textTransform: 'uppercase' as const,
        marginRight: '4px',
        marginBottom: '4px',
        cursor: 'crosshair',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </button>
  );
}

export default function FilterPanel() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const activeChains = useStore((s) => s.activeChains);
  const toggleChain = useStore((s) => s.toggleChain);
  const evmAddresses = useStore((s) => s.evmAddresses);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);
  const mosaicOrder = useStore((s) => s.mosaicOrder);
  const setMosaicOrder = useStore((s) => s.setMosaicOrder);
  const tokenColorCache = useStore((s) => s.tokenColorCache);
  const setTokenColorCache = useStore((s) => s.setTokenColorCache);
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mosaicLoading, setMosaicLoading] = useState(false);
  const [mosaicProgress, setMosaicProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  function toggleArrayFilter(key: 'standards' | 'mediaTypes', value: string) {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilter(key, next);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  async function handleMosaicFile(file: File) {
    setMosaicLoading(true);
    setMosaicProgress('ANALYZING IMAGE...');
    try {
      const tokens = getFilteredTokens();
      if (tokens.length === 0) {
        setMosaicProgress('NO TOKENS');
        setTimeout(() => { setMosaicLoading(false); setMosaicProgress(''); }, 2000);
        return;
      }

      const bitmap = await createImageBitmap(file);
      const targetCols = isMobile ? 30 : 50;
      const { cols, rows } = computeGridDimensions(
        bitmap.width,
        bitmap.height,
        targetCols
      );
      bitmap.close();

      const cellColors = await analyzeImage(file, cols, rows);

      const tokenInputs = tokens
        .map((t) => ({ id: t.id, url: t.media.thumbnail || t.media.image || '' }))
        .filter((t) => t.url);

      const cached = tokenColorCache;
      const uncached = tokenInputs.filter((t) => !cached[t.id]);
      const tokenColors = new Map<string, [number, number, number]>();

      for (const t of tokenInputs) {
        if (cached[t.id]) tokenColors.set(t.id, cached[t.id]);
      }

      if (uncached.length > 0) {
        setMosaicProgress(`${tokenColors.size} CACHED / ${uncached.length} TO SCAN`);

        const freshColors = await extractTokenColorsBatched(
          uncached,
          15,
          (done, succeeded, total) => setMosaicProgress(`${tokenColors.size + succeeded} OK / ${tokenColors.size + done} OF ${tokenInputs.length}`)
        );

        const newCache = { ...cached };
        for (const [id, color] of freshColors) {
          tokenColors.set(id, color);
          newCache[id] = color;
        }
        setTokenColorCache(newCache);
      } else {
        setMosaicProgress(`${tokenColors.size} CACHED — MATCHING...`);
      }

      console.log('[MOSAIC] Token colors:', tokenColors.size, '/', tokenInputs.length, '(', uncached.length, 'freshly scanned)');

      if (tokenColors.size === 0) {
        setMosaicProgress('0 COLORS EXTRACTED — FAILED');
        setTimeout(() => { setMosaicLoading(false); setMosaicProgress(''); }, 3000);
        return;
      }

      setMosaicProgress(`MATCHING ${tokenColors.size} COLORS TO ${cellColors.length} CELLS...`);

      await new Promise((r) => setTimeout(r, 0));

      const order = assignTokensToGrid(cellColors, tokenColors);
      console.log('[MOSAIC] Grid:', cols, 'x', rows, '| Cells:', order.length, '| Unique tokens:', new Set(order).size);

      if (order.length === 0) {
        setMosaicProgress('MATCHING FAILED');
        setTimeout(() => { setMosaicLoading(false); setMosaicProgress(''); }, 2000);
        return;
      }

      setMosaicOrder(order, cols);

      // Verify it stuck
      const stored = useStore.getState();
      console.log('[MOSAIC] Store after set — mosaicOrder:', stored.mosaicOrder?.length, 'mosaicCols:', stored.mosaicCols);
      console.log('[MOSAIC] Sample IDs:', order.slice(0, 3));
      console.log('[MOSAIC] Store token IDs sample:', stored.tokens.slice(0, 3).map(t => t.id));
    } catch (err) {
      console.error('[MOSAIC] Error:', err);
      setMosaicProgress('ERROR — CHECK CONSOLE');
      setTimeout(() => { setMosaicProgress(''); }, 3000);
    }
    setMosaicLoading(false);
  }

  if (collapsed) {
    return (
      <div style={{
        position: 'fixed',
        top: isMobile ? '10px' : '20px',
        left: isMobile ? '10px' : '20px',
        zIndex: 50,
        display: 'flex',
        gap: '4px',
      }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            padding: isMobile ? '10px 14px' : '8px 12px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            cursor: 'crosshair',
            letterSpacing: '0.05em',
          }}
        >
          FILTERS
        </button>
        {!isMobile && (
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(10, 10, 15, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              padding: '8px 12px',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              cursor: 'crosshair',
              letterSpacing: '0.05em',
            }}
          >
            FULLSCREEN
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: isMobile ? 0 : '20px',
      left: isMobile ? 0 : '20px',
      right: isMobile ? 0 : 'auto',
      bottom: isMobile ? 0 : 'auto',
      zIndex: 50,
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(12px)',
      border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
      padding: isMobile ? '16px 16px 80px' : '16px',
      fontFamily: 'inherit',
      color: '#fff',
      minWidth: isMobile ? undefined : '240px',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#666',
            padding: isMobile ? '6px 12px' : '3px 8px',
            fontSize: isMobile ? '10px' : '9px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            cursor: 'crosshair',
            letterSpacing: '0.05em',
          }}
        >
          {isMobile ? 'CLOSE' : 'MINIMIZE'}
        </button>
        {!isMobile && (
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#666',
              padding: '3px 8px',
              fontSize: '9px',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              cursor: 'crosshair',
              letterSpacing: '0.05em',
            }}
          >
            FULLSCREEN
          </button>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>SOURCE</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <ToggleButton
            active={filters.showOwned}
            label="OWNED"
            onClick={() => setFilter('showOwned', !filters.showOwned)}
          />
          <ToggleButton
            active={filters.showCreated}
            label="CREATED"
            onClick={() => setFilter('showCreated', !filters.showCreated)}
          />
        </div>
      </div>

      {evmAddresses.length > 1 && (
        <div style={{ marginBottom: '12px' }}>
          <span style={labelStyle}>WALLETS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {evmAddresses.map((addr) => (
              <ToggleButton
                key={addr}
                active={filters.selectedWallets.length === 0 || filters.selectedWallets.some((w) => w.toLowerCase() === addr.toLowerCase())}
                label={`${addr.slice(0, 6)}...${addr.slice(-4)}`}
                onClick={() => {
                  const current = filters.selectedWallets;
                  const lower = addr.toLowerCase();
                  const isSelected = current.some((w) => w.toLowerCase() === lower);
                  if (isSelected) {
                    const next = current.filter((w) => w.toLowerCase() !== lower);
                    setFilter('selectedWallets', next);
                  } else {
                    setFilter('selectedWallets', [...current, addr]);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>VIEW</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px', marginBottom: '4px' }}>
            <button
              onClick={() => setFilter('useNewest', !filters.useNewest)}
              style={{
                background: filters.useNewest ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: `1px solid ${filters.useNewest ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRight: 'none',
                color: filters.useNewest ? '#fff' : '#555',
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                cursor: 'crosshair',
                letterSpacing: '0.05em',
              }}
            >
              NEWEST
            </button>
            <input
              type="number"
              min={1}
              max={9999}
              value={filters.newestCount}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 100;
                setFilter('newestCount', Math.max(1, v));
                if (!filters.useNewest) setFilter('useNewest', true);
              }}
              style={{
                width: '48px',
                background: filters.useNewest ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: `1px solid ${filters.useNewest ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: filters.useNewest ? '#fff' : '#555',
                padding: '6px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                textAlign: 'center',
                outline: 'none',
                cursor: 'crosshair',
              }}
            />
          </div>
          {CHAIN_KEYS.map((chain) => (
            <ToggleButton
              key={chain}
              active={activeChains.includes(chain)}
              label={CHAINS[chain].name}
              color={activeChains.includes(chain) ? CHAINS[chain].color + '40' : undefined}
              onClick={() => toggleChain(chain)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>TYPE</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {STANDARDS.map((s) => (
            <ToggleButton
              key={s}
              active={filters.standards.includes(s)}
              label={s.replace('ERC', '')}
              onClick={() => toggleArrayFilter('standards', s)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>MEDIA</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {MEDIA_TYPES.map((m) => (
            <ToggleButton
              key={m}
              active={filters.mediaTypes.includes(m)}
              label={m.toUpperCase()}
              onClick={() => toggleArrayFilter('mediaTypes', m)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>LAYOUT</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {SORT_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              active={filters.layout === opt.value}
              label={opt.label}
              onClick={() => setFilter('layout', opt.value as typeof filters.layout)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>MOSAIC</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleMosaicFile(file);
              e.target.value = '';
            }}
          />
          {mosaicOrder ? (
            <button
              onClick={() => setMosaicOrder(null)}
              style={{
                background: 'rgba(34, 139, 34, 0.25)',
                border: '1px solid #228B22',
                color: '#228B22',
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                cursor: 'crosshair',
                letterSpacing: '0.05em',
                marginRight: '4px',
                marginBottom: '4px',
              }}
            >
              CLEAR MOSAIC
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={mosaicLoading}
              style={{
                background: mosaicLoading ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: mosaicLoading ? '#555' : '#fff',
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                cursor: 'crosshair',
                letterSpacing: '0.05em',
                marginRight: '4px',
                marginBottom: '4px',
              }}
            >
              {mosaicLoading ? (mosaicProgress || 'PROCESSING...') : 'UPLOAD IMAGE'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>DENSITY</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#555' }}>TIGHT</span>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.density * 100}
            onChange={(e) => setFilter('density', Number(e.target.value) / 100)}
            style={{
              flex: 1,
              appearance: 'none',
              WebkitAppearance: 'none',
              height: '2px',
              background: 'rgba(255,255,255,0.2)',
              outline: 'none',
              cursor: 'crosshair',
              accentColor: '#fff',
            }}
          />
          <span style={{ fontSize: '9px', color: '#555' }}>SPREAD</span>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>SIZE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#555' }}>SM</span>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.thumbnailSize * 100}
            onChange={(e) => setFilter('thumbnailSize', Number(e.target.value) / 100)}
            style={{
              flex: 1,
              appearance: 'none',
              WebkitAppearance: 'none',
              height: '2px',
              background: 'rgba(255,255,255,0.2)',
              outline: 'none',
              cursor: 'crosshair',
              accentColor: '#fff',
            }}
          />
          <span style={{ fontSize: '9px', color: '#555' }}>LG</span>
        </div>
      </div>

      {filters.selectedCollection && (
        <div style={{ marginBottom: '12px' }}>
          <span style={labelStyle}>COLLECTION</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              color: '#228B22',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {filters.selectedCollection}
            </span>
            <button
              onClick={() => setFilter('selectedCollection', undefined)}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#666',
                padding: '3px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                cursor: 'crosshair',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>SEARCH</span>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setFilter('searchQuery', e.target.value)}
          placeholder="TOKEN NAME..."
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '8px',
            fontSize: '11px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => {
            const qs = filtersToParams(filters, evmAddresses, activeChains);
            const url = `${window.location.origin}${window.location.pathname}?${qs}`;
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          style={{
            width: '100%',
            background: copied ? 'rgba(34, 139, 34, 0.25)' : 'transparent',
            border: `1px solid ${copied ? '#228B22' : 'rgba(255,255,255,0.15)'}`,
            color: copied ? '#228B22' : '#fff',
            padding: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            cursor: 'crosshair',
            letterSpacing: '0.05em',
          }}
        >
          {copied ? 'COPIED TO CLIPBOARD' : 'SHARE THIS VIEW'}
        </button>
        <button
          onClick={() => {
            const tokens = getFilteredTokens();
            const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
            const rows = [['NAME', 'CHAIN', 'CONTRACT', 'TOKEN_ID', 'MEDIA_TYPE', 'IMAGE_URL', 'VIDEO_URL', 'AUDIO_URL', 'EXPLORER_URL'].join(',')];
            for (const t of tokens) {
              const chain = CHAINS[t.chain];
              const explorerUrl = chain ? `${chain.explorer}/token/${t.contractAddress}` : '';
              rows.push([
                escape(t.name),
                t.chain,
                t.contractAddress,
                t.tokenId || '',
                t.media.mediaType,
                t.media.image || t.media.thumbnail || '',
                t.media.video || '',
                t.media.audio || '',
                explorerUrl,
              ].join(','));
            }
            const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `tokens-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            cursor: 'crosshair',
            letterSpacing: '0.05em',
          }}
        >
          EXPORT CSV
        </button>
      </div>

    </div>
  );
}
