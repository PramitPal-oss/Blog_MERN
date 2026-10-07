import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiMessage } from "../api/client";
import { authApi } from "../api";
import { LoadingState } from "../components/States";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .refine((v) => new TextEncoder().encode(v).length <= 72, "Password is too long"),
});

type Login = z.infer<typeof loginSchema>;
type Register = z.infer<typeof registerSchema>;

import { SocialAuthButtons } from "../components/auth/SocialAuthButtons";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const [error, setError] = useState(
    search.get("oauthError") ? `Social login failed: ${search.get("oauthError")}` : ""
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Login>({ resolver: zodResolver(loginSchema) });

  if (auth.status === "authenticated") return <Navigate to="/dashboard" replace />;

  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      await auth.login(values);
      const from = (location.state as any)?.from;
      navigate(
        typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
          ? from
          : "/dashboard",
        { replace: true }
      );
    } catch (e) {
      setError(apiMessage(e));
    }
  });

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-220px)] py-6 px-4">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Log in to Inkstone
          </CardTitle>
          <CardDescription>
            Enter your credentials below to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="login-email-error" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="login-password-error" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <SocialAuthButtons />
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Register>({ resolver: zodResolver(registerSchema) });

  if (auth.status === "authenticated") return <Navigate to="/dashboard" replace />;

  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      await auth.register(values);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(apiMessage(e));
    }
  });

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-220px)] py-6 px-4">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription>
            Join Inkstone to read, write, and discuss stories
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Full Name</Label>
              <Input
                id="reg-name"
                autoComplete="name"
                placeholder="Jane Doe"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "reg-name-error" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p id="reg-name-error" className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "reg-email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="reg-email-error" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 10 characters"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "reg-password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="reg-password-error" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <SocialAuthButtons />
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export function OAuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void auth
      .refreshSession()
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => navigate("/login?oauthError=OAUTH_FAILED", { replace: true }));
  }, [auth, navigate]);

  return <LoadingState label="Completing social login…" />;
}
