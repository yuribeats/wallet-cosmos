'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { DEFAULT_WALLET, isEvmAddress } from '@/lib/constants';

function isEnsName(value: string): boolean {
  return value.includes('.') && !value.startsWith('0x');
}

export default function WalletInput() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const loadWallet = useStore((s) => s.loadWallet);

  async function handleLoad() {
    const input = value.trim();
    if (!input) {
      setError('ENTER A WALLET ADDRESS OR ENS NAME');
      return;
    }

    if (isEvmAddress(input)) {
      setError('');
      loadWallet(input);
      return;
    }

    if (isEnsName(input)) {
      setResolving(true);
      setError('');
      try {
        const res = await fetch(`/api/resolve-ens?${new URLSearchParams({ name: input })}`);
        const data = await res.json();
        if (!res.ok || !data.address) {
          setError('ENS NAME NOT FOUND');
          setResolving(false);
          return;
        }
        setResolving(false);
        loadWallet(data.address);
      } catch {
        setError('FAILED TO RESOLVE ENS');
        setResolving(false);
      }
      return;
    }

    setError('INVALID ADDRESS OR ENS NAME');
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
          WALLET ADDRESS OR ENS NAME
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="0X... OR NAME.ETH"
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
        disabled={resolving}
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
          opacity: resolving ? 0.5 : 1,
        }}
      >
        {resolving ? 'RESOLVING...' : 'LOAD'}
      </button>
    </div>
  );
}
