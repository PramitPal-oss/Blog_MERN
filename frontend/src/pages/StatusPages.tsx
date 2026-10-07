import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldAlert, FileQuestion } from "lucide-react";

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 max-w-md mx-auto space-y-4">
      <div className="p-3 rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <Badge variant="destructive" className="font-semibold text-xs">
        403 Forbidden
      </Badge>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Access Restricted
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Your account does not have sufficient permissions to access this administrative or protected area.
      </p>

      <div className="pt-2">
        <Button asChild className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to stories
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 max-w-md mx-auto space-y-4">
      <div className="p-3 rounded-full bg-secondary text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
      </div>

      <Badge variant="secondary" className="font-semibold text-xs">
        404 Not Found
      </Badge>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Page Not Found
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed">
        The link may be outdated, the post may have been removed, or the URL might have a typo.
      </p>

      <div className="pt-2">
        <Button asChild className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to stories
          </Link>
        </Button>
      </div>
    </div>
  );
}
