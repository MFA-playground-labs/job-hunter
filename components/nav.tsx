"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Daily work",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/outreach", label: "Outreach", icon: Send },
    ],
  },
  {
    label: "Library & admin",
    items: [
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/facts", label: "Facts", icon: BookOpenCheck },
      { href: "/resumes", label: "Resumes", icon: FileText },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <section key={group.label} aria-labelledby={`nav-${group.label.replaceAll(" ", "-")}`}>
          <h2
            id={`nav-${group.label.replaceAll(" ", "-")}`}
            className={cn("mb-2 px-2 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase", collapsed && "sr-only")}
          >
            {group.label}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isCurrentPath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "nav-link group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                    <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      title={collapsed ? "CareerOS" : undefined}
      className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50", collapsed && "justify-center px-0")}
    >
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm">
        C
      </span>
      <span className={cn("text-sm font-semibold tracking-[-0.02em]", collapsed && "sr-only")}>CareerOS</span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") return null;

  return (
    <div className="app-nav" data-collapsed={collapsed}>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Brand collapsed={false} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu />
        </Button>
      </header>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-68 flex-col border-r bg-sidebar transition-[width] duration-200 motion-reduce:transition-none lg:flex",
          collapsed && "w-19"
        )}
      >
        <div className="flex items-center justify-between border-b px-3 py-3">
          <Brand collapsed={collapsed} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-11", collapsed && "absolute -right-14 top-3 border bg-background shadow-sm")}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <NavLinks collapsed={collapsed} />
        <div className="border-t p-3">
          <Button
            type="button"
            variant="ghost"
            size="default"
            className={cn("min-h-11 w-full justify-start gap-3 px-3 text-muted-foreground", collapsed && "justify-center px-0")}
            aria-label="Sign out"
            title={collapsed ? "Sign out" : undefined}
            onClick={signOut}
          >
            <LogOut aria-hidden="true" className="size-[18px] shrink-0" />
            <span className={collapsed ? "sr-only" : undefined}>Sign out</span>
          </Button>
        </div>
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent id="mobile-navigation" className="top-0 left-0 flex h-dvh w-[min(19rem,calc(100vw-2.5rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 lg:hidden">
          <DialogTitle className="sr-only">CareerOS navigation</DialogTitle><DialogDescription className="sr-only">Choose a workspace destination.</DialogDescription>
          <div className="border-b px-3 py-3"><Brand collapsed={false}/></div>
          <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)}/>
          <div className="border-t p-3"><Button type="button" variant="ghost" className="min-h-11 w-full justify-start gap-3 px-3 text-muted-foreground" onClick={signOut}><LogOut aria-hidden="true" className="size-[18px]"/>Sign out</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
