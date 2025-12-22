import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lab types/user";
import { CurrentView } from "@/lab pages/Index";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/lab compoenents/ui/sidebar";
import { useNotifications } from "@/lab hooks/use-notifications";
import { 
  Menu, 
  X, 
  TestTube2, 
  FileText, 
  PenTool,
  Package,
  Settings,
  Bell,
  LogOut,
  User,
  UserCircle,
  Activity,
  BarChart3,
  UserCheck,
  DollarSign,
  Beaker,
  Barcode,
  Computer,
  Shield,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Truck,
  Microscope,
  LayoutDashboard
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  link?: string;
}

interface NavigationProps {
  currentRole: UserRole;
  // Parent handles actual logout (and any confirmation UI)
  onLogout: () => void;
  onViewChange: (view: CurrentView) => void;
  currentView: CurrentView;
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentRole, 
  onLogout, 
  onViewChange, 
  currentView, 
  className 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [labName, setLabName] = useState<string>("MedSync");
  const [labLogoUrl, setLabLogoUrl] = useState<string>("");

  React.useEffect(() => {
    const load = () => {
      try {
        const ls = typeof window !== 'undefined' ? localStorage.getItem('labSettings') : null;
        const parsed = ls ? JSON.parse(ls) : null;
        setLabName(parsed?.labName || "MedSync");
        const logo = typeof window !== 'undefined' ? localStorage.getItem('labLogoUrl') : '';
        setLabLogoUrl(logo || "");
      } catch {
        // ignore
      }
    };
    load();
    const onStorage = () => load();
    const onFocus = () => load();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  const { unreadCount } = useNotifications({ pollMs: 30000, limit: 20 });
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isAdminUser = (): boolean => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
      const role = String(raw || '').trim().toLowerCase();
      return new Set(['admin', 'administrator', 'lab supervisor', 'lab-supervisor', 'supervisor']).has(role);
    } catch {
      return false;
    }
  };

  const getAllowedPermissionNames = (): Set<string> => {
    try {
      if (isAdminUser()) return new Set();
      const raw = typeof window !== 'undefined' ? localStorage.getItem('permissions') : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed
          .filter((p: any) => p && p.view)
          .map((p: any) => String(p.name || '').trim().toLowerCase())
          .filter(Boolean)
      );
    } catch {
      return new Set();
    }
  };

  const permissionNameForView = (viewId: string): string | null => {
    const map: Record<string, string> = {
      'dashboard': 'Dashboard',
      'test-catalog': 'Test Catalog',
      'sample-intake': 'Sample Intake',
      'sample-tracking': 'Sample Tracking',
      'samples': 'Samples',
      'barcodes': 'Barcodes',
      'result-entry': 'Result Entry',
      'report-designer': 'Report Designer',
      'report-generator': 'Report Generator',
      'inventory': 'Inventory',
      'appointments': 'Appointments',
      'appointments-history': 'Appointments History',
      'suppliers': 'Suppliers',
      'profiling': 'Profiling',
      'staff-attendance': 'Staff Attendance',
      'notifications': 'Notifications',
      'settings': 'Settings',
      'finance': 'Finance',
      'ledger': 'Financial Ledger',
      'expenses': 'Expenses',
      'user-management': 'User Management',
    };
    return map[String(viewId)] || null;
  };

  const getMenuItems = (): MenuItem[] => {
    // Full catalog of possible items
    const allItems: MenuItem[] = [
      { id: "dashboard" as CurrentView, label: "Dashboard", icon: LayoutDashboard },
      { id: "appointments" as CurrentView, label: "Appointments", icon: CalendarDays },
      { id: "sample-intake" as CurrentView, label: "Token Generation", icon: Computer },
      { id: "samples" as CurrentView, label: "Samples", icon: Beaker },
      { id: "barcodes" as CurrentView, label: "Barcodes", icon: Barcode },
      { id: "sample-tracking" as CurrentView, label: "Sample Tracking", icon: Activity },
      { id: "result-entry" as CurrentView, label: "Result Entry", icon: Microscope },
      { id: "report-generator" as CurrentView, label: "Report Generator", icon: FileText },
      { id: "report-designer" as CurrentView, label: "Report Designer", icon: PenTool },
      { id: "test-catalog" as CurrentView, label: "Test Catalog", icon: TestTube2 },
      { id: "profiling" as CurrentView, label: "Profiling", icon: User },
      { id: "inventory" as CurrentView, label: "Inventory", icon: Package },
      { id: "suppliers" as CurrentView, label: "Suppliers", icon: Truck },
      { id: "staff-attendance" as CurrentView, label: "Staff Attendance", icon: UserCheck },
      { id: "finance" as CurrentView, label: "Finance", icon: DollarSign },
      { id: "user-management" as CurrentView, label: "User Management", icon: UserCircle },
      { id: "notifications" as CurrentView, label: "Notifications", icon: Bell },
      { id: "settings" as CurrentView, label: "Settings", icon: Settings },
    ];

    // Role based subsets
    if (currentRole === "receptionist") {
      const receptionistIds: CurrentView[] = [
        "appointments",
        "sample-intake",
        "samples",
        "barcodes",
        "sample-tracking",
      ];
      return allItems.filter(i => receptionistIds.includes(i.id as CurrentView));
    }

    if (currentRole === "researcher") {
      // researcher sees all except: user-management, settings, finance
      const excluded: CurrentView[] = [
        "user-management",
        "settings",
        "finance",
      ];
      return allItems.filter(i => !excluded.includes(i.id as CurrentView));
    }

    // lab-technician: no hidden items
    const hiddenForNow: CurrentView[] = [];
    const base = allItems.filter(i => !hiddenForNow.includes(i.id as CurrentView));

    const allowed = getAllowedPermissionNames();
    if (allowed.size === 0) return base;

    return base.filter((i) => {
      const required = permissionNameForView(String(i.id));
      if (!required) return false;
      return allowed.has(String(required).trim().toLowerCase());
    });
  };

  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case "receptionist":
        return "Receptionist";
      case "researcher":
        return "Researcher";
      default:
        return "Lab Technician";
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "receptionist":
        return "bg-amber-100 text-amber-800";
      case "researcher":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <nav className={cn("flex flex-col w-full px-2 py-4", className)}>
      {/* Sidebar Vertical Menu (header removed per design) */}
      <div className="flex flex-col space-y-1 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;

          // Custom rendering for Appointments with collapsible submenu
          if (item.id === "appointments") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  // Parent row is just a toggle when expanded; navigation happens via submenu
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, auto expand sidebar and open submenu
                      setOpen(true);
                      setIsAppointmentsOpen(true);
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsAppointmentsOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Appointments</span>
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out origin-center",
                          isAppointmentsOpen ? "rotate-90" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 mt-1 grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                      isAppointmentsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden flex flex-col space-y-1">
                      <Button
                        variant={currentView === "appointments" ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center justify-start text-sm"
                        onClick={() => onViewChange("appointments")}
                      >
                        <span>Appointments</span>
                      </Button>
                      <Button
                        variant={currentView === "appointments-history" ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center justify-start text-sm"
                        onClick={() => onViewChange("appointments-history")}
                      >
                        <span>Appointments History</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Custom rendering for Finance with collapsible submenu
          if (item.id === "finance") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  // Parent row is just a toggle when expanded; navigation happens via submenu
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, auto expand sidebar and open submenu
                      setOpen(true);
                      setIsFinanceOpen(true);
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsFinanceOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Finance</span>
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out origin-center",
                          isFinanceOpen ? "rotate-90" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 mt-1 grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                      isFinanceOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden flex flex-col space-y-1">
                      <Button
                        variant={currentView === "finance" ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center justify-start text-sm"
                        onClick={() => onViewChange("finance")}
                      >
                        <span>Finance</span>
                      </Button>
                      <Button
                        variant={currentView === "ledger" ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center justify-start text-sm"
                        onClick={() => onViewChange("ledger")}
                      >
                        <span>Financial Ledger</span>
                      </Button>
                      <Button
                        variant={currentView === "expenses" ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center justify-start text-sm"
                        onClick={() => onViewChange("expenses")}
                      >
                        <span>Expenses</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            false ? (
              <Link
                key={item.id}
                to="/"
                className="hidden"
                onClick={() => {}}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ) : (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(item.id as CurrentView)}
                className={cn(
                  "flex items-center w-full",
                  isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
              >
                {item.id === "notifications" ? (
                  <span className="relative inline-block">
                    <Icon className={cn("w-4 h-4", unreadCount > 0 && "text-red-600")} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {!isCollapsed && item.label}
              </Button>
            )
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className={cn(
            "flex items-center text-red-600 hover:text-red-700 w-full",
            isCollapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </nav>
  );
}
;

export default Navigation;
