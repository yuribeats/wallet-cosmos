'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';
import type { UnifiedToken } from '@/lib/types';

export function useWalletData() {
  const evmAddresses = useStore((s) => s.evmAddresses);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const activeChain = useStore((s) => s.activeChain);
  const useNewest = useStore((s) => s.filters.useNewest);
  const showCreated = useStore((s) => s.filters.showCreated);
  const setTokens = useStore((s) => s.setTokens);
  const setLoading = useStore((s) => s.setLoading);
  const setLoadProgress = useStore((s) => s.setLoadProgress);
  const setError = useStore((s) => s.setError);

  const loadedKey = useRef<string | null>(null);
  const createdLoadedKey = useRef<string | null>(null);
  const ownedTokensRef = useRef<UnifiedToken[]>([]);

  useEffect(() => {
    if (!walletLoaded || evmAddresses.length === 0) return;

    const addressKey = [...evmAddresses].sort().join(',') + ':' + activeChain;
    const needNewest = useNewest;
    const currentKey = addressKey + (needNewest ? ':newest' : ':all');

    const needOwnedFetch = loadedKey.current !== currentKey;
    const needCreatedFetch = showCreated && createdLoadedKey.current !== addressKey;

    if (!needOwnedFetch && !needCreatedFetch) return;

    let cancelled = false;

    async function fetchForWallet(wallet: string, mode: 'owned' | 'created') {
      const params: Record<string, string> = { wallet, chain: activeChain };
      if (mode === 'created') {
        params.mode = 'created';
      } else if (needNewest) {
        params.mode = 'newest';
        params.limit = '200';
      }
      const res = await fetch(`/api/nfts?${new URLSearchParams(params)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      return ((data.tokens || []) as UnifiedToken[]).map((t: UnifiedToken) => ({
        ...t,
        sourceWallet: wallet,
        ...(mode === 'owned' ? { isOwned: true } : {}),
      }));
    }

    async function load() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);

      if (needOwnedFetch) {
        loadedKey.current = null;
        createdLoadedKey.current = null;

        try {
          const results = await Promise.all(
            evmAddresses.map((addr) => fetchForWallet(addr, 'owned'))
          );
          if (cancelled) return;

          const allOwned: UnifiedToken[] = [];
          const seen = new Set<string>();
          for (const tokens of results) {
            for (const t of tokens) {
              if (!seen.has(t.id)) {
                seen.add(t.id);
                allOwned.push(t);
              }
            }
          }

          ownedTokensRef.current = allOwned;
          loadedKey.current = currentKey;

          if (!showCreated) {
            if (!cancelled) { setTokens(allOwned); setLoadProgress(1); }
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tokens');
        }
      }

      if (showCreated && createdLoadedKey.current !== addressKey) {
        try {
          const results = await Promise.all(
            evmAddresses.map((addr) => fetchForWallet(addr, 'created'))
          );
          if (cancelled) return;

          const allCreated: UnifiedToken[] = [];
          for (const tokens of results) {
            allCreated.push(...tokens);
          }

          createdLoadedKey.current = addressKey;

          const seen = new Set<string>();
          const merged: UnifiedToken[] = [];
          for (const t of ownedTokensRef.current) {
            seen.add(t.id);
            const match = allCreated.find((c) => c.id === t.id);
            merged.push(match ? { ...t, createdByWallet: true, creationSource: match.creationSource } : t);
          }
          for (const t of allCreated) {
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
  }, [evmAddresses, walletLoaded, activeChain, useNewest, showCreated, setTokens, setLoading, setLoadProgress, setError]);
}
