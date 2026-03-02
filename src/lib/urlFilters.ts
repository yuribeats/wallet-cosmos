import type { FilterState } from './types';
import type { ChainKey } from './constants';

const PARAM_MAP = {
  standards: 'std',
  mediaTypes: 'mt',
  layout: 'l',
  useNewest: 'n',
  sortDirection: 'sd',
  searchQuery: 'q',
  selectedCreator: 'cr',
  selectedCollection: 'col',
  density: 'd',
  newestCount: 'nc',
  thumbnailSize: 'ts',
  gridCols: 'gc',
  showOwned: 'own',
  showCreated: 'crt',
  selectedWallets: 'sw',
} as const;

export function filtersToParams(
  filters: FilterState,
  wallets: string[],
  chains: ChainKey[]
): string {
  const p = new URLSearchParams();
  p.set('w', wallets.join('|'));
  p.set('c', chains.join('|'));

  p.set(PARAM_MAP.standards, filters.standards.join(','));
  if (filters.mediaTypes.length > 0) p.set(PARAM_MAP.mediaTypes, filters.mediaTypes.join(','));
  p.set(PARAM_MAP.layout, filters.layout);
  p.set(PARAM_MAP.useNewest, filters.useNewest ? '1' : '0');
  p.set(PARAM_MAP.sortDirection, filters.sortDirection);
  if (filters.searchQuery) p.set(PARAM_MAP.searchQuery, filters.searchQuery);
  if (filters.selectedCreator) p.set(PARAM_MAP.selectedCreator, filters.selectedCreator);
  if (filters.selectedCollection) p.set(PARAM_MAP.selectedCollection, filters.selectedCollection);
  p.set(PARAM_MAP.density, String(filters.density));
  p.set(PARAM_MAP.newestCount, String(filters.newestCount));
  p.set(PARAM_MAP.thumbnailSize, String(filters.thumbnailSize));
  if (filters.gridCols) p.set(PARAM_MAP.gridCols, String(filters.gridCols));
  p.set(PARAM_MAP.showOwned, filters.showOwned ? '1' : '0');
  p.set(PARAM_MAP.showCreated, filters.showCreated ? '1' : '0');
  if (filters.selectedWallets.length > 0) p.set(PARAM_MAP.selectedWallets, filters.selectedWallets.join('|'));

  return p.toString();
}

export function paramsToState(search: string): {
  wallets?: string[];
  chains?: ChainKey[];
  filters?: Partial<FilterState>;
} | null {
  const p = new URLSearchParams(search);
  if (!p.has('w')) return null;

  const wRaw = p.get('w') || '';
  const wallets = wRaw.split('|').filter(Boolean);
  if (wallets.length === 0) return null;

  const cRaw = p.get('c') || '';
  const chains = cRaw.split('|').filter(Boolean) as ChainKey[] | undefined;

  const filters: Partial<FilterState> = {};

  const std = p.get(PARAM_MAP.standards);
  if (std) filters.standards = std.split(',').filter(Boolean);

  const mt = p.get(PARAM_MAP.mediaTypes);
  if (mt) filters.mediaTypes = mt.split(',').filter(Boolean);

  const l = p.get(PARAM_MAP.layout);
  if (l) filters.layout = l as FilterState['layout'];

  const n = p.get(PARAM_MAP.useNewest);
  if (n !== null) filters.useNewest = n === '1';

  const sd = p.get(PARAM_MAP.sortDirection);
  if (sd === 'asc' || sd === 'desc') filters.sortDirection = sd;

  const q = p.get(PARAM_MAP.searchQuery);
  if (q) filters.searchQuery = q;

  const cr = p.get(PARAM_MAP.selectedCreator);
  if (cr) filters.selectedCreator = cr;

  const col = p.get(PARAM_MAP.selectedCollection);
  if (col) filters.selectedCollection = col;

  const d = p.get(PARAM_MAP.density);
  if (d) filters.density = Number(d);

  const nc = p.get(PARAM_MAP.newestCount);
  if (nc) filters.newestCount = Number(nc);

  const ts = p.get(PARAM_MAP.thumbnailSize);
  if (ts) filters.thumbnailSize = Number(ts);

  const gc = p.get(PARAM_MAP.gridCols);
  if (gc) filters.gridCols = Number(gc);

  const own = p.get(PARAM_MAP.showOwned);
  if (own !== null) filters.showOwned = own === '1';

  const crt = p.get(PARAM_MAP.showCreated);
  if (crt !== null) filters.showCreated = crt === '1';

  const sw = p.get(PARAM_MAP.selectedWallets);
  if (sw) filters.selectedWallets = sw.split('|').filter(Boolean);

  return { wallets, chains, filters };
}
