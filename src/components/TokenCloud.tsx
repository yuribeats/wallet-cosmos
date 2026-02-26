'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { UnifiedToken } from '@/lib/types';
import { computePositions } from '@/lib/layoutEngine';
import { useStore } from '@/hooks/useStore';
import { CHAINS, type ChainKey } from '@/lib/constants';

const MAX = 5000;
const _c = new THREE.Color();

interface TokenCloudProps {
  tokens: UnifiedToken[];
  onSelect: (token: UnifiedToken) => void;
}

export default function TokenCloud({ tokens, onSelect }: TokenCloudProps) {
  const sortBy = useStore((s) => s.filters.sortBy);
  const density = useStore((s) => s.filters.density);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const curr = useRef(new Float32Array(MAX * 3));
  const tgt = useRef(new Float32Array(MAX * 3));
  const prevCount = useRef(0);
  const settled = useRef(false);

  const positioned = useMemo(
    () => computePositions(tokens, sortBy, density),
    [tokens, sortBy, density]
  );

  const tokensRef = useRef(positioned);
  tokensRef.current = positioned;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const count = positioned.length;
    const old = prevCount.current;
    const buf = mesh.instanceMatrix.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const pos = positioned[i].position || [0, 0, 0];
      const i3 = i * 3;

      tgt.current[i3] = pos[0];
      tgt.current[i3 + 1] = pos[1];
      tgt.current[i3 + 2] = pos[2];

      if (i >= old) {
        curr.current[i3] = pos[0];
        curr.current[i3 + 1] = pos[1];
        curr.current[i3 + 2] = pos[2];

        const b = i * 16;
        buf[b] = 1; buf[b + 1] = 0; buf[b + 2] = 0; buf[b + 3] = 0;
        buf[b + 4] = 0; buf[b + 5] = 1; buf[b + 6] = 0; buf[b + 7] = 0;
        buf[b + 8] = 0; buf[b + 9] = 0; buf[b + 10] = 1; buf[b + 11] = 0;
        buf[b + 12] = pos[0]; buf[b + 13] = pos[1]; buf[b + 14] = pos[2]; buf[b + 15] = 1;
      }

      _c.set(CHAINS[positioned[i].chain as ChainKey]?.color || '#ffffff');
      mesh.setColorAt(i, _c);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = count;
    prevCount.current = count;
    settled.current = false;
  }, [positioned]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || mesh.count === 0 || settled.current) return;

    const count = mesh.count;
    const f = 1 - Math.pow(0.92, delta * 60);
    const c = curr.current;
    const t = tgt.current;
    const buf = mesh.instanceMatrix.array as Float32Array;
    let moving = false;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const dx = t[i3] - c[i3];
      const dy = t[i3 + 1] - c[i3 + 1];
      const dz = t[i3 + 2] - c[i3 + 2];
      if (dx * dx + dy * dy + dz * dz < 0.00001) continue;

      moving = true;
      c[i3] += dx * f;
      c[i3 + 1] += dy * f;
      c[i3 + 2] += dz * f;

      buf[i * 16 + 12] = c[i3];
      buf[i * 16 + 13] = c[i3 + 1];
      buf[i * 16 + 14] = c[i3 + 2];
    }

    if (moving) {
      mesh.instanceMatrix.needsUpdate = true;
    } else {
      settled.current = true;
    }
  });

  const handleClick = useCallback((e: { stopPropagation: () => void; instanceId?: number }) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id !== undefined && id < tokensRef.current.length) {
      onSelect(tokensRef.current[id]);
    }
  }, [onSelect]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX]}
      onClick={handleClick}
      frustumCulled={false}
    >
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
