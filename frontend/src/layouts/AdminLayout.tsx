import * as React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const adminNavItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users, end: false },
  { to: "/admin/posts", label: "Posts", icon: FileText, end: false },
  { to: "/admin/comments", label: "Comments", icon: MessageSquare, end: false },
];

export function AdminLayout() {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Mobile/Tablet Admin Nav Bar */}
      <div className="w-full lg:hidden flex items-center justify-between p-3 rounded-lg border border-border bg-card">
        <span className="text-sm font-semibold text-foreground">Admin Portal</span>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Admin menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader className="text-left pb-4 border-b">
              <SheetTitle>Admin Navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 py-4" aria-label="Admin Mobile Navigation">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSheetOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar (224px / w-56) */}
      <aside className="hidden lg:block w-56 shrink-0 space-y-1">
        <div className="px-3 py-2 mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin Management
          </h2>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Admin Navigation">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Admin Section Content */}
      <section className="flex-1 w-full min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
