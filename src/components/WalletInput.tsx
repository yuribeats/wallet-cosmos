'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { isEvmAddress } from '@/lib/constants';

function isEnsName(value: string): boolean {
  return value.includes('.') && !value.startsWith('0x');
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletInput() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [wallets, setWallets] = useState<string[]>([]);
  const loadWallets = useStore((s) => s.loadWallets);

  async function handleAdd() {
    const input = value.trim();
    if (!input) {
      setError('ENTER A WALLET ADDRESS OR ENS NAME');
      return;
    }

    let address = '';

    if (isEvmAddress(input)) {
      address = input;
    } else if (isEnsName(input)) {
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
        address = data.address;
        setResolving(false);
      } catch {
        setError('FAILED TO RESOLVE ENS');
        setResolving(false);
        return;
      }
    } else {
      setError('INVALID ADDRESS OR ENS NAME');
      return;
    }

    if (wallets.some((w) => w.toLowerCase() === address.toLowerCase())) {
      setError('WALLET ALREADY ADDED');
      return;
    }

    setError('');
    setWallets([...wallets, address]);
    setValue('');
  }

  function handleRemove(addr: string) {
    setWallets(wallets.filter((w) => w !== addr));
  }

  function handleLoad() {
    if (wallets.length === 0) return;
    loadWallets(wallets);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (wallets.length > 0 && !value.trim()) {
        handleLoad();
      } else {
        handleAdd();
      }
    }
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="0X... OR NAME.ETH"
            style={{
              width: '440px',
              maxWidth: '70vw',
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
          <button
            onClick={handleAdd}
            disabled={resolving}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '12px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              cursor: 'crosshair',
              opacity: resolving ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {resolving ? '...' : 'ADD'}
          </button>
        </div>
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

      {wallets.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '520px',
          maxWidth: '90vw',
          marginTop: '8px',
        }}>
          {wallets.map((w) => (
            <div key={w} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#999',
                fontFamily: 'inherit',
                letterSpacing: '0.05em',
              }}>
                {truncate(w)}
              </span>
              <button
                onClick={() => handleRemove(w)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#555',
                  padding: '3px 8px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  cursor: 'crosshair',
                  letterSpacing: '0.05em',
                }}
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleLoad}
        disabled={wallets.length === 0}
        style={{
          background: wallets.length > 0 ? '#fff' : 'rgba(255,255,255,0.1)',
          color: wallets.length > 0 ? '#0a0a0f' : '#333',
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
