'use client';

import { useEffect } from 'react';
import { useStore } from './useStore';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const activeChain = useStore((s) => s.activeChain);
  const setTokens = useStore((s) => s.setTokens);
  const setSenders = useStore((s) => s.setSenders);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setLoadProgress = useStore((s) => s.setLoadProgress);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    if (!walletLoaded || !evmAddress) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);

      try {
        const res = await fetch(`/api/nfts?${new URLSearchParams({ wallet: evmAddress, chain: activeChain })}`);
        if (cancelled) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to fetch ${activeChain}`);
        if (!cancelled) {
          setTokens(data.tokens || []);
          setLoadProgress(1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tokens');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      fetch(`/api/senders?${new URLSearchParams({ wallet: evmAddress, chain: activeChain })}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.senders) setSenders(d.senders);
        })
        .catch(() => {});

      fetch(`/api/transfers?${new URLSearchParams({ wallet: evmAddress })}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.connections) setConnections(d.connections);
        })
        .catch(() => {});
    }

    load();
    return () => { cancelled = true; };
  }, [evmAddress, walletLoaded, activeChain, setTokens, setSenders, setConnections, setLoading, setLoadProgress, setError]);
}
