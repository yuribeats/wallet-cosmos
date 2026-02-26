'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { UnifiedToken } from '@/lib/types';
import { computePositions } from '@/lib/layoutEngine';
import { useStore } from '@/hooks/useStore';
import { CHAINS, type ChainKey } from '@/lib/constants';

interface TokenCloudProps {
  tokens: UnifiedToken[];
  onSelect: (token: UnifiedToken) => void;
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

export default function TokenCloud({ tokens, onSelect }: TokenCloudProps) {
  const sortBy = useStore((s) => s.filters.sortBy);
  const density = useStore((s) => s.filters.density);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredRef = useRef<number | null>(null);
  const currentPositions = useRef<Float32Array | null>(null);

  const positionedTokens = useMemo(
    () => computePositions(tokens, sortBy, density),
    [tokens, sortBy, density]
  );

  const targetPositions = useMemo(() => {
    const arr = new Float32Array(positionedTokens.length * 3);
    for (let i = 0; i < positionedTokens.length; i++) {
      const p = positionedTokens[i].position || [0, 0, 0];
      arr[i * 3] = p[0];
      arr[i * 3 + 1] = p[1];
      arr[i * 3 + 2] = p[2];
    }
    return arr;
  }, [positionedTokens]);

  const chainColors = useMemo(() => {
    const arr = new Float32Array(positionedTokens.length * 3);
    for (let i = 0; i < positionedTokens.length; i++) {
      const hex = CHAINS[positionedTokens[i].chain as ChainKey]?.color || '#ffffff';
      tmpColor.set(hex);
      arr[i * 3] = tmpColor.r;
      arr[i * 3 + 1] = tmpColor.g;
      arr[i * 3 + 2] = tmpColor.b;
    }
    return arr;
  }, [positionedTokens]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || positionedTokens.length === 0) return;

    currentPositions.current = new Float32Array(targetPositions);

    for (let i = 0; i < positionedTokens.length; i++) {
      const i3 = i * 3;
      dummy.position.set(targetPositions[i3], targetPositions[i3 + 1], targetPositions[i3 + 2]);
      dummy.scale.setScalar(0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.setRGB(chainColors[i3], chainColors[i3 + 1], chainColors[i3 + 2]);
      mesh.setColorAt(i, tmpColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [positionedTokens, targetPositions, chainColors]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || positionedTokens.length === 0 || !currentPositions.current) return;

    const cur = currentPositions.current;
    const t = Date.now() * 0.001;

    for (let i = 0; i < positionedTokens.length; i++) {
      const i3 = i * 3;
      cur[i3] += (targetPositions[i3] - cur[i3]) * 0.04;
      cur[i3 + 1] += (targetPositions[i3 + 1] - cur[i3 + 1]) * 0.04;
      cur[i3 + 2] += (targetPositions[i3 + 2] - cur[i3 + 2]) * 0.04;

      const bob = Math.sin(t + cur[i3]) * 0.05;
      const scale = i === hoveredRef.current ? 1.2 : 0.8;

      dummy.position.set(cur[i3], cur[i3 + 1] + bob, cur[i3 + 2]);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  const { raycaster, camera, pointer } = useThree();

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!meshRef.current) return;
    e.stopPropagation();
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(meshRef.current);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const token = positionedTokens[hits[0].instanceId];
      if (token) onSelect(token);
    }
  }, [positionedTokens, onSelect, raycaster, camera, pointer]);

  if (positionedTokens.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, positionedTokens.length]}
      onClick={handleClick}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#ffffff"
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
}
