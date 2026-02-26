'use client';

import { useMemo } from 'react';
import type { UnifiedToken } from '@/lib/types';
import { computePositions } from '@/lib/layoutEngine';
import { useStore } from '@/hooks/useStore';
import TokenNode from './TokenNode';

interface TokenCloudProps {
  tokens: UnifiedToken[];
  onSelect: (token: UnifiedToken) => void;
}

export default function TokenCloud({ tokens, onSelect }: TokenCloudProps) {
  const sortBy = useStore((s) => s.filters.sortBy);
  const density = useStore((s) => s.filters.density);
  const newestCount = useStore((s) => s.filters.newestCount);

  const positionedTokens = useMemo(
    () => computePositions(tokens, sortBy, density, newestCount),
    [tokens, sortBy, density, newestCount]
  );

  return (
    <group>
      {positionedTokens
        .filter((token) => token.media.thumbnail || token.media.image)
        .map((token) => (
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
