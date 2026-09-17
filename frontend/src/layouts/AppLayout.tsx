import React, { useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { X } from "lucide-react";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("document");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base-950 font-sans">
      {/* Desktop collapsible sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-base-900 shadow-2xl animate-slide-in-right">
            <div className="absolute right-3 top-4 z-10">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-base-800 hover:text-ink-100 transition-colors focus-ring"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => {}}
              onNavigate={() => setMobileDrawerOpen(false)}
              isMobile
            />
          </div>
        </div>
      )}

      {/* Main Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          activeDocName={documentId ? `Document #${documentId.slice(0, 6)}` : null}
        />
        <main className="min-w-0 flex-1 overflow-y-auto bg-base-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
