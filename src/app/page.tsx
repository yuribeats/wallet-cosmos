'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWalletData } from '@/hooks/useWalletData';
import { useStore } from '@/hooks/useStore';
import FilterPanel from '@/components/FilterPanel';
import TokenDetail from '@/components/TokenDetail';
import HUD from '@/components/HUD';
import WalletInput from '@/components/WalletInput';
import TokenGrid from '@/components/TokenGrid';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function Home() {
  useWalletData();

  const walletLoaded = useStore((s) => s.walletLoaded);
  const selectedToken = useStore((s) => s.selectedToken);
  const setSelectedToken = useStore((s) => s.setSelectedToken);
  const isLoading = useStore((s) => s.isLoading);
  const loadProgress = useStore((s) => s.loadProgress);
  const error = useStore((s) => s.error);
  const tokens = useStore((s) => s.tokens);
  const filters = useStore((s) => s.filters);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);

  const senders = useStore((s) => s.senders);
  const filteredTokens = useMemo(() => getFilteredTokens(), [tokens, filters, senders, getFilteredTokens]);

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [SceneComponent, setSceneComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const supported = hasWebGL();
    setWebgl(supported);
    if (supported) {
      import('@/components/Scene')
        .then((mod) => setSceneComponent(() => mod.default))
        .catch(() => setWebgl(false));
    }
  }, []);

  if (!walletLoaded) {
    return <WalletInput />;
  }

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', cursor: 'crosshair' }}>
      {webgl && SceneComponent ? (
        <SceneComponent />
      ) : (
        <TokenGrid tokens={filteredTokens} onSelect={setSelectedToken} />
      )}

      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          pointerEvents: 'all',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          background: 'rgba(10, 10, 15, 0.85)',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#fff',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            fontWeight: 'bold',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#fff',
          }}>
            LOADING
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <FilterPanel />
          <HUD />
        </>
      )}

      {selectedToken && !isLoading && (
        <TokenDetail
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {error && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          fontWeight: 'bold',
          fontSize: '12px',
          textTransform: 'uppercase',
          color: '#FF0420',
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          {error}
        </div>
      )}
    </main>
  );
}
