"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavMenu() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-lg font-bold">Data Entry Gen</h1>
        <p className="text-sm text-muted-foreground">Operations Console</p>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        <Link
          href="/"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            isActive("/") && "bg-accent text-accent-foreground"
          )}
        >
          Home
        </Link>
        <Link
          href="/admin"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            isActive("/admin") && "bg-accent text-accent-foreground"
          )}
        >
          Admin Panel
        </Link>
        <Link
          href="/tables"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            isActive("/tables") && "bg-accent text-accent-foreground"
          )}
        >
          Registered Tables
        </Link>
        <Link
          href="/layouts"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            isActive("/layouts") && "bg-accent text-accent-foreground"
          )}
        >
          Manage Layouts
        </Link>
      </nav>
    </div>
  );
}
