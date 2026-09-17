import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Home,
  FolderOpen,
  MessageSquareText,
  FileText,
  NotebookPen,
  ListChecks,
  GraduationCap,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import DocuMindLogo from "./DocuMindLogo";

export const NAV_ITEMS = [
  { to: "/app/home", label: "Home", icon: Home },
  { to: "/app/documents", label: "Documents", icon: FolderOpen },
  { to: "/app/ask", label: "Ask AI", icon: MessageSquareText },
  { to: "/app/summary", label: "Summary", icon: FileText },
  { to: "/app/notes", label: "Study Notes", icon: NotebookPen },
  { to: "/app/questions", label: "Question Generator", icon: ListChecks },
  { to: "/app/quiz", label: "Practice Quiz", icon: GraduationCap },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  isMobile = false,
}: SidebarProps) {
  const { user, logout } = useAuth();

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

  const isCollapsed = collapsed && !isMobile;

  return (
    <aside
      className={`flex h-full flex-col justify-between border-r border-base-750/70 bg-base-900/95 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-4 border-b border-base-750/50">
          <Link
            to="/app/home"
            onClick={onNavigate}
            className="flex items-center gap-2.5 overflow-hidden focus-ring rounded-xl p-1 hover:opacity-95 transition-opacity"
            title="DocuMind AI"
          >
            <DocuMindLogo
              variant={isCollapsed ? "icon" : "full"}
              size="md"
              showSubtitle={!isCollapsed}
            />
          </Link>

          {!isMobile && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-1 text-ink-400 hover:bg-base-800 hover:text-ink-100 transition-colors focus-ring"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="mt-4 space-y-1.5 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all focus-ring ${
                  isActive
                    ? "bg-accent-600/20 text-accent-300 shadow-sm border border-accent-500/30"
                    : "text-ink-400 hover:bg-base-800/80 hover:text-ink-100 border border-transparent"
                } ${isCollapsed ? "justify-center px-0" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2 : 1.75}
                    className={`shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? "text-accent-400" : "text-ink-400 group-hover:text-ink-200"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Navigation & Profile */}
      <div className="border-t border-base-750/60 p-3 space-y-2">
        <NavLink
          to="/app/settings"
          onClick={onNavigate}
          title={isCollapsed ? "Settings" : undefined}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all focus-ring ${
              isActive
                ? "bg-accent-600/20 text-accent-300 border border-accent-500/30"
                : "text-ink-400 hover:bg-base-800 hover:text-ink-100 border border-transparent"
            } ${isCollapsed ? "justify-center px-0" : ""}`
          }
        >
          <Settings size={18} strokeWidth={1.75} className="shrink-0 group-hover:rotate-45 transition-transform" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>

        {/* User Card */}
        <div
          className={`flex items-center gap-3 rounded-xl bg-base-950/70 p-2 border border-base-750/50 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-600 to-indigo-700 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink-100">{user?.name || "User"}</p>
              <p className="truncate text-[11px] text-accent-400">Pro Learner</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-base-800 hover:text-red-400 transition-colors focus-ring"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
