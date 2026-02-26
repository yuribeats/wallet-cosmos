'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { UnifiedToken } from '@/lib/types';
import { CHAINS, type ChainKey } from '@/lib/constants';

interface TokenNodeProps {
  token: UnifiedToken;
  targetPosition: [number, number, number];
  thumbnailSize: number;
  onSelect: (token: UnifiedToken) => void;
}

const _scaleVec = new THREE.Vector3();

export default function TokenNode({ token, targetPosition, thumbnailSize, onSelect }: TokenNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const currentPos = useRef(new THREE.Vector3(...targetPosition));
  const targetVec = useMemo(() => new THREE.Vector3(...targetPosition), [targetPosition]);

  const chainColor = CHAINS[token.chain as ChainKey]?.color || '#ffffff';

  const texture = useMemo(() => {
    const url = token.media.thumbnail || token.media.image;
    if (!url) return null;
    const tex = new THREE.TextureLoader().load(
      url,
      () => setLoaded(true),
      undefined,
      () => setLoaded(false),
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [token.media.thumbnail, token.media.image]);

  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const lerpFactor = 1 - Math.pow(0.001, delta);

    currentPos.current.lerp(targetVec, lerpFactor);
    meshRef.current.position.copy(currentPos.current);

    meshRef.current.quaternion.copy(camera.quaternion);

    const baseScale = 0.4 + thumbnailSize * 29.6;
    const targetScale = hovered ? baseScale * 1.05 : baseScale;
    _scaleVec.set(targetScale, targetScale, targetScale);
    meshRef.current.scale.lerp(_scaleVec, lerpFactor);
  });

  if (!texture || (!loaded && !hovered)) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={currentPos.current}
      onClick={(e) => { e.stopPropagation(); onSelect(token); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      visible={loaded}
    >
      <planeGeometry args={[1, 1]} />

      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={hovered ? 1 : 0.9}
      />

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
            fontFamily: 'inherit',
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
