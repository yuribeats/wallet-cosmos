'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { CHAINS, CHAIN_KEYS } from '@/lib/constants';
import type { ChainKey } from '@/lib/constants';

const STANDARDS = ['ERC721', 'ERC1155'];
const MEDIA_TYPES = ['image', 'video'];
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
        padding: '4px 8px',
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
  const activeChain = useStore((s) => s.activeChain);
  const setActiveChain = useStore((s) => s.setActiveChain);
  const [collapsed, setCollapsed] = useState(false);

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

  if (collapsed) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
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
            padding: '8px 12px',
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
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      zIndex: 50,
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '16px',
      fontFamily: 'inherit',
      color: '#fff',
      minWidth: '240px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button
          onClick={() => setCollapsed(true)}
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
          MINIMIZE
        </button>
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
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>VIEW</span>
        <div>
          {CHAIN_KEYS.map((chain) => (
            <ToggleButton
              key={chain}
              active={activeChain === chain}
              label={CHAINS[chain].name}
              color={activeChain === chain ? CHAINS[chain].color + '40' : undefined}
              onClick={() => setActiveChain(chain as ChainKey)}
            />
          ))}
          <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '4px' }}>
            <button
              onClick={() => setFilter('sortBy', 'newest')}
              style={{
                background: filters.sortBy === 'newest' ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: `1px solid ${filters.sortBy === 'newest' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRight: 'none',
                color: filters.sortBy === 'newest' ? '#fff' : '#555',
                padding: '4px 8px',
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
                if (filters.sortBy !== 'newest') setFilter('sortBy', 'newest');
              }}
              style={{
                width: '48px',
                background: filters.sortBy === 'newest' ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: `1px solid ${filters.sortBy === 'newest' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: filters.sortBy === 'newest' ? '#fff' : '#555',
                padding: '4px 6px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                textAlign: 'center',
                outline: 'none',
                cursor: 'crosshair',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>TYPE</span>
        <div>
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
        <div>
          {MEDIA_TYPES.map((m) => (
            <ToggleButton
              key={m}
              active={filters.mediaTypes.includes(m)}
              label={m}
              onClick={() => toggleArrayFilter('mediaTypes', m)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={labelStyle}>LAYOUT</span>
        <div>
          {SORT_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              active={filters.sortBy === opt.value}
              label={opt.label}
              onClick={() => setFilter('sortBy', opt.value as typeof filters.sortBy)}
            />
          ))}
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

      <div style={{ marginBottom: '0' }}>
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
            padding: '6px 8px',
            fontSize: '11px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
