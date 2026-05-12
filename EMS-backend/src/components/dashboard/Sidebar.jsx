import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  PlusCircle,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/', label: 'Analytics', icon: BarChart3 },
  { to: '/data-entry', label: 'KPI Entry', icon: PlusCircle },
  { to: '/kpi-overview', label: 'KPI Overview', icon: ClipboardList },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/manage-users', label: 'Users', icon: Users },
];

const deptLinks = [
  { to: '/', label: 'Analytics', icon: BarChart3 },
  { to: '/kpi-overview', label: 'All Departments', icon: ClipboardList },
  { to: '/data-entry', label: 'KPI Entry', icon: PlusCircle },
];

export default function Sidebar({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const links = isAdmin ? adminLinks : deptLinks;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight truncate">DeptFlow</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && (
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold truncate">{user?.full_name || 'User'}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">
              {isAdmin ? 'Administrator' : user?.department_name || 'Department'}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
