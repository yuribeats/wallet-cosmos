'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useWalletData } from '@/hooks/useWalletData';
import { useStore } from '@/hooks/useStore';
import { paramsToState } from '@/lib/urlFilters';
import FilterPanel from '@/components/FilterPanel';
import TokenDetail from '@/components/TokenDetail';
import HUD from '@/components/HUD';
import WalletInput from '@/components/WalletInput';
import TokenGrid from '@/components/TokenGrid';
import dynamic from 'next/dynamic';

const PlaylistPlayer = dynamic(() => import('@/components/PlaylistPlayer'), { ssr: false });

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
  const playlistOpen = useStore((s) => s.playlistOpen);
  const isLoading = useStore((s) => s.isLoading);
  const loadProgress = useStore((s) => s.loadProgress);
  const error = useStore((s) => s.error);
  const tokens = useStore((s) => s.tokens);
  const filters = useStore((s) => s.filters);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);

  const filteredTokens = useMemo(() => getFilteredTokens(), [tokens, filters, getFilteredTokens]);

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [SceneComponent, setSceneComponent] = useState<React.ComponentType | null>(null);
  const urlApplied = useRef(false);

  useEffect(() => {
    if (urlApplied.current) return;
    urlApplied.current = true;
    const result = paramsToState(window.location.search);
    if (!result) return;

    const { wallets, chains, filters: urlFilters } = result;
    const store = useStore.getState();

    if (urlFilters) {
      for (const [key, value] of Object.entries(urlFilters)) {
        store.setFilter(key as keyof typeof urlFilters, value as never);
      }
    }
    if (chains && chains.length > 0) store.setActiveChains(chains);
    if (wallets && wallets.length > 0) store.loadWallets(wallets);

    window.history.replaceState({}, '', window.location.pathname);
  }, []);

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
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          zIndex: 300,
          background: 'rgba(255,255,255,0.05)',
        }}>
          <div style={{
            height: '100%',
            background: '#fff',
            width: `${Math.max(loadProgress * 100, 5)}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      <FilterPanel />
      <HUD />

      {selectedToken && (
        <TokenDetail
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {playlistOpen && <PlaylistPlayer />}

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
