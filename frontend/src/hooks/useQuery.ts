import { useState, useEffect, useCallback, ReactNode } from "react";
import { apiMessage } from "../api/client";

export function useQuery<T>(fetcher: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setData(res);
      setError("");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
