'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import TokenCloud from './TokenCloud';
import ConnectionLines from './ConnectionLines';

export default function Scene() {
  const tokens = useStore((s) => s.tokens);
  const filters = useStore((s) => s.filters);
  const senders = useStore((s) => s.senders);
  const connections = useStore((s) => s.connections);
  const setSelectedToken = useStore((s) => s.setSelectedToken);
  const getFilteredTokens = useStore((s) => s.getFilteredTokens);
  const filteredTokens = useMemo(() => getFilteredTokens(), [tokens, filters, senders, getFilteredTokens]);

  return (
    <Canvas
      camera={{ position: [0, 0, 60], fov: 60 }}
      style={{ position: 'fixed', inset: 0, background: '#0a0a0f' }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[20, 20, 20]} intensity={0.5} />
      <pointLight position={[-20, -20, -10]} intensity={0.3} color="#627EEA" />

      <Stars
        radius={100}
        depth={80}
        count={1500}
        factor={3}
        saturation={0}
        fade
        speed={0.3}
      />

      <TokenCloud tokens={filteredTokens} onSelect={setSelectedToken} />
      <ConnectionLines connections={connections} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={300}
        enablePan
        panSpeed={0.8}
        rotateSpeed={0.5}
      />

    </Canvas>
  );
}
