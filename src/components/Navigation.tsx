"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, CheckSquare, Settings, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Today", href: "/", icon: LayoutDashboard },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Focus", href: "/focus", icon: Timer },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full flex-col px-3 py-5 border-r border-zinc-800/60 bg-zinc-950">
        <Link href="/" className="mb-7 flex items-center px-3">
          <span className="text-[15px] font-semibold tracking-[0.08em] text-zinc-100 select-none">
            dailyflow
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5 flex-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-zinc-100" : "text-zinc-500")} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/60 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-14 px-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-medium transition-colors duration-150",
                  isActive
                    ? "text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-zinc-100" : "text-zinc-600")} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

