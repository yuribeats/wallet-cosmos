'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';
import { CHAIN_KEYS } from '@/lib/constants';
import type { UnifiedToken } from '@/lib/types';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const activeChain = useStore((s) => s.activeChain);
  const useNewest = useStore((s) => s.filters.useNewest);
  const showCreated = useStore((s) => s.filters.showCreated);
  const setTokens = useStore((s) => s.setTokens);
  const appendTokens = useStore((s) => s.appendTokens);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setLoadProgress = useStore((s) => s.setLoadProgress);
  const setError = useStore((s) => s.setError);

  const newestLoaded = useRef<string | null>(null);
  const singleChainLoaded = useRef<string | null>(null);
  const createdLoaded = useRef<string | null>(null);
  const ownedTokensRef = useRef<UnifiedToken[]>([]);

  useEffect(() => {
    if (!walletLoaded || !evmAddress) return;

    const needNewest = useNewest;

    if (needNewest && newestLoaded.current === activeChain && !showCreated) return;
    if (!needNewest && singleChainLoaded.current === activeChain && !showCreated) return;
    if (needNewest && newestLoaded.current === activeChain && showCreated && createdLoaded.current === activeChain) return;
    if (!needNewest && singleChainLoaded.current === activeChain && showCreated && createdLoaded.current === activeChain) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);

      const needOwnedFetch = needNewest
        ? newestLoaded.current !== activeChain
        : singleChainLoaded.current !== activeChain;

      if (needOwnedFetch) {
        newestLoaded.current = null;
        singleChainLoaded.current = null;
        createdLoaded.current = null;

        try {
          const params: Record<string, string> = { wallet: evmAddress, chain: activeChain };
          if (needNewest) { params.mode = 'newest'; params.limit = '200'; }
          const res = await fetch(`/api/nfts?${new URLSearchParams(params)}`);
          if (cancelled) return;
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch');
          const owned = ((data.tokens || []) as UnifiedToken[]).map((t: UnifiedToken) => ({ ...t, isOwned: true }));
          ownedTokensRef.current = owned;
          if (needNewest) newestLoaded.current = activeChain;
          else singleChainLoaded.current = activeChain;

          if (!showCreated) {
            if (!cancelled) { setTokens(owned); setLoadProgress(1); }
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tokens');
        }
      }

      if (showCreated && createdLoaded.current !== activeChain) {
        try {
          const res = await fetch(`/api/nfts?${new URLSearchParams({ wallet: evmAddress, mode: 'created', chain: activeChain })}`);
          if (cancelled) return;
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch created');
          const created = (data.tokens || []) as UnifiedToken[];
          createdLoaded.current = activeChain;

          const seen = new Set<string>();
          const merged: UnifiedToken[] = [];
          for (const t of ownedTokensRef.current) {
            seen.add(t.id);
            const match = created.find((c) => c.id === t.id);
            merged.push(match ? { ...t, createdByWallet: true, creationSource: match.creationSource } : t);
          }
          for (const t of created) {
            if (!seen.has(t.id)) merged.push(t);
          }

          if (!cancelled) { setTokens(merged); setLoadProgress(1); }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load created tokens');
          if (!cancelled && ownedTokensRef.current.length > 0) setTokens(ownedTokensRef.current);
        }
      } else if (!showCreated && !needOwnedFetch) {
        if (!cancelled) setTokens(ownedTokensRef.current);
      }

      if (!cancelled) {
        setLoading(false);
        setLoadProgress(1);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [evmAddress, walletLoaded, activeChain, useNewest, showCreated, setTokens, appendTokens, setConnections, setLoading, setLoadProgress, setError]);
}
