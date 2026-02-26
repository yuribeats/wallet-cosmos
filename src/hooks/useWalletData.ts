'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';
import { CHAIN_KEYS } from '@/lib/constants';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const activeChain = useStore((s) => s.activeChain);
  const sortBy = useStore((s) => s.filters.sortBy);
  const setTokens = useStore((s) => s.setTokens);
  const appendTokens = useStore((s) => s.appendTokens);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setLoadProgress = useStore((s) => s.setLoadProgress);
  const setError = useStore((s) => s.setError);

  const allChainsLoaded = useRef(false);
  const singleChainLoaded = useRef<string | null>(null);

  useEffect(() => {
    if (!walletLoaded || !evmAddress) return;

    const needAllChains = sortBy === 'newest';

    if (needAllChains && allChainsLoaded.current) return;
    if (!needAllChains && singleChainLoaded.current === activeChain) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);

      if (needAllChains) {
        allChainsLoaded.current = false;
        singleChainLoaded.current = null;
        let completed = 0;
        let first = true;

        const fetches = CHAIN_KEYS.map((chain) =>
          fetch(`/api/nfts?${new URLSearchParams({ wallet: evmAddress, chain })}`)
            .then(async (res) => {
              if (cancelled) return;
              const data = await res.json();
              if (!res.ok) return;
              const tokens = data.tokens || [];
              if (!cancelled && tokens.length > 0) {
                if (first) {
                  setTokens(tokens);
                  first = false;
                } else {
                  appendTokens(tokens);
                }
              }
            })
            .catch(() => {})
            .finally(() => {
              completed++;
              if (!cancelled) setLoadProgress(completed / CHAIN_KEYS.length);
            })
        );

        await Promise.all(fetches);
        if (!cancelled) allChainsLoaded.current = true;
      } else {
        allChainsLoaded.current = false;
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
  }, [evmAddress, walletLoaded, activeChain, sortBy, setTokens, appendTokens, setConnections, setLoading, setLoadProgress, setError]);
}
