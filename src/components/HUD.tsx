'use client';

import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { CHAINS } from '@/lib/constants';

function truncate(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function HUD() {
  const tokens = useStore((s) => s.tokens);
  const isLoading = useStore((s) => s.isLoading);
  const evmAddress = useStore((s) => s.evmAddress);
  const activeChain = useStore((s) => s.activeChain);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);
  const filters = useStore((s) => s.filters);
  const filteredCount = useMemo(() => getFilteredTokens().length, [tokens, filters, getFilteredTokens]);

  const chain = CHAINS[activeChain];

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      right: '10px',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: '6px',
      fontFamily: 'inherit',
      color: '#fff',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(10, 10, 15, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {evmAddress && <span style={{ color: '#666' }}>{truncate(evmAddress)}</span>}
        <span style={{ margin: '0 8px', color: '#333' }}>|</span>
        <span>{isLoading ? 'LOADING...' : `${filteredCount} / ${tokens.length}`}</span>
      </div>

      <div style={{
        background: 'rgba(10, 10, 15, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        <span style={{ color: chain.color }}>
          {filters.sortBy === 'newest' ? 'ALL CHAINS' : chain.name}: {tokens.length}
        </span>
      </div>
    </div>
  );
}
