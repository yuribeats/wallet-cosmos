import type { UnifiedToken, FilterState } from './types';
import { CHAIN_KEYS, type ChainKey } from './constants';

const SPREAD = 20;

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

// Chain quadrant offsets for constellation layout
const CHAIN_OFFSETS: Record<ChainKey, [number, number, number]> = {
  ethereum: [-SPREAD * 0.6, SPREAD * 0.4, 0],
  base: [SPREAD * 0.6, SPREAD * 0.4, 0],
  optimism: [-SPREAD * 0.6, -SPREAD * 0.4, 0],
  zora: [SPREAD * 0.6, -SPREAD * 0.4, 0],
};

export function computePositions(
  tokens: UnifiedToken[],
  sortBy: FilterState['sortBy']
): UnifiedToken[] {
  if (tokens.length === 0) return [];

  switch (sortBy) {
    case 'chain':
      return layoutByChain(tokens);
    case 'creator':
      return layoutByCreator(tokens);
    case 'mediaType':
      return layoutByMediaType(tokens);
    case 'date':
      return layoutByDate(tokens);
    case 'tokenType':
      return layoutByTokenType(tokens);
    default:
      return layoutByChain(tokens);
  }
}

function layoutByChain(tokens: UnifiedToken[]): UnifiedToken[] {
  const grouped = new Map<string, UnifiedToken[]>();
  for (const chain of CHAIN_KEYS) grouped.set(chain, []);
  for (const t of tokens) {
    const list = grouped.get(t.chain) || [];
    list.push(t);
    grouped.set(t.chain, list);
  }

  const result: UnifiedToken[] = [];
  for (const chain of CHAIN_KEYS) {
    const group = grouped.get(chain) || [];
    const radius = Math.max(3, Math.cbrt(group.length) * 2.5);
    const positions = goldenSpiralPositions(group.length, radius, CHAIN_OFFSETS[chain]);
    for (let i = 0; i < group.length; i++) {
      result.push({ ...group[i], position: positions[i] });
    }
  }

  return result;
}

function layoutByCreator(tokens: UnifiedToken[]): UnifiedToken[] {
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

  creators.forEach((creator, idx) => {
    const group = grouped.get(creator)!;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const offsetX = (col - cols / 2) * 8;
    const offsetZ = (row - cols / 2) * 8;

    for (let i = 0; i < group.length; i++) {
      const y = i * 2 - (group.length * 2) / 2;
      result.push({ ...group[i], position: [offsetX, y, offsetZ] });
    }
  });

  return result;
}

function layoutByMediaType(tokens: UnifiedToken[]): UnifiedToken[] {
  const bands: Record<string, number> = { image: 0, video: 1, audio: 2, text: 3, html: 4, unknown: 5 };
  const grouped = new Map<string, UnifiedToken[]>();

  for (const t of tokens) {
    const key = t.media.mediaType;
    const list = grouped.get(key) || [];
    list.push(t);
    grouped.set(key, list);
  }

  const result: UnifiedToken[] = [];
  for (const [type, group] of grouped) {
    const bandY = (bands[type] ?? 5) * -6 + 12;
    const radius = Math.max(3, Math.cbrt(group.length) * 2.5);
    const positions = goldenSpiralPositions(group.length, radius, [0, bandY, 0]);
    for (let i = 0; i < group.length; i++) {
      result.push({ ...group[i], position: positions[i] });
    }
  }

  return result;
}

function layoutByDate(tokens: UnifiedToken[]): UnifiedToken[] {
  const sorted = [...tokens].sort((a, b) => {
    const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
    const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
    return db - da;
  });

  return sorted.map((t, i) => {
    const angle = (i / sorted.length) * Math.PI * 6;
    const radius = 3 + i * 0.15;
    const z = -i * 0.8;
    return {
      ...t,
      position: [Math.cos(angle) * radius, Math.sin(angle) * radius, z] as [number, number, number],
    };
  });
}

function layoutByTokenType(tokens: UnifiedToken[]): UnifiedToken[] {
  const typeOffsets: Record<string, [number, number, number]> = {
    ERC721: [-SPREAD * 0.7, 0, 0],
    ERC1155: [SPREAD * 0.7, 0, 0],
    ERC20: [0, -SPREAD * 0.5, SPREAD * 0.3],
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
    const radius = Math.max(3, Math.cbrt(group.length) * 2.5);
    const positions = goldenSpiralPositions(group.length, radius, offset);
    for (let i = 0; i < group.length; i++) {
      result.push({ ...group[i], position: positions[i] });
    }
  }

  return result;
}
