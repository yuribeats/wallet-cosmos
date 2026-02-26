'use client';

import { create } from 'zustand';
import type { UnifiedToken, WalletConnection, FilterState } from '@/lib/types';
import { CHAIN_KEYS } from '@/lib/constants';

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

  setTokens: (tokens: UnifiedToken[]) => void;
  appendTokens: (tokens: UnifiedToken[]) => void;
  setConnections: (connections: WalletConnection[]) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setSelectedToken: (token: UnifiedToken | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  loadWallet: (evm: string) => void;
  getFilteredTokens: () => UnifiedToken[];
}

export const useStore = create<WalletStore>((set, get) => ({
  tokens: [],
  connections: [],
  filters: {
    chains: [...CHAIN_KEYS],
    standards: ['ERC721', 'ERC1155'],
    mediaTypes: ['image', 'video', 'audio', 'text', 'html', 'unknown'],
    sortBy: 'chain',
    sortDirection: 'desc',
    searchQuery: '',
    density: 1.0,
  },
  selectedToken: null,
  isLoading: false,
  loadProgress: 0,
  error: null,

  evmAddress: '',
  walletLoaded: false,

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

  getFilteredTokens: () => {
    const { tokens, filters } = get();
    let filtered = tokens;

    filtered = filtered.filter((t) => filters.chains.includes(t.chain));
    filtered = filtered.filter((t) => filters.standards.includes(t.standard));
    filtered = filtered.filter((t) => filters.mediaTypes.includes(t.media.mediaType));

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
