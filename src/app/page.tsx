'use client';

import dynamic from 'next/dynamic';
import { useWalletData } from '@/hooks/useWalletData';
import { useStore } from '@/hooks/useStore';
import FilterPanel from '@/components/FilterPanel';
import TokenDetail from '@/components/TokenDetail';
import HUD from '@/components/HUD';

const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Home() {
  useWalletData();

  const { selectedToken, setSelectedToken, isLoading, error } = useStore();

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', cursor: 'crosshair' }}>
      <Scene />
      <FilterPanel />
      <HUD />

      {selectedToken && (
        <TokenDetail
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#fff',
        }}>
          LOADING WALLET DATA...
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          fontFamily: 'Arial, sans-serif',
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
