import React from "react";
import { Bell, LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/lab compoenents/ui/sidebar";
import { UserRole } from "@/lab types/user";
import NotificationBell from "@/components/lab compoenents/common/NotificationBell";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/lab context/AuthContext";

interface LabTopHeaderProps {
  currentRole: UserRole | null;
  // Parent handles actual logout (and any confirmation UI)
  onLogout: () => void;
}

const LabTopHeader: React.FC<LabTopHeaderProps> = ({ currentRole, onLogout }) => {
  const { settings } = useSettings();
  const { role: authRole, userName } = useAuth();

  const roleLabel = authRole
    ? String(authRole)
    : currentRole === "receptionist"
    ? "Receptionist"
    : currentRole === "researcher"
    ? "Researcher"
    : "Lab Supervisor";

  const logoUrl = settings.labLogoUrl || null;
  const labName = settings.hospitalName || "MedLab LIS";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 border-b border-blue-800 bg-blue-900 flex items-center justify-between px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex items-center pr-3 mr-2 border-r border-gray-200">
          <SidebarTrigger className="h-8 w-8 -ml-4 text-white" aria-label="Toggle sidebar" />
        </div>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Lab Logo"
            className="h-8 w-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            <span>M</span>
          </div>
        )}
        <span className="text-sm md:text-base font-semibold text-white">{labName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col leading-tight">
          <span className="text-sm font-medium text-white">{userName || 'User'}</span>
          <span className="text-xs text-blue-50">{roleLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-blue-300 text-white hover:bg-blue-500 hover:border-blue-200"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default LabTopHeader;
