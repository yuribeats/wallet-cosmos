'use client';

import { create } from 'zustand';
import type { UnifiedToken, WalletConnection, FilterState, SenderInfo } from '@/lib/types';
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
  senders: SenderInfo[];

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
  setSenders: (senders: SenderInfo[]) => void;
  getFilteredTokens: () => UnifiedToken[];
}

export const useStore = create<WalletStore>((set, get) => ({
  tokens: [],
  connections: [],
  filters: {
    standards: ['ERC721', 'ERC1155'],
    mediaTypes: ['image', 'video'],
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

  activeChain: 'ethereum',
  senders: [],

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
    set({ evmAddress: evm, walletLoaded: true, tokens: [], connections: [], senders: [], error: null, selectedToken: null, loadProgress: 0, filters: { ...get().filters, selectedSender: undefined } }),

  setActiveChain: (chain) =>
    set((s) => ({
      activeChain: chain,
      tokens: [],
      senders: [],
      loadProgress: 0,
      selectedToken: null,
      filters: { ...s.filters, selectedSender: undefined },
    })),

  setSenders: (senders) => set({ senders }),

  getFilteredTokens: () => {
    const { tokens, filters, senders } = get();
    let filtered = tokens;

    filtered = filtered.filter((t) => filters.standards.includes(t.standard));
    filtered = filtered.filter((t) => filters.mediaTypes.includes(t.media.mediaType));

    if (filters.selectedCreator) {
      filtered = filtered.filter((t) => t.creator === filters.selectedCreator);
    }

    if (filters.selectedSender) {
      const sender = senders.find((s) => s.address === filters.selectedSender);
      if (sender) {
        const contracts = new Set(sender.contractAddresses.map((a) => a.toLowerCase()));
        filtered = filtered.filter((t) => contracts.has(t.contractAddress.toLowerCase()));
      }
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
