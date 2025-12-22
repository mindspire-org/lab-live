
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, CheckCircle, X, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

function getModulePermission(moduleName: string): { view: boolean; edit: boolean; delete: boolean } {
  try {
    const roleRaw = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null;
    const role = String(roleRaw || '').trim().toLowerCase();
    const isAdmin = new Set(['admin', 'administrator', 'lab supervisor', 'lab-supervisor', 'supervisor']).has(role);
    if (isAdmin) {
      return { view: true, edit: true, delete: true };
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('permissions') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return { view: true, edit: true, delete: true };
    }

    const wanted = String(moduleName || '').trim().toLowerCase();
    const found = parsed.find((p: any) => String(p?.name || '').trim().toLowerCase() === wanted);
    if (!found) {
      return { view: true, edit: false, delete: false };
    }
    return {
      view: !!found.view,
      edit: !!found.edit,
      delete: !!found.delete,
    };
  } catch {
    return { view: true, edit: true, delete: true };
  }
}

interface INotification {
  _id: string;
  title: string;
  message: string;
  // Backend type is a free string; map to visual variants in helpers
  type: "critical" | "warning" | "info" | "success" | string;
  category?: string;
  read: boolean;
  createdAt: string;
}

const Notifications = () => {
  const modulePerm = getModulePermission('Notifications');
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [ackLocal, setAckLocal] = useState<string[]>([]);

  // fetch on mount
  useEffect(() => {
    (async () => {
      try {
        // Backend: GET /notifications/mine -> { success, notifications }
        const { data } = await api.get<{ success: boolean; notifications: INotification[] }>(
          `/notifications/mine`
        );

        const list = Array.isArray((data as any)?.notifications)
          ? (data as any).notifications
          : [];

        setNotifications(list);
      } catch (err) {
        console.error(err);
        setNotifications([]);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ack_local_alerts");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setAckLocal(parsed);
    } catch {}
  }, []);

  // helper to update cached state
  const updateLocal = (id: string, changes: Partial<INotification>) =>
    setNotifications(prev => prev.map(n => (n._id === id ? { ...n, ...changes } : n)));

  const ackLocalId = (id: string) => {
    setAckLocal(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try { localStorage.setItem("ack_local_alerts", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Only use backend notifications list (no synthetic/local aggregation)
  const combined = useMemo(() => {
    return [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "critical": return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "info": return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "critical": return "destructive";
      case "warning": return "default";
      case "success": return "secondary";
      case "info": return "outline";
      default: return "outline";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "medical": return "bg-red-100 text-red-800";
      case "equipment": return "bg-purple-100 text-purple-800";
      case "results": return "bg-green-100 text-green-800";
      case "inventory": return "bg-yellow-100 text-yellow-800";
      case "research": return "bg-blue-100 text-blue-800";
      case "appointments": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Notifications.', variant: 'destructive' });
      return;
    }
    try {
      updateLocal(notificationId, { read: true });
      // Backend: PATCH /notifications/mine/:id/read
      await api.patch(`/notifications/mine/${notificationId}/read`);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = () => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for Notifications.', variant: 'destructive' });
      return;
    }
    // Mark all current backend notifications as read in local state
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Fire-and-forget backend call to mark all as read
    api.patch(`/notifications/mine/read-all`).catch(() => {
      // On error we won't roll back UI; next refresh will sync from backend
    });
  };

  const deleteNotification = (notificationId: string) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for Notifications.", variant: 'destructive' });
      return;
    }
    setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
  };

  const unreadCount = combined.filter(n => !n.read).length;

  const formatTimestamp = (timestampStr: string) => {
    const timestamp = new Date(timestampStr);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">
            Stay up to date with important alerts, analyzer updates and lab activity in one place.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button disabled={!modulePerm.edit} onClick={markAllAsRead}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {combined.map((notification) => (
          <Card 
            key={notification._id} 
            className={`transition-all ${!notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h3>
                      <Badge variant={getNotificationBadge(notification.type) as any}>
                        {notification.type}
                      </Badge>
                      <Badge className={getCategoryColor(notification.category)}>
                        {notification.category}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!notification.read && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!modulePerm.edit}
                      onClick={() => markAsRead(notification._id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Read
                    </Button>
                  )}
                  {!notification._id.startsWith("local-") && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      disabled={!modulePerm.delete}
                      onClick={() => deleteNotification(notification._id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {combined.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Notifications;
