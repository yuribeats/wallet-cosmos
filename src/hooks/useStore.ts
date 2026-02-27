'use client';

import { create } from 'zustand';
import type { UnifiedToken, WalletConnection, FilterState } from '@/lib/types';
import type { ChainKey } from '@/lib/constants';

interface WalletStore {
  tokens: UnifiedToken[];
  connections: WalletConnection[];
  filters: FilterState;
  selectedToken: UnifiedToken | null;
  isLoading: boolean;
  loadProgress: number;
  error: string | null;

  evmAddress: string;
  walletLoaded: boolean;

  activeChain: ChainKey;

  setTokens: (tokens: UnifiedToken[]) => void;
  appendTokens: (tokens: UnifiedToken[]) => void;
  setConnections: (connections: WalletConnection[]) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setSelectedToken: (token: UnifiedToken | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  loadWallet: (evm: string) => void;
  setActiveChain: (chain: ChainKey) => void;
  getFilteredTokens: () => UnifiedToken[];
}

export const useStore = create<WalletStore>((set, get) => ({
  tokens: [],
  connections: [],
  filters: {
    standards: ['ERC1155'],
    layout: 'grid',
    useNewest: true,
    sortDirection: 'desc',
    searchQuery: '',
    density: 0.4,
    newestCount: typeof window !== 'undefined' && window.innerWidth < 768 ? 50 : 100,
    thumbnailSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.21 : 0.1,
    gridCols: typeof window !== 'undefined' && window.innerWidth < 768 ? 5 : 0,
  },
  selectedToken: null,
  isLoading: false,
  loadProgress: 0,
  error: null,

  evmAddress: '',
  walletLoaded: false,

  activeChain: 'base',

  setTokens: (tokens) => set({ tokens }),
  appendTokens: (tokens) => set((s) => ({ tokens: [...s.tokens, ...tokens] })),
  setConnections: (connections) => set({ connections }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setSelectedToken: (token) => set({ selectedToken: token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setError: (error) => set({ error }),
  loadWallet: (evm) =>
    set({ evmAddress: evm, walletLoaded: true, tokens: [], connections: [], error: null, selectedToken: null, loadProgress: 0 }),

  setActiveChain: (chain) =>
    set({
      activeChain: chain,
      tokens: [],
      loadProgress: 0,
      selectedToken: null,
    }),

  getFilteredTokens: () => {
    const { tokens, filters } = get();
    let filtered = tokens;

    filtered = filtered.filter((t) => t.media.thumbnail || t.media.image);
    filtered = filtered.filter((t) => filters.standards.includes(t.standard));

    if (filters.selectedCreator) {
      filtered = filtered.filter((t) => t.creator === filters.selectedCreator);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.collectionName && t.collectionName.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return filtered;
  },
}));
