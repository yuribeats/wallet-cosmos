'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { DEFAULT_WALLET, isEvmAddress, isSolanaAddress } from '@/lib/constants';

export default function WalletInput() {
  const [value, setValue] = useState(DEFAULT_WALLET);
  const [error, setError] = useState('');
  const loadWallet = useStore((s) => s.loadWallet);

  function handleLoad() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('ENTER A WALLET ADDRESS');
      return;
    }
    if (!isEvmAddress(trimmed) && !isSolanaAddress(trimmed)) {
      setError('INVALID ADDRESS - USE EVM (0X...) OR SOLANA');
      return;
    }
    setError('');
    loadWallet(trimmed);
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
      <div style={{
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: '#666',
        marginBottom: '4px',
      }}>
        WALLET ADDRESS
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
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
          boxSizing: 'border-box',
        }}
      />

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
        }}
      >
        LOAD
      </button>

      <div style={{
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#333',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: '8px',
      }}>
        EVM (0X...) OR SOLANA (BASE58)
      </div>
    </div>
  );
}
