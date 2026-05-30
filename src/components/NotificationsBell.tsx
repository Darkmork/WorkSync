import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarCheck, CalendarClock, Mail, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";
import { computeNotifications } from "../domain/notifications";
import {
  markNotificationRead,
  subscribeNotifications,
  type StoredNotification,
} from "../services/notifications";

const kindIcon: Record<StoredNotification["kind"], typeof Bell> = {
  invitation_pending: Mail,
  session_proposed: Sparkles,
  session_confirmed: CalendarCheck,
  session_upcoming: CalendarClock,
};

export function NotificationsBell() {
  const { data, currentUser, firebaseEnabled } = useAppData();
  const [open, setOpen] = useState(false);
  const [stored, setStored] = useState<StoredNotification[]>([]);

  const uid = currentUser?.id;

  // When Firebase is on, the backend owns notifications: subscribe to the inbox.
  // Otherwise we fall back to client-derived notifications computed from loaded data.
  useEffect(() => {
    if (!firebaseEnabled || !uid) {
      setStored([]);
      return;
    }
    return subscribeNotifications(uid, setStored);
  }, [firebaseEnabled, uid]);

  const derived = useMemo(
    () => computeNotifications(data, currentUser?.id, currentUser?.email),
    [data, currentUser],
  );

  const items: StoredNotification[] = firebaseEnabled
    ? stored
    : derived.map((notification) => ({ ...notification, read: false }));

  const count = firebaseEnabled ? items.filter((item) => !item.read).length : items.length;

  const handleClick = (item: StoredNotification) => {
    setOpen(false);
    if (firebaseEnabled && uid && !item.read) {
      void markNotificationRead(uid, item.id);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-outline transition-colors hover:bg-surface-container"
        aria-label={`Notificaciones${count ? `: ${count}` : ""}`}
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border-subtle bg-white shadow-lift">
            <div className="border-b border-border-subtle px-4 py-3">
              <p className="font-bold">Notificaciones</p>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-secondary">Estás al día. No hay nada pendiente.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-border-subtle overflow-auto">
                {items.map((item) => {
                  const Icon = kindIcon[item.kind] ?? Bell;
                  const body = (
                    <div
                      className={`flex items-start gap-3 px-4 py-3 transition hover:bg-surface-container-low ${
                        item.read ? "opacity-60" : ""
                      }`}
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="text-sm text-text-secondary">{item.detail}</p>
                      </div>
                      {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                  );
                  return (
                    <li key={item.id}>
                      {item.to ? (
                        <Link to={item.to} onClick={() => handleClick(item)} className="block">
                          {body}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => handleClick(item)} className="block w-full text-left">
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
