import type { Meta } from "../types/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  meta,
  onPage,
}: {
  meta: Meta | null;
  onPage: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-center gap-4 my-8"
      aria-label="Pagination"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}
        className="gap-1 cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </Button>

      <span className="text-sm font-medium text-muted-foreground">
        Page {meta.page} of {meta.totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPage(meta.page + 1)}
        className="gap-1 cursor-pointer"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
