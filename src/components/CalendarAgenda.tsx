import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { connectCalendar } from "../services/auth";
import {
  CalendarAuthError,
  fetchCalendarList,
  fetchTodayEvents,
  hasCalendarToken,
  userTimeZone,
  type CalendarInfo,
} from "../services/calendar";
import type { CalendarEvent } from "../types/worksync";

type Status = "loading" | "ready" | "needs-connect" | "error";

const timeFormatter = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: userTimeZone() });

const eventTime = (iso: string) => {
  if (!iso.includes("T")) return "Todo el dia";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
};

export function CalendarAgenda() {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedId, setSelectedId] = useState("primary");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const loadEvents = useCallback(async (calendarId: string) => {
    setStatus("loading");
    try {
      setEvents(await fetchTodayEvents(calendarId));
      setStatus("ready");
    } catch (error) {
      setStatus(error instanceof CalendarAuthError ? "needs-connect" : "error");
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (!hasCalendarToken()) {
      setStatus("needs-connect");
      return;
    }
    setStatus("loading");
    try {
      const list = await fetchCalendarList();
      setCalendars(list);
      const primary = list.find((calendar) => calendar.primary)?.id ?? "primary";
      setSelectedId(primary);
      await loadEvents(primary);
    } catch (error) {
      setStatus(error instanceof CalendarAuthError ? "needs-connect" : "error");
    }
  }, [loadEvents]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const connect = async () => {
    setStatus("loading");
    try {
      const ok = await connectCalendar();
      if (ok) await loadAll();
      else setStatus("needs-connect");
    } catch {
      setStatus("needs-connect");
    }
  };

  const onSelect = (calendarId: string) => {
    setSelectedId(calendarId);
    void loadEvents(calendarId);
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="text-primary" />
        <h2 className="text-xl font-bold">Agenda de hoy</h2>
      </div>

      {(status === "ready" || status === "loading") && calendars.length > 0 && (
        <select
          value={selectedId}
          onChange={(event) => onSelect(event.target.value)}
          className="mb-4 w-full rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.summary}
              {calendar.primary ? " (principal)" : ""}
            </option>
          ))}
        </select>
      )}

      {status === "loading" && <p className="text-sm text-text-secondary">Cargando tu calendario...</p>}

      {status === "needs-connect" && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Conecta tu Google Calendar para ver tus eventos del dia.</p>
          <button onClick={connect} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
            <CalendarDays size={16} />
            Conectar Google Calendar
          </button>
        </div>
      )}

      {status === "error" && (
        <button onClick={() => void loadAll()} className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm font-bold text-primary">
          <RefreshCw size={16} />
          Reintentar
        </button>
      )}

      {status === "ready" && (
        <ul className="space-y-2">
          {events.length === 0 && <li className="rounded-lg bg-surface-container-low px-3 py-4 text-center text-sm text-text-secondary">Sin eventos hoy.</li>}
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
              <span className="shrink-0 font-mono text-xs font-bold text-primary">{eventTime(event.start)}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{event.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
