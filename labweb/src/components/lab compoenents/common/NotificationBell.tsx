import { useState } from "react";
import { Bell, CheckCircle, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const { items, unreadCount, loading, markAsRead } = useNotifications({ pollMs: 30000, limit: 20 });
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 text-gray-900 hover:bg-gray-100 hover:text-black"
      >
        <Bell className="w-4 h-4" />
        {loading && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium">Notifications</div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            )}
            {items.map((n) => (
              <div key={n._id} className={`px-3 py-2 border-b text-sm ${!n.read ? "bg-blue-50/60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-gray-600">{n.message}</div>
                    <div className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => markAsRead(n._id)}>
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
