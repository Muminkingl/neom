"use client";

import type { CSSProperties, ReactNode } from "react";
import { DashboardSidebar } from "@/components/watermelon/library-dashboard/components/library/sidebar";
import { DashboardTopbar } from "@/components/watermelon/library-dashboard/components/library/topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/watermelon/library-dashboard/components/library/theme-provider";
import ProtectedRoute from "../components/ProtectedRoute";
import "@/components/watermelon/library-dashboard/dashboard.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider
            defaultOpen={true}
            className="library-dashboard h-svh overflow-hidden font-['Vazirmatn',system-ui,sans-serif]"
            style={
              {
                "--sidebar-width": "18.125rem",
                "--sidebar-width-icon": "5rem",
              } as CSSProperties
            }
          >
            <DashboardSidebar />
            <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 flex flex-col min-h-screen">
              <DashboardTopbar />
              <div className="flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8 max-md:mb-16">
                {children}
              </div>
              {/* Subtle Footer */}
              <footer className="border-t border-slate-200/80 dark:border-slate-800 py-3 px-6 text-center text-xs text-slate-400">
                <span>Neom Dental Clinic System • Developed by </span>
                <a
                  href="https://www.trxstudio.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#008294] font-semibold hover:underline"
                >
                  Trx Studio
                </a>
              </footer>
            </main>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
}