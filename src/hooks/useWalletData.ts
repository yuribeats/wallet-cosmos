'use client';

import { useEffect } from 'react';
import { useStore } from './useStore';
import { CHAIN_KEYS } from '@/lib/constants';

export function useWalletData() {
  const evmAddress = useStore((s) => s.evmAddress);
  const walletLoaded = useStore((s) => s.walletLoaded);
  const setTokens = useStore((s) => s.setTokens);
  const appendTokens = useStore((s) => s.appendTokens);
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

      let completed = 0;
      let first = true;

      const fetches = CHAIN_KEYS.map((chain) =>
        fetch(`/api/nfts?${new URLSearchParams({ wallet: evmAddress, chain })}`)
          .then(async (res) => {
            if (cancelled) return;
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to fetch ${chain}`);
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

      if (!cancelled) {
        setLoading(false);
        setLoadProgress(1);
      }

      fetch(`/api/transfers?${new URLSearchParams({ wallet: evmAddress })}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.connections) setConnections(d.connections);
        })
        .catch(() => {});
    }

    load();
    return () => { cancelled = true; };
  }, [evmAddress, walletLoaded, setTokens, appendTokens, setConnections, setLoading, setLoadProgress, setError]);
}
