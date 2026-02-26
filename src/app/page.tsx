'use client';

import dynamic from 'next/dynamic';
import { useWalletData } from '@/hooks/useWalletData';
import { useStore } from '@/hooks/useStore';
import FilterPanel from '@/components/FilterPanel';
import TokenDetail from '@/components/TokenDetail';
import HUD from '@/components/HUD';
import WalletInput from '@/components/WalletInput';

const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Home() {
  useWalletData();

  const walletLoaded = useStore((s) => s.walletLoaded);
  const selectedToken = useStore((s) => s.selectedToken);
  const setSelectedToken = useStore((s) => s.setSelectedToken);
  const isLoading = useStore((s) => s.isLoading);
  const loadProgress = useStore((s) => s.loadProgress);
  const error = useStore((s) => s.error);

  if (!walletLoaded) {
    return <WalletInput />;
  }

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', cursor: 'crosshair' }}>
      <Scene />

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
          gap: '16px',
          background: 'rgba(10, 10, 15, 0.6)',
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#fff',
          }}>
            LOADING {Math.round(loadProgress * 100)}%
          </div>
          <div style={{
            width: '280px',
            height: '2px',
            background: 'rgba(255,255,255,0.1)',
          }}>
            <div style={{
              width: `${loadProgress * 100}%`,
              height: '100%',
              background: '#fff',
              transition: 'width 0.3s ease-out',
            }} />
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
