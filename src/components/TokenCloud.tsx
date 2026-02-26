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
  const layout = useStore((s) => s.filters.layout);
  const useNewest = useStore((s) => s.filters.useNewest);
  const density = useStore((s) => s.filters.density);
  const newestCount = useStore((s) => s.filters.newestCount);
  const thumbnailSize = useStore((s) => s.filters.thumbnailSize);
  const gridCols = useStore((s) => s.filters.gridCols);

  const positionedTokens = useMemo(
    () => computePositions(tokens, layout, density, useNewest, newestCount, thumbnailSize, gridCols),
    [tokens, layout, density, useNewest, newestCount, thumbnailSize, gridCols]
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
            thumbnailSize={thumbnailSize}
            onSelect={onSelect}
          />
        ))}
    </group>
  );
}
