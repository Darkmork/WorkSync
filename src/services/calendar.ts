import type { CalendarEvent } from "../types/worksync";

const TOKEN_KEY = "worksync-gcal-token";
let token: string | null = null;

export class CalendarAuthError extends Error {}

export function setCalendarToken(value: string | null) {
  token = value;
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage no disponible
  }
}

export function getCalendarToken(): string | null {
  if (token) return token;
  try {
    token = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }
  return token;
}

export function hasCalendarToken(): boolean {
  return Boolean(getCalendarToken());
}

export function clearCalendarToken() {
  setCalendarToken(null);
}

async function call(path: string, init?: RequestInit) {
  const current = getCalendarToken();
  if (!current) throw new CalendarAuthError("Sin acceso a Google Calendar.");
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${current}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (response.status === 401 || response.status === 403) {
    clearCalendarToken();
    throw new CalendarAuthError("Tu acceso a Google Calendar expiro. Reconecta.");
  }
  if (!response.ok) throw new Error("Google Calendar no respondio correctamente.");
  return response.json();
}

export interface CalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
}

export function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export async function fetchCalendarList(): Promise<CalendarInfo[]> {
  const data = (await call(`/users/me/calendarList`)) as {
    items?: Array<{ id: string; summary?: string; summaryOverride?: string; primary?: boolean }>;
  };
  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summaryOverride ?? item.summary ?? item.id,
    primary: Boolean(item.primary),
  }));
}

export async function fetchEvents(timeMinISO: string, timeMaxISO: string, calendarId = "primary"): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    timeZone: userTimeZone(),
    maxResults: "50",
  });
  const data = (await call(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`)) as {
    items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }>;
  };
  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? "(sin titulo)",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
  }));
}

export function fetchTodayEvents(calendarId = "primary", now = new Date()): Promise<CalendarEvent[]> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return fetchEvents(start.toISOString(), end.toISOString(), calendarId);
}

export function fetchWeekEvents(calendarId = "primary", now = new Date()): Promise<CalendarEvent[]> {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return fetchEvents(start.toISOString(), end.toISOString(), calendarId);
}

function startOfWeek(now: Date): Date {
  const date = new Date(now);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function createEvent(input: { summary: string; description?: string; startISO: string; endISO: string }) {
  await call(`/calendars/primary/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startISO },
      end: { dateTime: input.endISO },
    }),
  });
}
