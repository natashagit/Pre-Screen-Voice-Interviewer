"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export function DashboardNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15 border border-primary/25">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <span className="text-lg tracking-tight font-serif">
              Prelude
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Campaigns
            </Link>
          </nav>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {userEmail}
              </p>
            </div>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-muted-foreground mt-1"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
