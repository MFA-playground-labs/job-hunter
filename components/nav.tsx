"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
const LINKS = ["Dashboard", "Jobs", "Pipeline", "Companies", "Outreach", "Inbox", "Facts", "Resumes", "Settings"].map((label) => ({ label, href: `/${label.toLowerCase() === "dashboard" ? "dashboard" : label.toLowerCase()}` }));
export function Nav() { const pathname = usePathname(); const router = useRouter(); async function signOut() { await createClient().auth.signOut(); router.push("/login"); router.refresh(); } return <header className="border-b bg-background"><div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-3"><Link href="/dashboard" className="mr-2 shrink-0 text-sm font-semibold">CareerOS</Link><nav className="flex gap-1">{LINKS.map((link) => <Link key={link.href} href={link.href} className={cn("rounded-md px-2 py-1.5 text-sm", pathname.startsWith(link.href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary")}>{link.label}</Link>)}</nav><Button aria-label="Sign out" title="Sign out" variant="ghost" size="icon-sm" className="ml-auto shrink-0" onClick={signOut}><LogOut /></Button></div></header>; }
