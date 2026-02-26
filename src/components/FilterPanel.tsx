'use client';

import { useStore } from '@/hooks/useStore';
import { CHAINS, CHAIN_KEYS, type ChainKey } from '@/lib/constants';

const STANDARDS = ['ERC721', 'ERC1155', 'ERC20'];
const MEDIA_TYPES = ['image', 'video', 'audio', 'text', 'html'];
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'chain', label: 'CHAIN' },
  { value: 'creator', label: 'CREATOR' },
  { value: 'mediaType', label: 'MEDIA' },
  { value: 'date', label: 'DATE' },
  { value: 'tokenType', label: 'TYPE' },
];

const panelStyle: React.CSSProperties = {
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
};

const rowStyle: React.CSSProperties = {
  marginBottom: '12px',
};

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
  const { filters, setFilter } = useStore();

  function toggleArrayFilter(key: 'chains' | 'standards' | 'mediaTypes', value: string) {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilter(key, next);
  }

  return (
    <div style={panelStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>CHAIN</span>
        <div>
          {CHAIN_KEYS.map((chain) => (
            <ToggleButton
              key={chain}
              active={filters.chains.includes(chain)}
              label={CHAINS[chain].name}
              color={filters.chains.includes(chain) ? CHAINS[chain].color + '40' : undefined}
              onClick={() => toggleArrayFilter('chains', chain)}
            />
          ))}
        </div>
      </div>

      <div style={rowStyle}>
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

      <div style={rowStyle}>
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

      <div style={rowStyle}>
        <span style={labelStyle}>SORT BY</span>
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

      <div style={rowStyle}>
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
