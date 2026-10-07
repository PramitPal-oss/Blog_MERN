import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/UserAvatar";
import { Menu, PenSquare, BookOpen, LayoutDashboard, Shield, User, LogOut } from "lucide-react";
import type { User as UserType } from "@/types/api";

export interface MobileNavigationProps {
  isAuthenticated: boolean;
  user: UserType | null;
  onLogout: () => Promise<void>;
}

export function MobileNavigation({
  isAuthenticated,
  user,
  onLogout,
}: MobileNavigationProps) {
  const [open, setOpen] = React.useState(false);

  const handleLinkClick = () => {
    setOpen(false);
  };

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col p-6">
        <SheetHeader className="text-left pb-4 border-b">
          <SheetTitle className="text-xl font-bold tracking-tight">Inkstone</SheetTitle>
          <p className="text-xs text-muted-foreground">Stories worth keeping</p>
        </SheetHeader>

        {isAuthenticated && user && (
          <div className="flex items-center gap-3 py-4 border-b">
            <UserAvatar name={user.name} size="md" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email ?? "No email"}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 py-4 flex-1">
          <NavLink
            to="/"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`
            }
          >
            <BookOpen className="h-4 w-4" />
            Stories
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`
                }
              >
                <LayoutDashboard className="h-4 w-4" />
                My posts
              </NavLink>

              <NavLink
                to="/posts/new"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`
                }
              >
                <PenSquare className="h-4 w-4" />
                Write
              </NavLink>

              <NavLink
                to="/account"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`
                }
              >
                <User className="h-4 w-4" />
                Account
              </NavLink>

              {user?.role === "ADMIN" && (
                <NavLink
                  to="/admin"
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`
                  }
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              )}
            </>
          ) : (
            <>
              <Separator className="my-2" />
              <NavLink
                to="/login"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              >
                Log in
              </NavLink>
              <NavLink
                to="/register"
                onClick={handleLinkClick}
                className="flex items-center justify-center gap-2 mt-2 px-3 py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Join Inkstone
              </NavLink>
            </>
          )}
        </div>

        {isAuthenticated && (
          <div className="pt-4 border-t mt-auto">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
