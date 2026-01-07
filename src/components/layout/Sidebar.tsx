import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { AppRole, ROLE_LABELS } from '@/types/database.types';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Package,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: ['auditor', 'team_leader', 'hof_auditor', 'quality_head'],
  },
  {
    label: 'Inspections',
    icon: ClipboardCheck,
    href: '/inspections',
    roles: ['auditor', 'team_leader', 'hof_auditor', 'quality_head'],
  },
  {
    label: 'Create Inspection',
    icon: FileText,
    href: '/inspections/new',
    roles: ['auditor'],
  },
  {
    label: 'Products',
    icon: Package,
    href: '/products',
    roles: ['quality_head'],
  },
  {
    label: 'Users',
    icon: Users,
    href: '/users',
    roles: ['quality_head'],
  },
  {
    label: 'Reports',
    icon: FileText,
    href: '/reports',
    roles: ['quality_head'],
  },
];

export function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  const getRoleBadgeClass = (role: AppRole | null) => {
    switch (role) {
      case 'auditor':
        return 'role-auditor';
      case 'team_leader':
        return 'role-team-leader';
      case 'hof_auditor':
        return 'role-hof-auditor';
      case 'quality_head':
        return 'role-quality-head';
      default:
        return '';
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">QA System</span>
              <span className="text-xs text-sidebar-foreground/60">Inspection Manager</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Info */}
      {!isCollapsed && profile && (
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground font-medium">
              {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {profile.full_name || profile.email}
              </span>
              <span className={cn('role-badge mt-1', getRoleBadgeClass(role))}>
                {role ? ROLE_LABELS[role] : 'No Role'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 flex-shrink-0" />
          ) : (
            <Moon className="h-5 w-5 flex-shrink-0" />
          )}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
