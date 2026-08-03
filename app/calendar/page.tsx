"use client";

import {createId} from "../lib/id";
import {FormEvent, useEffect, useState} from "react";
import {ArrowsClockwise, CaretLeft, CaretRight, Check, Clock, Plus, VideoCamera, X} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";
import {Event, useAppState} from "../components/AppState";

const monday = (offset = 0) => {
  const date = new Date();
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + offset * 7);
  date.setHours(0, 0, 0, 0);
  return date;
};

const weekDays = (offset = 0) =>
  Array.from({length: 7}, (_, day) => {
    const date = monday(offset);
    date.setDate(date.getDate() + day);
    return date;
  });

const blankEvent = (): Event => {
  const day = (new Date().getDay() + 6) % 7;
  return {
    id: createId(),
    title: "",
    day,
    time: "09:00",
    top: 76,
    height: 58,
    location: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allDay: false,
    recurrence: null
  };
};

const positionFor = (time: string) => 76 + (Number(time.slice(0, 2)) - 9) * 51 + Number(time.slice(3)) * 0.85;
const reminderValue = (value?: string | null) =>
  value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

type SyncStatus = {
  calendars: {id: string; name: string}[];
  writes: {id: string; state: string}[];
  conflicts: {id: string; localSnapshot: {title: string}; googleSnapshot: {summary?: string}}[];
};

const isSameDate = (d1: Date | string | null | undefined, d2: Date) => {
  if (!d1) return false;
  const dateObj = new Date(d1);
  return (
    dateObj.getFullYear() === d2.getFullYear() &&
    dateObj.getMonth() === d2.getMonth() &&
    dateObj.getDate() === d2.getDate()
  );
};

export default function CalendarPage() {
  const {events, calendarItems, saveEvent, toggleTask} = useAppState();
  const [draft, setDraft] = useState<Event | null>(null);
  const [sync, setSync] = useState<SyncStatus>({calendars: [], writes: [], conflicts: []});
  const [view, setView] = useState<"Day" | "Week" | "Month" | "Agenda">("Week");
  const today = (new Date().getDay() + 6) % 7;
  const realToday = new Date();
  const [selectedDay, setSelectedDay] = useState<number>(today);
  const [selectedDateNum, setSelectedDateNum] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function connectGoogle() {
    try {
      const res = await fetch("/api/v1/integrations/google/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          setSyncMessage("Google OAuth credentials are not configured in server environment. Set NOEMA_GOOGLE_CLIENT_ID & NOEMA_GOOGLE_CLIENT_SECRET in .env.");
          return;
        }
        throw new Error(data.error?.message || "Could not connect Google OAuth");
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      setSyncMessage((err as Error).message);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/v1/calendar-sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setSyncMessage("Google Calendar is not connected yet. Connecting Google OAuth...");
          await connectGoogle();
          return;
        }
        if (res.status === 503) {
          setSyncMessage("Google OAuth credentials are not configured on server. Configure NOEMA_GOOGLE_CLIENT_ID in server environment.");
          return;
        }
        throw new Error(data.error?.message || "Sync failed");
      }
      setSync({ calendars: data.calendars || [], conflicts: data.conflicts || [] });
      const pushedCount = data.result?.pushed?.completed ?? 0;
      const pulledCount = data.result?.pulled?.imported ?? 0;
      setSyncMessage(`Google Calendar sync completed · ${pushedCount} pushed · ${pulledCount} imported`);
    } catch (err) {
      setSyncMessage((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const dates = weekDays(weekOffset);
  const days = dates.map(date => date.toLocaleDateString(undefined, {weekday: "short", day: "numeric"}));

  const viewMonthDate = dates[0] || new Date();
  const currentYear = viewMonthDate.getFullYear();
  const currentMonth = viewMonthDate.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const firstDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthGridTotal = firstDayOffset + daysInMonth > 35 ? 42 : 35;
  const isCurrentMonthView = realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth;
  const todayDateNum = isCurrentMonthView ? realToday.getDate() : -1;

  const activeSelectedDate = selectedDateNum !== null
    ? new Date(currentYear, currentMonth, selectedDateNum)
    : dates[selectedDay];

  const taskItems=calendarItems.filter(item=>item.kind==="task")
    .map(item => (item.kind === "task" ? item.task : null))
    .filter(task => task && !task.archived && (task.scheduledStartAt || task.dueAt))
    .map(task => {
      const date = new Date(task!.scheduledStartAt || task!.dueAt!);
      const day = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - dates[0].getTime()) / 86400000);
      const timed = !!task!.scheduledStartAt;
      const time = timed ? date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false}) : "All day";
      return {...task!, kind: "task" as const, day, time, top: timed ? positionFor(time) : 28, height: 42};
    })
    .filter(task => task.day >= 0 && task.day < 7);

  const allTasks = calendarItems
    .filter(item => item.kind === "task")
    .map(item => (item.kind === "task" ? item.task : null))
    .filter((task): task is NonNullable<typeof task> => !!task && !task.archived && !!(task.scheduledStartAt || task.dueAt));

  const selectedEvents = events.filter(event => (event.startAt ? isSameDate(event.startAt, activeSelectedDate) : event.day === selectedDay));
  const selectedTasks = allTasks
    .filter(task => isSameDate(task.scheduledStartAt || task.dueAt, activeSelectedDate))
    .map(task => {
      const date = new Date(task.scheduledStartAt || task.dueAt!);
      const timed = !!task.scheduledStartAt;
      const time = timed ? date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false}) : "All day";
      return {...task, kind: "task" as const, time};
    });

  const agenda = events.filter(event => (event.startAt ? isSameDate(event.startAt, realToday) : event.day === today));
  const taskAgenda = allTasks
    .filter(task => isSameDate(task.scheduledStartAt || task.dueAt, realToday))
    .map(task => {
      const date = new Date(task.scheduledStartAt || task.dueAt!);
      const timed = !!task.scheduledStartAt;
      const time = timed ? date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false}) : "All day";
      return {...task, kind: "task" as const, time};
    });

  const openTask = (id: string) => {
    location.assign("/?open=" + encodeURIComponent(id));
  };

  const period =
    dates[0].toLocaleDateString(undefined, {month: "short", day: "numeric"}) +
    "–" +
    dates[6].toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"});

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("open");
    const event = events.find(item => item.id === id);
    if (event) setDraft({...event});
  }, [events]);

  useEffect(() => {
    fetch("/api/v1/calendar-sync")
      .then(response => (response.ok ? response.json() : null))
      .then(value => value && setSync(value))
      .catch(() => {});
  }, []);

  async function resolveConflict(id: string, choice: "local" | "google" | "duplicate") {
    const response = await fetch(`/api/v1/calendar-sync/conflicts/${id}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({choice})
    });
    if (response.ok) location.reload();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft?.title.trim()) return;
    const start = dates[draft.day];
    start.setHours(draft.allDay ? 0 : Number(draft.time.slice(0, 2)), draft.allDay ? 0 : Number(draft.time.slice(3)), 0, 0);
    const duration = draft.allDay
      ? 86400000
      : draft.startAt && draft.endAt
      ? new Date(draft.endAt).getTime() - new Date(draft.startAt).getTime()
      : 3600000;
    saveEvent({
      ...draft,
      title: draft.title.trim(),
      startAt:start.toISOString(),
      endAt: new Date(start.getTime() + duration).toISOString(),
      timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      top: positionFor(draft.time),
      location: draft.location?.trim()
    });
    setDraft(null);
  }

  return (
    <ModuleShell
      active="Calendar"
      title="Calendar"
      action={
        <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
          <button
            className="secondary top-primary"
            onClick={() => void triggerSync()}
            disabled={syncing}
            title="Sync events and tasks with Google Calendar"
          >
            <ArrowsClockwise className={syncing ? "spin-icon" : ""} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
          <button className="primary top-primary" onClick={() => setDraft(blankEvent())}>
            <Plus />
            New event
          </button>
        </div>
      }
    >
      {syncMessage && (
        <div
          className="auth-result"
          style={{marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between"}}
        >
          <span>{syncMessage}</span>
          <button className="secondary icon-button" style={{fontSize: ".75rem", padding: "2px 8px"}} onClick={() => setSyncMessage(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="calendar-toolbar">
        <div>
          <button className="icon-button" aria-label="Previous period" onClick={() => setWeekOffset(w => w - 1)}>
            <CaretLeft />
          </button>
          <button className="icon-button" aria-label="Next period" onClick={() => setWeekOffset(w => w + 1)}>
            <CaretRight />
          </button>
          <button
            className="secondary"
            onClick={() => {
              setWeekOffset(0);
              setSelectedDay(today);
              setSelectedDateNum(todayDateNum > 0 ? todayDateNum : null);
            }}
          >
            Today
          </button>
          <h2>
            {view === "Month"
              ? dates[0].toLocaleDateString(undefined, {month: "long", year: "numeric"})
              : view === "Day" || view === "Agenda"
              ? dates[selectedDay]?.toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"})
              : period}
          </h2>
        </div>
        <div className="view-switch" role="group" aria-label="Calendar view">
          {(["Day", "Week", "Month", "Agenda"] as const).map(item => (
            <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {(sync.writes.length > 0 || sync.conflicts.length > 0) && (
        <section className="auth-result" aria-label="Calendar sync status">
          <strong>
            {sync.conflicts.length
              ? `${sync.conflicts.length} calendar conflict${sync.conflicts.length === 1 ? "" : "s"}`
              : `${sync.writes.length} change${sync.writes.length === 1 ? "" : "s"} waiting to sync`}
          </strong>
          {sync.conflicts.map(conflict => (
            <div key={conflict.id}>
              <small>
                Noema: {conflict.localSnapshot.title} · Google: {conflict.googleSnapshot.summary || "Deleted event"}
              </small>
              <div className="inspector-actions">
                <button className="secondary" onClick={() => void resolveConflict(conflict.id, "local")}>
                  Keep Noema
                </button>
                <button className="secondary" onClick={() => void resolveConflict(conflict.id, "google")}>
                  Keep Google
                </button>
                <button className="secondary" onClick={() => void resolveConflict(conflict.id, "duplicate")}>
                  Keep both
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="calendar-layout">
        {view === "Week" && (
          <section className="week" aria-label="Week calendar">
            <div className="week-head">
              <span />
              <>
                {days.map((day, index) => (
                  <strong
                    className={`${day.includes("24") ? "active" : ""} ${index === selectedDay ? "selected-day" : ""}`}
                    key={day}
                    style={{cursor: "pointer"}}
                    title={`Click to view tasks for ${day}`}
                    onClick={() => {
                      setSelectedDay(index);
                      setSelectedDateNum(null);
                    }}
                  >
                    {day}
                  </strong>
                ))}
              </>
            </div>
            <div className="week-body">
              <div className="times">
                {["08:00", "10:00", "12:00", "14:00", "16:00"].map(t => (
                  <time key={t}>{t}</time>
                ))}
              </div>
              <div className="week-grid">
                {days.map((day, index) => (
                  <div
                    key={day}
                    style={{cursor: "pointer"}}
                    onClick={() => {
                      setSelectedDay(index);
                      setSelectedDateNum(null);
                    }}
                  />
                ))}
                {events.map(event => (
                  <button
                    className={`calendar-event ${event.active ? "active" : ""} ${draft?.id === event.id ? "selected" : ""}`}
                    style={{gridColumn: event.day + 1, top: event.top, height: event.height}}
                    key={event.id}
                    onClick={() => setDraft({...event})}
                  >
                    <time>{event.time}</time>
                    <strong>{event.title}</strong>
                  </button>
                ))}
                {taskItems.map(task => (
                  <button
                    className="calendar-event calendar-task"
                    style={{gridColumn: task.day + 1, top: task.top, height: task.height}}
                    key={`task-${task.id}`}
                    onClick={() => openTask(task.id)}
                  >
                    <time>{task.time}</time>
                    <strong>{task.title}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "Day" && (
          <section className="day-view">
            <div className="times">
              {["08:00", "10:00", "12:00", "14:00", "16:00"].map(t => (
                <time key={t}>{t}</time>
              ))}
            </div>
            <div>
              {agenda.map(event => (
                <button style={{top: event.top, height: event.height}} key={event.id} onClick={() => setDraft({...event})}>
                  <time>{event.time}</time>
                  <strong>{event.title}</strong>
                  <small>{event.location}</small>
                </button>
              ))}
              {taskAgenda.map(task => (
                <button
                  className="calendar-task"
                  style={{top: task.top, height: task.height}}
                  key={`task-${task.id}`}
                  onClick={() => openTask(task.id)}
                >
                  <time>{task.time}</time>
                  <strong>{task.title}</strong>
                  <small>Task · {task.project}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === "Month" && (
          <section className="month-view">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <strong key={day}>{day}</strong>
            ))}
            {Array.from({length: monthGridTotal}, (_, index) => {
              const dateNum = index - firstDayOffset + 1;
              const isValidDate = dateNum > 0 && dateNum <= daysInMonth;
              const dayOfWeekIndex = index % 7;
              const isTodayDate = isValidDate && dateNum === todayDateNum;
              const isSelected = selectedDateNum !== null ? selectedDateNum === dateNum : (selectedDay === dayOfWeekIndex && isTodayDate);

              const cellDate = isValidDate ? new Date(currentYear, currentMonth, dateNum) : null;
              const cellTasks = cellDate
                ? allTasks.filter(task => isSameDate(task.scheduledStartAt || task.dueAt, cellDate))
                : [];
              const cellEvents = cellDate
                ? events.filter(event => (event.startAt ? isSameDate(event.startAt, cellDate) : event.day === dayOfWeekIndex && isTodayDate))
                : [];

              return (
                <button
                  className={`${isTodayDate ? "active" : ""} ${isValidDate && isSelected ? "selected-month-day" : ""}`}
                  key={index}
                  onClick={() => {
                    if (isValidDate) {
                      setSelectedDateNum(dateNum);
                      setSelectedDay(dayOfWeekIndex);
                    }
                  }}
                >
                  <span>{isValidDate ? dateNum : ""}</span>
                  {cellEvents.slice(0, 2).map(event => (
                    <small key={event.id}>
                      {event.time} {event.title}
                    </small>
                  ))}
                  {cellTasks.slice(0, 2).map(task => (
                    <small
                      key={`task-${task.id}`}
                      onClick={event => {
                        event.stopPropagation();
                        openTask(task.id);
                      }}
                    >
                      {task.time} {task.title}
                    </small>
                  ))}
                </button>
              );
            })}
          </section>
        )}

        {view === "Agenda" && (
          <section className="mobile-agenda-view">
            {agenda.map(event => (
              <button key={event.id} onClick={() => setDraft({...event})}>
                <time>{event.time}</time>
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.location || "No location"}</small>
                </span>
                <CaretRight />
              </button>
            ))}
            {taskAgenda.map(task => (
              <button key={`task-${task.id}`} onClick={() => openTask(task.id)}>
                <time>{task.time}</time>
                <span>
                  <strong>{task.title}</strong>
                  <small>Task · {task.project}</small>
                </span>
                <CaretRight />
              </button>
            ))}
          </section>
        )}

        {draft ? (
          <aside className="object-inspector calendar-inspector">
            <div className="object-inspector-head">
              <div>
                <span>{events.some(event => event.id === draft.id) ? "Edit event" : "New event"}</span>
                <small>{period}</small>
              </div>
              <button className="icon-button" aria-label="Close event inspector" onClick={() => setDraft(null)}>
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              <label>
                Event name
                <input
                  autoFocus
                  value={draft.title}
                  onChange={e => setDraft({...draft, title: e.target.value})}
                  placeholder="Event name"
                  required
                />
              </label>
              <div className="field-row">
                <label>
                  Day
                  <select value={draft.day} onChange={e => setDraft({...draft, day: Number(e.target.value)})}>
                    {days.map((day, index) => (
                      <option value={index} key={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Time
                  <input
                    type="time"
                    value={draft.time}
                    disabled={draft.allDay}
                    onChange={e => setDraft({...draft, time: e.target.value})}
                  />
                </label>
              </div>
              <label className="check-field">
                <input type="checkbox" checked={!!draft.allDay} onChange={e => setDraft({...draft, allDay: e.target.checked})} />
                <span>All day</span>
              </label>
              <label>
                Repeat
                <select
                  value={draft.recurrence?.frequency || ""}
                  onChange={e => setDraft({...draft, recurrence: e.target.value ? {frequency: e.target.value} : null})}
                >
                  <option value="">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              {!events.some(event => event.id === draft.id) && sync.calendars.length > 0 && (
                <label>
                  Google calendar
                  <select
                    value={draft.googleCalendarId || ""}
                    onChange={e => setDraft({...draft, googleCalendarId: e.target.value || undefined})}
                  >
                    <option value="">Noema only</option>
                    {sync.calendars.map(calendar => (
                      <option value={calendar.id} key={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Time zone
                <input
                  value={draft.timezone || ""}
                  onChange={e => setDraft({...draft, timezone: e.target.value})}
                  required
                />
              </label>
              <label>
                Location or link
                <input
                  value={draft.location || ""}
                  onChange={e => setDraft({...draft, location: e.target.value})}
                  placeholder="Optional"
                />
              </label>
              <label>
                Reminder
                <input
                  type="datetime-local"
                  value={reminderValue(draft.reminderAt)}
                  onChange={e => setDraft({...draft, reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null})}
                />
              </label>
              <div className="inspector-actions">
                <button type="button" className="secondary" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button className="primary">Save event</button>
              </div>
            </form>
          </aside>
        ) : (
          <aside className="agenda">
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px"}}>
              <h3 style={{margin: 0}}>
                {selectedDateNum !== null
                  ? new Date(currentYear, currentMonth, selectedDateNum).toLocaleDateString(undefined, {weekday: "long", month: "short", day: "numeric"})
                  : dates[selectedDay]?.toLocaleDateString(undefined, {weekday: "long", month: "short", day: "numeric"})}
              </h3>
              {(selectedDay !== today || selectedDateNum !== null) && (
                <button
                  className="secondary icon-button"
                  style={{fontSize: ".75rem", padding: "2px 8px"}}
                  onClick={() => {
                    setSelectedDay(today);
                    setSelectedDateNum(todayDateNum > 0 ? todayDateNum : null);
                  }}
                >
                  Today
                </button>
              )}
            </div>
            <div style={{marginBottom: "16px"}}>
              <small
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--muted)",
                  fontSize: ".72rem",
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  textTransform: "uppercase"
                }}
              >
                Tasks ({selectedTasks.length})
              </small>
              {selectedTasks.length === 0 ? (
                <p style={{margin: "0 0 12px", color: "var(--muted)", fontSize: ".8rem"}}>No tasks scheduled for this day.</p>
              ) : (
                selectedTasks.map(task => (
                  <div
                    className="agenda-row task-agenda-row"
                    key={`task-${task.id}`}
                    style={{display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)"}}
                  >
                    <button
                      className={`task-check ${task.completed ? "completed" : ""}`}
                      aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
                      aria-pressed={task.completed}
                      onClick={e => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        background: task.completed ? "var(--primary-soft)" : "transparent",
                        color: task.completed ? "var(--primary)" : "var(--muted)",
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                    >
                      {task.completed ? (
                        <Check weight="bold" style={{width: "14px", height: "14px"}} />
                      ) : (
                        <span style={{width: "10px", height: "10px", borderRadius: "50%", border: "1px solid currentColor"}} />
                      )}
                    </button>
                    <div style={{flex: 1, minWidth: 0, cursor: "pointer"}} onClick={() => openTask(task.id)}>
                      <strong
                        style={{
                          display: "block",
                          fontSize: ".84rem",
                          color: task.completed ? "var(--muted)" : "var(--ink)",
                          textDecoration: task.completed ? "line-through" : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {task.title}
                      </strong>
                      <small style={{fontSize: ".72rem", color: "var(--muted)"}}>
                        {task.time} · {task.project}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div>
              <small
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--muted)",
                  fontSize: ".72rem",
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  textTransform: "uppercase"
                }}
              >
                Events ({selectedEvents.length})
              </small>
              {selectedEvents.map((event, index) => (
                <button className="agenda-row" key={event.id} onClick={() => setDraft({...event})}>
                  <span>{index ? <VideoCamera /> : <Clock />}</span>
                  <div>
                    <time>{event.allDay ? "All day" : event.time}</time>
                    <strong>{event.title}</strong>
                    {event.location && <small>{event.location}</small>}
                  </div>
                </button>
              ))}
            </div>
            <button className="secondary" style={{width: "100%", marginTop: "16px"}} onClick={() => setDraft({...blankEvent(), day: selectedDay})}>
              Add event
            </button>
          </aside>
        )}
      </div>
    </ModuleShell>
  );
}
