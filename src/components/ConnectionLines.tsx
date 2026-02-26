'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { WalletConnection } from '@/lib/types';

interface ConnectionLinesProps {
  connections: WalletConnection[];
}

export default function ConnectionLines({ connections }: ConnectionLinesProps) {
  const lines = useMemo(() => {
    const top = [...connections]
      .sort((a, b) => b.transferCount - a.transferCount)
      .slice(0, 20);

    return top.map((conn, i) => {
      const angle = (i / top.length) * Math.PI * 2;
      const distance = 25 + Math.random() * 10;
      const endPoint: [number, number, number] = [
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * distance,
      ];

      const opacity = Math.min(0.6, conn.transferCount / 20);

      return {
        points: [[0, 0, 0] as [number, number, number], endPoint],
        opacity,
        key: conn.address,
      };
    });
  }, [connections]);

  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color="#ffffff"
          lineWidth={1}
          transparent
          opacity={line.opacity}
        />
      ))}
    </group>
  );
}
