import React from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[180px] gap-3 text-muted-foreground"
      role="status"
    >
      <Loader2 className="h-6 w-6 animate-spin text-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  icon: Icon = Inbox,
  action,
  children = "Nothing to show yet.",
}: {
  title?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[220px] p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      {title && <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>}
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{children}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <AlertTitle className="text-sm font-semibold">Error</AlertTitle>
          <AlertDescription className="text-sm">{message}</AlertDescription>
        </div>
        {retry && (
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="self-start sm:self-center shrink-0 border-destructive/30 hover:bg-destructive/10 text-destructive text-xs h-8"
          >
            Try again
          </Button>
        )}
      </div>
    </Alert>
  );
}
