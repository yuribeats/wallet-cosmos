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

  const positionedTokens = useMemo(
    () => computePositions(tokens, sortBy),
    [tokens, sortBy]
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
