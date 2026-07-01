"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "success"; data: T };

/**
 * Fetch-on-mount helper shared by every screen so loading/error/success line
 * up with the foundation.md §8 common-state contract without re-deriving it
 * per screen. `reload()` re-runs the fetcher (used by ErrorState's "다시 시도").
 *
 * The caller passes `deps` explicitly (e.g. a filter value or route id); the
 * fetcher is intentionally excluded from the dependency list so an inline
 * closure doesn't refetch every render.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
): {
  state: AsyncState<T>;
  reload: () => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { state, reload };
}
