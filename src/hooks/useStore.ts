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
  error: string | null;

  evmAddress: string;
  solanaAddress: string;
  walletLoaded: boolean;

  setTokens: (tokens: UnifiedToken[]) => void;
  appendTokens: (tokens: UnifiedToken[]) => void;
  setConnections: (connections: WalletConnection[]) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setSelectedToken: (token: UnifiedToken | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadWallets: (evm: string, solana: string) => void;
  getFilteredTokens: () => UnifiedToken[];
}

export const useStore = create<WalletStore>((set, get) => ({
  tokens: [],
  connections: [],
  filters: {
    chains: [...CHAIN_KEYS],
    standards: ['ERC721', 'ERC1155', 'ERC20'],
    mediaTypes: ['image', 'video', 'audio', 'text', 'html', 'unknown'],
    sortBy: 'chain',
    sortDirection: 'desc',
    searchQuery: '',
  },
  selectedToken: null,
  isLoading: false,
  error: null,

  evmAddress: '',
  solanaAddress: '',
  walletLoaded: false,

  setTokens: (tokens) => set({ tokens }),
  appendTokens: (tokens) => set((s) => ({ tokens: [...s.tokens, ...tokens] })),
  setConnections: (connections) => set({ connections }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setSelectedToken: (token) => set({ selectedToken: token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  loadWallets: (evm, solana) =>
    set({ evmAddress: evm, solanaAddress: solana, walletLoaded: true, tokens: [], connections: [], error: null, selectedToken: null }),

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
