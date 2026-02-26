'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { UnifiedToken } from '@/lib/types';
import { computePositions } from '@/lib/layoutEngine';
import { useStore } from '@/hooks/useStore';
import { CHAINS, type ChainKey } from '@/lib/constants';

interface TokenCloudProps {
  tokens: UnifiedToken[];
  onSelect: (token: UnifiedToken) => void;
}

const loader = new THREE.TextureLoader();

function TokenNode({ token, targetPosition, onSelect }: {
  token: UnifiedToken;
  targetPosition: [number, number, number];
  onSelect: (token: UnifiedToken) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const chainColor = CHAINS[token.chain as ChainKey]?.color || '#ffffff';

  const texture = useMemo(() => {
    const url = token.media.thumbnail || token.media.image;
    if (!url) return null;
    try {
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      return null;
    }
  }, [token.media.thumbnail, token.media.image]);

  useFrame(() => {
    if (!meshRef.current) return;
    const p = meshRef.current.position;
    p.x += (targetPosition[0] - p.x) * 0.06;
    p.y += (targetPosition[1] - p.y) * 0.06;
    p.z += (targetPosition[2] - p.z) * 0.06;
  });

  return (
    <mesh
      ref={meshRef}
      position={targetPosition}
      onClick={(e) => { e.stopPropagation(); onSelect(token); }}
    >
      <planeGeometry args={[0.8, 0.8]} />
      {texture ? (
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      ) : (
        <meshBasicMaterial
          color={chainColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      )}
    </mesh>
  );
}

export default function TokenCloud({ tokens, onSelect }: TokenCloudProps) {
  const sortBy = useStore((s) => s.filters.sortBy);
  const density = useStore((s) => s.filters.density);

  const positionedTokens = useMemo(
    () => computePositions(tokens, sortBy, density),
    [tokens, sortBy, density]
  );

  return (
    <group>
      {positionedTokens.map((token) => (
        <TokenNode
          key={token.id}
          token={token}
          targetPosition={token.position || [0, 0, 0]}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
