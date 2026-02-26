'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { DEFAULT_WALLET, isEvmAddress, isSolanaAddress } from '@/lib/constants';

const inputStyle: React.CSSProperties = {
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
};

export default function WalletInput() {
  const [evmValue, setEvmValue] = useState(DEFAULT_WALLET);
  const [solValue, setSolValue] = useState('');
  const [error, setError] = useState('');
  const loadWallets = useStore((s) => s.loadWallets);

  function handleLoad() {
    const evm = evmValue.trim();
    const sol = solValue.trim();

    if (!evm && !sol) {
      setError('ENTER AT LEAST ONE WALLET ADDRESS');
      return;
    }
    if (evm && !isEvmAddress(evm)) {
      setError('INVALID EVM ADDRESS');
      return;
    }
    if (sol && !isSolanaAddress(sol)) {
      setError('INVALID SOLANA ADDRESS');
      return;
    }

    setError('');
    loadWallets(evm, sol);
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
          EVM ADDRESS
        </div>
        <input
          type="text"
          value={evmValue}
          onChange={(e) => setEvmValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="0X..."
          style={inputStyle}
        />
      </div>

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
          SOLANA ADDRESS
        </div>
        <input
          type="text"
          value={solValue}
          onChange={(e) => setSolValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="BASE58..."
          style={inputStyle}
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
