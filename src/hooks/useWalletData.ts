'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';
import { CHAIN_KEYS } from '@/lib/constants';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const activeChain = useStore((s) => s.activeChain);
  const useNewest = useStore((s) => s.filters.useNewest);
  const setTokens = useStore((s) => s.setTokens);
  const appendTokens = useStore((s) => s.appendTokens);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setLoadProgress = useStore((s) => s.setLoadProgress);
  const setError = useStore((s) => s.setError);

  const newestLoaded = useRef<string | null>(null);
  const singleChainLoaded = useRef<string | null>(null);

  useEffect(() => {
    if (!walletLoaded || !evmAddress) return;

    const needNewest = useNewest;

    if (needNewest && newestLoaded.current === activeChain) return;
    if (!needNewest && singleChainLoaded.current === activeChain) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);

      if (needNewest) {
        newestLoaded.current = null;
        singleChainLoaded.current = null;

        try {
          const res = await fetch(`/api/nfts?${new URLSearchParams({ wallet: evmAddress, mode: 'newest', chain: activeChain, limit: '200' })}`);
          if (cancelled) return;
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch newest');
          if (!cancelled) {
            setTokens(data.tokens || []);
            setLoadProgress(1);
            newestLoaded.current = activeChain;
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to load newest tokens');
          }
        }
      } else {
        newestLoaded.current = null;
        try {
          const res = await fetch(`/api/nfts?${new URLSearchParams({ wallet: evmAddress, chain: activeChain })}`);
          if (cancelled) return;
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Failed to fetch ${activeChain}`);
          if (!cancelled) {
            setTokens(data.tokens || []);
            setLoadProgress(1);
            singleChainLoaded.current = activeChain;
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to load tokens');
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
        setLoadProgress(1);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [evmAddress, walletLoaded, activeChain, useNewest, setTokens, appendTokens, setConnections, setLoading, setLoadProgress, setError]);
}
