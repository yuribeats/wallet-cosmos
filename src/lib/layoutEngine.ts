import type { UnifiedToken, FilterState } from './types';
import { CHAIN_KEYS, type ChainKey } from './constants';

const BASE_SPREAD = 15;

function sphericalToCartesian(
  radius: number,
  theta: number,
  phi: number
): [number, number, number] {
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function goldenSpiralPositions(count: number, radius: number, offset: [number, number, number] = [0, 0, 0]): [number, number, number][] {
  const positions: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    const theta = goldenAngle * i;
    const phi = Math.acos(1 - 2 * t);
    const [x, y, z] = sphericalToCartesian(radius, theta, phi);
    positions.push([x + offset[0], y + offset[1], z + offset[2]]);
  }

  return positions;
}

function gridPositions(count: number, spacing: number): [number, number, number][] {
  const cols = Math.ceil(Math.sqrt(count));
  const positions: [number, number, number][] = [];
  const totalW = (cols - 1) * spacing;
  const totalH = (Math.ceil(count / cols) - 1) * spacing;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push([
      col * spacing - totalW / 2,
      -(row * spacing - totalH / 2),
      0,
    ]);
  }

  return positions;
}

const CHAIN_OFFSETS: Record<ChainKey, [number, number, number]> = {
  ethereum: [-BASE_SPREAD * 0.6, BASE_SPREAD * 0.4, 0],
  base: [BASE_SPREAD * 0.6, BASE_SPREAD * 0.4, 0],
  optimism: [-BASE_SPREAD * 0.6, -BASE_SPREAD * 0.4, 0],
  zora: [BASE_SPREAD * 0.6, -BASE_SPREAD * 0.4, 0],
};

export function computePositions(
  tokens: UnifiedToken[],
  sortBy: FilterState['sortBy'],
  density: number = 1.0
): UnifiedToken[] {
  if (tokens.length === 0) return [];

  switch (sortBy) {
    case 'newest':
      return layoutNewest(tokens, density);
    case 'chain':
      return layoutByChain(tokens, density);
    case 'creator':
      return layoutByCreator(tokens, density);
    case 'mediaType':
      return layoutByMediaType(tokens, density);
    case 'date':
      return layoutByDate(tokens, density);
    case 'tokenType':
      return layoutByTokenType(tokens, density);
    case 'grid':
      return layoutGrid(tokens, density);
    default:
      return layoutNewest(tokens, density);
  }
}

function applyDensity(positions: [number, number, number][], density: number): [number, number, number][] {
  const scale = 0.3 + density * 1.7;
  return positions.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
}

function layoutNewest(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const sorted = [...tokens].sort((a, b) => {
    const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
    const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
    return db - da;
  });

  const newest = sorted.slice(0, 100);
  const radius = Math.max(3, Math.cbrt(newest.length) * 1.8) * (0.5 + density * 0.5);
  const positions = goldenSpiralPositions(newest.length, radius);
  return newest.map((t, i) => ({ ...t, position: positions[i] }));
}

function layoutGrid(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const spacing = 0.6 + density * 2.4;
  const positions = gridPositions(tokens.length, spacing);
  return tokens.map((t, i) => ({ ...t, position: positions[i] }));
}

function layoutByChain(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const grouped = new Map<string, UnifiedToken[]>();
  for (const chain of CHAIN_KEYS) grouped.set(chain, []);
  for (const t of tokens) {
    const list = grouped.get(t.chain) || [];
    list.push(t);
    grouped.set(t.chain, list);
  }

  const spreadScale = 0.3 + density * 1.7;
  const result: UnifiedToken[] = [];
  for (const chain of CHAIN_KEYS) {
    const group = grouped.get(chain) || [];
    if (group.length === 0) continue;
    const radius = Math.max(2, Math.cbrt(group.length) * 1.8) * (0.5 + density * 0.5);
    const offset: [number, number, number] = [
      CHAIN_OFFSETS[chain][0] * spreadScale,
      CHAIN_OFFSETS[chain][1] * spreadScale,
      CHAIN_OFFSETS[chain][2] * spreadScale,
    ];
    const positions = goldenSpiralPositions(group.length, radius, offset);
    for (let i = 0; i < group.length; i++) {
      result.push({ ...group[i], position: positions[i] });
    }
  }

  return result;
}

function layoutByCreator(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const grouped = new Map<string, UnifiedToken[]>();
  for (const t of tokens) {
    const key = t.creator || 'unknown';
    const list = grouped.get(key) || [];
    list.push(t);
    grouped.set(key, list);
  }

  const result: UnifiedToken[] = [];
  const creators = Array.from(grouped.keys());
  const cols = Math.ceil(Math.sqrt(creators.length));
  const gap = 4 + density * 8;

  creators.forEach((creator, idx) => {
    const group = grouped.get(creator)!;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const offsetX = (col - cols / 2) * gap;
    const offsetZ = (row - cols / 2) * gap;
    const ySpacing = 0.8 + density * 2.4;

    for (let i = 0; i < group.length; i++) {
      const y = i * ySpacing - (group.length * ySpacing) / 2;
      result.push({ ...group[i], position: [offsetX, y, offsetZ] });
    }
  });

  return result;
}

function layoutByMediaType(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const bands: Record<string, number> = { image: 0, video: 1, audio: 2, text: 3, html: 4, unknown: 5 };
  const grouped = new Map<string, UnifiedToken[]>();

  for (const t of tokens) {
    const key = t.media.mediaType;
    const list = grouped.get(key) || [];
    list.push(t);
    grouped.set(key, list);
  }

  const bandGap = 3 + density * 6;
  const result: UnifiedToken[] = [];
  for (const [type, group] of grouped) {
    const bandY = (bands[type] ?? 5) * -bandGap + bandGap * 2.5;
    const radius = Math.max(2, Math.cbrt(group.length) * 1.8) * (0.5 + density * 0.5);
    const positions = goldenSpiralPositions(group.length, radius, [0, bandY, 0]);
    for (let i = 0; i < group.length; i++) {
      result.push({ ...group[i], position: positions[i] });
    }
  }

  return result;
}

function layoutByDate(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const sorted = [...tokens].sort((a, b) => {
    const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
    const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
    return db - da;
  });

  const rStep = 0.05 + density * 0.2;
  const zStep = 0.3 + density * 1.0;

  return sorted.map((t, i) => {
    const angle = (i / sorted.length) * Math.PI * 6;
    const radius = 3 + i * rStep;
    const z = -i * zStep;
    return {
      ...t,
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius, z] as [number, number, number],
    };
  });
}

function layoutByTokenType(tokens: UnifiedToken[], density: number): UnifiedToken[] {
  const spreadScale = 0.3 + density * 1.7;
  const typeOffsets: Record<string, [number, number, number]> = {
    ERC721: [-BASE_SPREAD * 0.7 * spreadScale, 0, 0],
    ERC1155: [BASE_SPREAD * 0.7 * spreadScale, 0, 0],
  };

  const grouped = new Map<string, UnifiedToken[]>();
  for (const t of tokens) {
    const list = grouped.get(t.standard) || [];
    list.push(t);
    grouped.set(t.standard, list);
  }

  const result: UnifiedToken[] = [];
  for (const [standard, group] of grouped) {
    const offset = typeOffsets[standard] || [0, 0, 0];
    const radius = Math.max(2, Math.cbrt(group.length) * 1.8) * (0.5 + density * 0.5);
    const positions = goldenSpiralPositions(group.length, radius, offset);
    for (let i = 0; i < group.length; i++) {
      result.push({ ...group[i], position: positions[i] });
    }
  }

  return result;
}
