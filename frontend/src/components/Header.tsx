import * as React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { MobileNavigation } from "./MobileNavigation";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, User, LogOut, PenSquare, LayoutDashboard, Loader2 } from "lucide-react";

export function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = React.useState<string | null>(null);

  const signOut = async () => {
    setLogoutError(null);
    try {
      await auth.logout();
      navigate("/");
    } catch {
      setLogoutError("Failed to log out. Please try again.");
    }
  };

  const isAuthenticated = auth.status === "authenticated";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <NavLink to="/" className="flex flex-col group">
            <span className="font-bold text-xl tracking-tight text-foreground group-hover:opacity-90">
              BlogSphere
            </span>
            <span className="text-[11px] text-muted-foreground tracking-normal -mt-0.5">
              stories worth keeping
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-foreground ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                }`
              }
            >
              Stories
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors hover:text-foreground ${
                      isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`
                  }
                >
                  My posts
                </NavLink>

                <NavLink
                  to="/posts/new"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors hover:text-foreground ${
                      isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`
                  }
                >
                  Write
                </NavLink>

                <div className="flex items-center gap-3 pl-2 border-l border-border">
                  <NotificationBell />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                        aria-label="User account menu"
                      >
                        <UserAvatar name={auth.user?.name} size="sm" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold leading-none">{auth.user?.name}</p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {auth.user?.email ?? "No email"}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Account</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>My posts</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/posts/new" className="cursor-pointer">
                          <PenSquare className="mr-2 h-4 w-4" />
                          <span>Write story</span>
                        </Link>
                      </DropdownMenuItem>
                      {auth.user?.role === "ADMIN" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer">
                              <Shield className="mr-2 h-4 w-4" />
                              <span>Admin panel</span>
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={signOut}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : auth.status === "initializing" ? (
              <div className="flex items-center justify-center w-[120px]">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center gap-3 pl-2">
                <Button variant="ghost" size="sm" asChild>
                  <NavLink to="/login">Log in</NavLink>
                </Button>
                <Button size="sm" asChild>
                  <NavLink to="/register">Join</NavLink>
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Right Bar */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <NotificationBell />}
            <MobileNavigation
              isAuthenticated={isAuthenticated}
              user={auth.user}
              onLogout={signOut}
            />
          </div>
        </div>
      </header>

      {logoutError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="flex items-center justify-between text-sm">
              <span>{logoutError}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setLogoutError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
