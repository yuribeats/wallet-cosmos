'use client';

import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { CHAINS, CHAIN_KEYS } from '@/lib/constants';

function truncate(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function HUD() {
  const tokens = useStore((s) => s.tokens);
  const isLoading = useStore((s) => s.isLoading);
  const evmAddress = useStore((s) => s.evmAddress);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);
  const filters = useStore((s) => s.filters);
  const filteredCount = useMemo(() => getFilteredTokens().length, [tokens, filters, getFilteredTokens]);

  const chainCounts: Record<string, number> = {};
  for (const chain of CHAIN_KEYS) {
    chainCounts[chain] = tokens.filter((t) => t.chain === chain).length;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      fontFamily: 'inherit',
      color: '#fff',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(10, 10, 15, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 16px',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {evmAddress && <span style={{ color: '#666' }}>{truncate(evmAddress)}</span>}
        <span style={{ margin: '0 12px', color: '#333' }}>|</span>
        <span>{isLoading ? 'LOADING...' : `${filteredCount} / ${tokens.length} TOKENS`}</span>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'rgba(10, 10, 15, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 16px',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {CHAIN_KEYS.map((chain) => (
          <span key={chain} style={{ color: CHAINS[chain].color }}>
            {CHAINS[chain].name}: {chainCounts[chain] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}
