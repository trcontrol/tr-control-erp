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
    <div className="bg-app-shell flex min-h-screen overflow-x-clip">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <Header
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
        />
        {banner}
        <main className="min-w-0 flex-1 overflow-x-clip overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 md:px-8 md:py-7 lg:px-10">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
