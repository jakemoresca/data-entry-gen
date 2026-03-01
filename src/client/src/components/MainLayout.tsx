"use client";

import { useState } from "react";
import { NavMenu } from "./NavMenu";
import Link from "next/link";
import { Menu } from "lucide-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        {/* Sidebar - Desktop */}
        <aside className="hidden border-r lg:block">
          <div className="sticky top-0 h-screen">
            <NavMenu />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden"
                aria-label="Toggle navigation"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Link href="/" className="text-lg font-semibold">
                Data Entry Gen
              </Link>
              <div className="ml-auto hidden text-sm text-muted-foreground md:block">
                Admin and Dynamic Table Management
              </div>
            </div>
          </header>

          {/* Mobile Sidebar Overlay */}
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                onClick={() => setIsOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-30 w-72 border-r bg-background lg:hidden">
                <NavMenu />
              </aside>
            </>
          )}

          {/* Page Content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
