'use client';

import { useEffect } from 'react';
import { useStore } from './useStore';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const setTokens = useStore((s) => s.setTokens);
  const setConnections = useStore((s) => s.setConnections);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    if (!walletLoaded || !evmAddress) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ wallet: evmAddress });
        const res = await fetch(`/api/nfts?${params}`);
        if (cancelled) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch NFTs');
        if (!cancelled) setTokens(data.tokens || []);

        fetch(`/api/transfers?${new URLSearchParams({ wallet: evmAddress })}`)
          .then((r) => r.json())
          .then((d) => {
            if (!cancelled && d.connections) setConnections(d.connections);
          })
          .catch(() => {});
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [evmAddress, walletLoaded, setTokens, setConnections, setLoading, setError]);
}
