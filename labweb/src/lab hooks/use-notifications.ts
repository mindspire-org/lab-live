import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { isDemoMode } from "@/lib/mockData";

export interface INotification {
  _id: string;
  title: string;
  message: string;
  // Backend type is a free string; map to UI variants where needed
  type: "critical" | "warning" | "info" | "success" | string;
  category?: string;
  read: boolean;
  createdAt: string;
}

interface Options {
  pollMs?: number;
  unreadOnly?: boolean;
  limit?: number;
}

export function useNotifications(opts: Options = {}) {
  const { pollMs = 30000, unreadOnly = false, limit = 50 } = opts;
  const [items, setItems] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      if (isDemoMode()) {
        setItems([]);
        return;
      }

      // Backend: GET /notifications/mine returns { success, notifications }
      const { data } = await api.get<{ success: boolean; notifications: INotification[] }>(
        `/notifications/mine`
      );

      let list = Array.isArray((data as any)?.notifications)
        ? (data as any).notifications
        : [];

      if (unreadOnly) {
        list = list.filter((n) => !n.read);
      }

      if (limit && Number.isFinite(limit)) {
        list = list.slice(0, limit);
      }

      setItems(list);
    } catch (e) {
      // swallow
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    if (!isDemoMode() && pollMs > 0) {
      timerRef.current = window.setInterval(fetchList, pollMs);
    }
    // Listen for global refresh event to immediately update the list
    const onRefresh = () => fetchList();
    window.addEventListener("notifications:refresh", onRefresh as any);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.removeEventListener("notifications:refresh", onRefresh as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly, limit, pollMs]);

  const unreadCount = useMemo(() => items.filter(n => !n.read).length, [items]);

  const markAsRead = async (id: string) => {
    try {
      setItems(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
      // Backend: PATCH /notifications/mine/:id/read
      await api.patch(`/notifications/mine/${id}/read`);
      try { window.dispatchEvent(new Event("notifications:refresh")); } catch {}
    } catch (e) {
      // rollback on error
      setItems(prev => prev.map(n => (n._id === id ? { ...n, read: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    // Backend: PATCH /notifications/mine/read-all
    await api.patch(`/notifications/mine/read-all`);
    try { window.dispatchEvent(new Event("notifications:refresh")); } catch {}
  };

  return { items, loading, unreadCount, refresh: fetchList, markAsRead, markAllAsRead };
}

// Helper to programmatically trigger a refresh from anywhere in the app
export const triggerNotificationsRefresh = () => {
  try {
    window.dispatchEvent(new Event("notifications:refresh"));
  } catch {
    // ignore
  }
};
