import React, { useEffect } from "react";
import { AppNotification } from "../types";
import { Bell, AlertTriangle, CheckCircle, Info, X, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationAlertsProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationAlerts({
  notifications,
  onDismiss,
  onClearAll,
}: NotificationAlertsProps) {
  // Filter only unread or recent notifications for the floating toast alerts
  const activeToasts = notifications.filter((n) => !n.read).slice(0, 3);

  // Auto-dismiss standard informational toasts after 5 seconds
  useEffect(() => {
    activeToasts.forEach((toast) => {
      if (toast.type === "info" || toast.type === "success") {
        const timer = setTimeout(() => {
          onDismiss(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
      }
    });
  }, [activeToasts, onDismiss]);

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "alert":
        return <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      default:
        return <Info className="h-5 w-5 text-gold-accent" />;
    }
  };

  const getBgClass = (type: AppNotification["type"]) => {
    switch (type) {
      case "warning":
        return "bg-gold-input border-amber-900/40 text-slate-300";
      case "alert":
        return "bg-gold-input border-red-900/40 text-slate-300";
      case "success":
        return "bg-gold-input border-emerald-900/40 text-slate-300";
      default:
        return "bg-gold-input border-gold-border text-slate-300";
    }
  };

  return (
    <>
      {/* Floating Toast Notification Container */}
      <div id="toast-container" className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeToasts.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`p-4 rounded-xl border shadow-2xl flex gap-3 items-start pointer-events-auto ${getBgClass(
                notification.type
              )}`}
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
              <div className="flex-grow min-w-0">
                <h4 className="text-xs font-bold text-slate-200">
                  {notification.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {notification.message}
                </p>
                <span className="text-[9px] text-slate-500 mt-1.5 block font-mono">
                  {new Date(notification.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <button
                id={`dismiss-toast-${notification.id}`}
                onClick={() => onDismiss(notification.id)}
                className="text-slate-500 hover:text-slate-200 p-0.5 rounded transition"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Embedded Alerts Panel for sidebar or modal listings */}
      {notifications.length > 0 && (
        <div id="alerts-tray-panel" className="bg-gold-panel border border-gold-border rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gold-accent" />
              <h3 className="font-serif italic font-semibold text-slate-200">
                Study Alerts & Reminders
              </h3>
            </div>
            <button
              id="clear-all-alerts-btn"
              onClick={onClearAll}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border text-xs flex gap-2.5 items-start ${getBgClass(
                  n.type
                )}`}
              >
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-grow">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-slate-200">
                      {n.title}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1 leading-normal">
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
