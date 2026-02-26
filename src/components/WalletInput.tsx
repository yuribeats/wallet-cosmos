'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { DEFAULT_WALLET, isEvmAddress } from '@/lib/constants';

export default function WalletInput() {
  const [value, setValue] = useState(DEFAULT_WALLET);
  const [error, setError] = useState('');
  const loadWallet = useStore((s) => s.loadWallet);

  function handleLoad() {
    const addr = value.trim();
    if (!addr) {
      setError('ENTER A WALLET ADDRESS');
      return;
    }
    if (!isEvmAddress(addr)) {
      setError('INVALID EVM ADDRESS');
      return;
    }
    setError('');
    loadWallet(addr);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLoad();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 500,
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#666',
          alignSelf: 'flex-start',
          marginLeft: '2px',
        }}>
          WALLET ADDRESS
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="0X..."
          style={{
            width: '520px',
            maxWidth: '90vw',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '12px 16px',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            textTransform: 'none',
            outline: 'none',
            letterSpacing: '0.02em',
            boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {error && (
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#FF0420',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleLoad}
        style={{
          background: '#fff',
          color: '#0a0a0f',
          border: 'none',
          padding: '10px 40px',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'inherit',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          cursor: 'crosshair',
          marginTop: '8px',
        }}
      >
        LOAD
      </button>
    </div>
  );
}
