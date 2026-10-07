import { useEffect, useState } from "react";
import { authApi } from "../../api";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type ProviderState = "loading" | "ready" | "error";

export function useOAuthProviders() {
  const [providers, setProviders] = useState({ google: false, facebook: false });
  const [status, setStatus] = useState<ProviderState>("loading");

  const load = async () => {
    setStatus("loading");
    try {
      const r = await authApi.providers();
      setProviders(r.data.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return { providers, status, load };
}

export function SocialAuthButtons() {
  const { providers, status, load } = useOAuthProviders();
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

  if (status === "loading") {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive" className="py-2.5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-row items-center justify-between text-sm ml-2">
          <span>Failed to load providers</span>
          <Button variant="outline" size="sm" onClick={load} className="h-7 px-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        disabled={!providers.google}
        onClick={() => {
          window.location.href = `${base}/auth/google`;
        }}
      >
        Continue with Google {!providers.google && "(unavailable)"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        disabled={!providers.facebook}
        onClick={() => {
          window.location.href = `${base}/auth/facebook`;
        }}
      >
        Continue with Facebook {!providers.facebook && "(unavailable)"}
      </Button>
    </div>
  );
}
