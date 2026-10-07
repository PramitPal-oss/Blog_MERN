import { useState, useEffect, useCallback, ReactNode } from "react";
import { apiMessage } from "../api/client";
import { LoadingState, ErrorState, EmptyState } from "./States";
import { Pagination } from "./Pagination";
import type { Meta } from "../types/api";

interface DataGridProps<T> {
  fetcher: (page: number) => Promise<{ data: T[]; meta?: Meta | null }>;
  render: (data: T[], refresh: () => Promise<void>, setData: React.Dispatch<React.SetStateAction<T[]>>) => ReactNode;
  emptyMessage?: string;
  loadingLabel?: string;
  dependencies?: any[];
}

export function DataGrid<T>({ fetcher, render, emptyMessage = "No items found.", loadingLabel = "Loading data…", dependencies = [] }: DataGridProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher(page);
      setData(res.data);
      setMeta(res.meta || null);
      setError("");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ...dependencies]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset page to 1 when dependencies change (other than page itself)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  if (error) return <ErrorState message={error} retry={load} />;
  if (loading) return <LoadingState label={loadingLabel} />;
  if (data.length === 0) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <>
      {render(data, load, setData)}
      <Pagination meta={meta} onPage={setPage} />
    </>
  );
}
