'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { UnifiedToken } from '@/lib/types';
import { CHAINS, type ChainKey } from '@/lib/constants';

interface TokenNodeProps {
  token: UnifiedToken;
  targetPosition: [number, number, number];
  onSelect: (token: UnifiedToken) => void;
}

export default function TokenNode({ token, targetPosition, onSelect }: TokenNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const currentPos = useRef(new THREE.Vector3(...targetPosition));
  const targetVec = useMemo(() => new THREE.Vector3(...targetPosition), [targetPosition]);

  const chainColor = CHAINS[token.chain as ChainKey]?.color || '#ffffff';
  const isErc20 = token.standard === 'ERC20';
  const size = isErc20 ? 0.4 : 0.8;

  // Load texture if image available
  const texture = useMemo(() => {
    const url = token.media.thumbnail || token.media.image;
    if (!url) return null;
    try {
      const tex = new THREE.TextureLoader().load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      return null;
    }
  }, [token.media.thumbnail, token.media.image]);

  useFrame(() => {
    if (!meshRef.current) return;

    // Lerp to target position
    currentPos.current.lerp(targetVec, 0.04);
    meshRef.current.position.copy(currentPos.current);

    // Floating animation
    meshRef.current.position.y += Math.sin(Date.now() * 0.001 + currentPos.current.x) * 0.05;

    // Scale on hover
    const targetScale = hovered ? size * 1.3 : size;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={currentPos.current}
      onClick={(e) => { e.stopPropagation(); onSelect(token); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {isErc20 ? (
        <sphereGeometry args={[0.5, 16, 16]} />
      ) : (
        <planeGeometry args={[1, 1]} />
      )}

      {texture ? (
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          transparent
          opacity={hovered ? 1 : 0.9}
        />
      ) : (
        <meshStandardMaterial
          color={chainColor}
          emissive={chainColor}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          transparent
          opacity={0.85}
        />
      )}

      {/* Chain color ring */}
      {!isErc20 && (
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.52, 0.58, 32]} />
          <meshBasicMaterial
            color={chainColor}
            transparent
            opacity={hovered ? 0.7 : 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {hovered && (
        <Html
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '4px 10px',
            fontFamily: 'monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            border: `1px solid ${chainColor}`,
          }}>
            {token.name}
          </div>
        </Html>
      )}
    </mesh>
  );
}
