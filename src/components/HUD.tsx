'use client';

import { useStore } from '@/hooks/useStore';
import { CHAINS, CHAIN_KEYS, type ChainKey } from '@/lib/constants';

export default function HUD() {
  const { tokens, isLoading, walletAddress } = useStore();
  const filteredCount = useStore((s) => s.getFilteredTokens().length);
  const truncAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

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
        <span style={{ color: '#666' }}>{truncAddr}</span>
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
