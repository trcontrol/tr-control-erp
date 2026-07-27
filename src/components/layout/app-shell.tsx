"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

type AppShellProps = {
  userEmail?: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ userEmail, banner, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-app-shell flex min-h-screen">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
        />
        {banner}
        <main className="flex-1 overflow-auto px-4 py-7 sm:px-6 md:px-8 md:py-9 lg:px-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
