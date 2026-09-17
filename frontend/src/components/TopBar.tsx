import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Menu, Sparkles, BookOpen, Settings, LogOut, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { NAV_ITEMS } from "./Sidebar";

interface TopBarProps {
  onOpenMobileMenu: () => void;
  activeDocName?: string | null;
}

export default function TopBar({ onOpenMobileMenu, activeDocName }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  // Determine current route label
  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNav?.label || "Workspace";

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    : "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-base-750/70 bg-base-900/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile menu button & breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-1.5 text-ink-300 hover:bg-base-800 md:hidden focus-ring"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-semibold text-ink-100 shrink-0">{pageTitle}</span>

          {activeDocName && (
            <>
              <span className="text-ink-500 hidden sm:inline">/</span>
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-accent-500/30 bg-accent-600/10 px-2.5 py-1 text-xs font-medium text-accent-300 max-w-[240px] truncate">
                <BookOpen size={12} className="shrink-0 text-accent-400" />
                <span className="truncate">{activeDocName}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick actions and User Profile */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/documents"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-base-750 bg-base-850 px-2.5 py-1.5 text-xs font-medium text-ink-200 hover:border-accent-500/40 hover:bg-base-800 transition-colors focus-ring"
        >
          <Plus size={13} className="text-accent-400" />
          <span>Add PDF</span>
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-full border border-base-750 bg-base-850 py-1 pl-1 pr-2.5 hover:border-accent-500/40 transition-colors focus-ring"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent-600 to-indigo-700 text-[11px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-ink-200">{user?.name?.trim().split(/\s+/)[0] || "User"}</span>
            <ChevronDown size={13} className="text-ink-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-10 z-40 w-56 overflow-hidden rounded-2xl border border-base-750 bg-base-850 p-2 shadow-card animate-fade-in">
                <div className="border-b border-base-750/70 px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink-100">{user?.name}</p>
                  <p className="text-[11px] text-ink-400 truncate">{user?.email}</p>
                </div>

                <div className="mt-1 space-y-0.5">
                  <Link
                    to="/app/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-ink-200 hover:bg-base-800 hover:text-ink-50 transition-colors"
                  >
                    <Settings size={14} className="text-ink-400" />
                    <span>Account Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
