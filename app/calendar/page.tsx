"use client";

import {createId} from "../lib/id";
import {DragEvent, FormEvent, KeyboardEvent, PointerEvent, useEffect, useRef, useState} from "react";
import {ArrowsClockwise, CaretLeft, CaretRight, Check, Clock, Plus, VideoCamera, X} from "@phosphor-icons/react";
import {ModuleShell} from "../components/ModuleShell";
import {Event, useAppState} from "../components/AppState";
import {DAY_MINUTES,minutesAt,overlapLayout,snapMinutes,withMinutes} from "../lib/calendar";

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const monday = (offset = 0) => {
  const date = startOfWeek(new Date());
  date.setDate(date.getDate() + offset * 7);
  return date;
};

const weekOffsetFor = (date: Date) => Math.round((startOfWeek(date).getTime() - monday().getTime()) / 604800000);

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

const positionFor = (time: string) => 76 + (Number(time.slice(0, 2)) - 9) * 60 + Number(time.slice(3));
const dayPositionFor = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const dayTimes = Array.from({length:25},(_,hour)=>`${String(hour).padStart(2,"0")}:00`);
const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const eventTime = (value?: string | null, timeZone?: string) => value ? new Intl.DateTimeFormat(undefined, {hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timeZone || deviceTimeZone()}).format(new Date(value)) : "";
const formatTimeRange = (start?: string | null,end?: string | null,fallback="",timeZone?:string) => start&&end?`${eventTime(start,timeZone)}–${eventTime(end,timeZone)}`:start?eventTime(start,timeZone):fallback;
const durationHeight = (start?: string | null, end?: string | null, fallback = 45) => start && end ? Math.max(30, Math.min(240, (new Date(end).getTime() - new Date(start).getTime()) / 60000)) : fallback;
const reminderValue = (value?: string | null) =>
  value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

const CALENDAR_VIEW_KEY = "noema-calendar-view";
const calendarViews = ["Day", "Week", "Month", "Agenda"] as const;
type CalendarView = (typeof calendarViews)[number];
const readStoredView = (): CalendarView | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CALENDAR_VIEW_KEY);
  return stored && (calendarViews as readonly string[]).includes(stored) ? (stored as CalendarView) : null;
};

type SyncStatus = {
  calendars: {id: string; name: string}[];
  writes: {id: string; state: string}[];
  conflicts: {id: string; localSnapshot: {title: string}; googleSnapshot: {summary?: string}}[];
};
type CalendarEvent=Event&{originalStartAt?:string;lane?:number;lanes?:number};

const isSameDate = (d1: Date | string | null | undefined, d2: Date) => {
  if (!d1) return false;
  const dateObj = new Date(d1);
  return (
    dateObj.getFullYear() === d2.getFullYear() &&
    dateObj.getMonth() === d2.getMonth() &&
    dateObj.getDate() === d2.getDate()
  );
};

const coversDate = (startAt: string | null | undefined, endAt: string | null | undefined, date: Date, legacyDay?: number) => {
  if (!startAt) return typeof legacyDay === "number" && legacyDay === (date.getDay() + 6) % 7;
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : new Date(start.getTime() + 7200000);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  return start < dayEnd && end > dayStart;
};

export default function CalendarPage() {
  const {events, calendarItems, saveEvent, saveTask, toggleTask} = useAppState();
  const [draft, setDraft] = useState<Event | null>(null);
  const [sync, setSync] = useState<SyncStatus>({calendars: [], writes: [], conflicts: []});
  const [view, setView] = useState<"Day" | "Week" | "Month" | "Agenda">(() => {
    if (typeof window === "undefined") return "Day";
    const saved = new URLSearchParams(location.search).get("view");
    return saved && calendarViews.includes(saved as CalendarView) ? saved as CalendarView : readStoredView() || "Day";
  });
  const today = (new Date().getDay() + 6) % 7;
  const realToday = new Date();
  const [selectedDay, setSelectedDay] = useState<number>(today);
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = typeof window === "undefined" ? null : new URLSearchParams(location.search).get("date");
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return new Date(`${saved}T00:00:00`);
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [instances, setInstances] = useState<CalendarEvent[]>([]);
  const [scopeDraft, setScopeDraft] = useState<CalendarEvent | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [eventTitleError, setEventTitleError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const pointerStart = useRef<{x: number; y: number; day: number} | null>(null);
  const [dragging, setDragging] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [undoToast, setUndoToast] = useState<{message: string; onUndo: () => void} | null>(null);
  const [moreDay, setMoreDay] = useState<Date | null>(null);
  const userSelectedView = useRef(false);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>setHydrated(true),[]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const media = matchMedia("(max-width: 820px)"),
      adapt = () => {
        if (userSelectedView.current) return;
        const stored = readStoredView();
        if (stored) {
          setView(stored);
          return;
        }
        setView("Day");
      };
    adapt();
    media.addEventListener("change", adapt);
    return () => media.removeEventListener("change", adapt);
  }, []);
  const chooseView = (next: "Day" | "Week" | "Month" | "Agenda") => {
    userSelectedView.current = true;
    setView(next);
    if (typeof window !== "undefined")
      localStorage.setItem(CALENDAR_VIEW_KEY, next);
  };

  useEffect(()=>{
    const params=new URLSearchParams(location.search),date=selectedDate.toISOString().slice(0,10);
    params.set("view",view);params.set("date",date);
    history.replaceState(null,"",`${location.pathname}?${params}`);
  },[view,selectedDate]);

  const timeAt = (date:Date,y:number) => withMinutes(date,snapMinutes(y));
  const beginSlot = (event:PointerEvent<HTMLDivElement>,day:number) => {const rect=event.currentTarget.getBoundingClientRect();pointerStart.current={x:event.clientX,y:event.clientY-rect.top,day};setDragging(false);if(event.currentTarget instanceof Element)event.currentTarget.setPointerCapture(event.pointerId)};
  const finishSlot = (event:PointerEvent<HTMLDivElement>,day:number) => {const start=pointerStart.current;if(!start)return;pointerStart.current=null;const rect=event.currentTarget.getBoundingClientRect(),endY=event.clientY-rect.top,moved=Math.abs(endY-start.y)>5||Math.abs(event.clientX-start.x)>5;if(!moved)return;const setAt=timeAt(dates[start.day],start.y),endAt=timeAt(dates[day],endY);if(endAt<=setAt)endAt.setTime(setAt.getTime()+900000);setDragging(false);setDraft({...blankEvent(),day:start.day,time:eventTime(setAt.toISOString()),startAt:setAt.toISOString(),endAt:endAt.toISOString()})};
  const saveOccurrence=async(item:CalendarEvent,scope:"this"|"following"|"all")=>{const body={scope,startAt:item.startAt,endAt:item.endAt,allDay:!!item.allDay,version:item.version};const {originalStartAt,...event}=item;if(!originalStartAt||scope==="all"){saveEvent(event);return}const response=await fetch(`/api/v1/events/${item.id}/occurrences/${encodeURIComponent(originalStartAt)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!response.ok)throw new Error((await response.json()).error?.message||"Could not save occurrence");setSaveMessage("Recurring event saved");setScopeDraft(null)};
  const persistEvent=(item:CalendarEvent)=>item.recurrence&&item.originalStartAt?setScopeDraft(item):saveEvent(item);
  const moveItem = (event:PointerEvent<HTMLButtonElement>,item:CalendarEvent|typeof timedTaskItems[number],kind:"event"|"task",day:number) => {event.preventDefault();event.stopPropagation();const rect=event.currentTarget.parentElement!.getBoundingClientRect(),duration=kind==="event"?new Date((item as CalendarEvent).endAt!).getTime()-new Date((item as CalendarEvent).startAt!).getTime():((item as typeof timedTaskItems[number]).estimatedMinutes||45)*60000;const onUp=(up:globalThis.PointerEvent)=>{const next=timeAt(dates[day],up.clientY-rect.top),end=new Date(next.getTime()+duration),moved=Math.abs(up.clientY-event.clientY)>=5;setDragging(moved);setTimeout(()=>setDragging(false),0);if(!moved){if(kind==="event")setDraft({...item as CalendarEvent});else openTask(item.id);return}if(kind==="event")persistEvent({...item as CalendarEvent,startAt:next.toISOString(),endAt:end.toISOString(),time:eventTime(next.toISOString())});else saveTask({...item as typeof timedTaskItems[number],scheduledStartAt:next.toISOString(),scheduledEndAt:end.toISOString(),estimatedMinutes:Math.round(duration/60000),dueAt:next.toISOString()})};window.addEventListener("pointerup",onUp,{once:true})};
  const keyMove=(event:KeyboardEvent<HTMLButtonElement>,item:CalendarEvent)=>{if(!["ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();const minutes=minutesAt(item.startAt!)+(event.key==="ArrowUp"?-15:15),duration=new Date(item.endAt!).getTime()-new Date(item.startAt!).getTime(),start=withMinutes(new Date(item.startAt!),snapMinutes(minutes));persistEvent({...item,startAt:start.toISOString(),endAt:new Date(start.getTime()+duration).toISOString()})};
  const resizeEvent=(event:PointerEvent<HTMLSpanElement>,item:CalendarEvent,day:number)=>{event.preventDefault();event.stopPropagation();const rect=event.currentTarget.parentElement!.parentElement!.getBoundingClientRect();const onUp=(up:globalThis.PointerEvent)=>{const end=timeAt(dates[day],up.clientY-rect.top),start=new Date(item.startAt!);persistEvent({...item,endAt:new Date(Math.max(end.getTime(),start.getTime()+900000)).toISOString()})};window.addEventListener("pointerup",onUp,{once:true})};
  const dragEvent=(event:DragEvent,item:CalendarEvent)=>event.dataTransfer.setData("application/noema-event",JSON.stringify(item));
  const toAllDay=(event:DragEvent,day:number)=>{event.preventDefault();const item=JSON.parse(event.dataTransfer.getData("application/noema-event")||"null") as CalendarEvent|null;if(!item)return;const start=new Date(dates[day]);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);persistEvent({...item,startAt:start.toISOString(),endAt:end.toISOString(),allDay:true})};
  const toTimed=(event:DragEvent,day:number)=>{event.preventDefault();const item=JSON.parse(event.dataTransfer.getData("application/noema-event")||"null") as CalendarEvent|null;if(!item)return;const rect=event.currentTarget.getBoundingClientRect(),start=timeAt(dates[day],event.clientY-rect.top),end=new Date(start.getTime()+Math.max(900000,new Date(item.endAt!).getTime()-new Date(item.startAt!).getTime()));persistEvent({...item,startAt:start.toISOString(),endAt:end.toISOString(),allDay:false})};

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
      setSync({ calendars: data.calendars || [], writes: data.writes || [], conflicts: data.conflicts || [] });
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
  const todayColumn=dates.findIndex(date=>isSameDate(now,date)),nowTop=now.getHours()*60+now.getMinutes();
  const days = dates.map(date => date.toLocaleDateString(undefined, {weekday: "long", day: "numeric"}));

  const viewMonthDate = view === "Month" ? selectedDate : dates[0] || new Date();
  const currentYear = viewMonthDate.getFullYear();
  const currentMonth = viewMonthDate.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const firstDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthGridTotal = firstDayOffset + daysInMonth > 35 ? 42 : 35;
  const isCurrentMonthView = realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth;
  const todayDateNum = isCurrentMonthView ? realToday.getDate() : -1;
  const occurrenceRange=view === "Month"?{start:firstDayOfMonth.toISOString(),end:new Date(currentYear,currentMonth+1,1).toISOString()}:{start:dates[0].toISOString(),end:new Date(dates[6].getTime()+86400000).toISOString()};

  const activeSelectedDate = selectedDate;

  function selectDate(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    setSelectedDate(next);
    setSelectedDay((next.getDay() + 6) % 7);
    setWeekOffset(weekOffsetFor(next));
  }

  function movePeriod(direction: number) {
    const next = new Date(selectedDate);
    if (view === "Month") next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * (view === "Week" ? 7 : 1));
    selectDate(next);
  }

  const allTasks = calendarItems
    .map(item => (item.kind === "task" ? item.task : null))
    .filter((task): task is NonNullable<typeof task> => !!task && !task.archived && !!(task.scheduledStartAt || task.dueAt));
  const dayFor = (value?: string | null) => dates.findIndex(date => isSameDate(value,date));
  const taskItems=allTasks
    .map(task => {
      const timed=!!task.scheduledStartAt,time=timed?eventTime(task.scheduledStartAt):"All day";
      return {...task,day:dayFor(task.scheduledStartAt||task.dueAt),time,top:timed?dayPositionFor(time):0,height:durationHeight(task.scheduledStartAt,task.scheduledEndAt,task.estimatedMinutes||45)};
    })
    .filter(task => task.day >= 0 && task.day < 7);
  const displayEvents:CalendarEvent[]=[...events.filter(event=>!event.recurrence),...instances];
  const weekEvents=displayEvents.map(event=>({...event,weekDay:event.startAt?dayFor(event.startAt):event.day})).filter(event=>event.weekDay>=0&&event.weekDay<7);
  const allDayEvents=weekEvents.filter(event=>event.allDay),timedEvents=weekEvents.filter(event=>!event.allDay);
  const allDayTasks=taskItems.filter(task=>!task.scheduledStartAt),timedTaskItems=taskItems.filter(task=>!!task.scheduledStartAt);

  const selectedEvents = displayEvents.filter(event => coversDate(event.startAt, event.endAt, activeSelectedDate, event.day));
  const selectedTasks = allTasks
    .filter(task => isSameDate(task.scheduledStartAt || task.dueAt, activeSelectedDate))
    .map(task => {
      const date = new Date(task.scheduledStartAt || task.dueAt!);
      const timed = !!task.scheduledStartAt;
      const time = timed ? date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false}) : "All day";
      return {...task, kind: "task" as const, time};
    });
  const hasSelectedItems = selectedTasks.length + selectedEvents.length > 0;

  const agenda = displayEvents.filter(event => coversDate(event.startAt, event.endAt, activeSelectedDate, event.day));
  const taskAgenda = allTasks
    .filter(task => isSameDate(task.scheduledStartAt || task.dueAt, activeSelectedDate))
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
    if (!moreDay) return;
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setMoreDay(null); };
    addEventListener("keydown", escape);
    return () => removeEventListener("keydown", escape);
  }, [moreDay]);

  useEffect(() => {
    fetch("/api/v1/calendar-sync")
      .then(response => (response.ok ? response.json() : null))
      .then(value => value && setSync(value))
      .catch(() => {});
  }, []);

  useEffect(()=>{const recurring=events.filter(event=>event.recurrence);if(!recurring.length){setInstances([]);return}Promise.all(recurring.map(event=>fetch(`/api/v1/events/${event.id}/occurrences?start=${encodeURIComponent(occurrenceRange.start)}&end=${encodeURIComponent(occurrenceRange.end)}`).then(response=>response.ok?response.json():{occurrences:[]}))).then(rows=>setInstances(rows.flatMap(row=>row.occurrences||[]))).catch(()=>setSaveMessage("Could not load recurring events"))},[events,occurrenceRange.start,occurrenceRange.end]);

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
    if (!draft?.title.trim()){setEventTitleError("Enter an event name.");return}
    const start = dates[draft.day];
    start.setHours(draft.allDay ? 0 : Number(draft.time.slice(0, 2)), draft.allDay ? 0 : Number(draft.time.slice(3)), 0, 0);
    const end = new Date(start);
    const endTime = eventTime(draft.endAt);
    if (draft.allDay) end.setDate(end.getDate() + 1);
    else if (endTime) {
      end.setHours(Number(endTime.slice(0, 2)), Number(endTime.slice(3)), 0, 0);
      if (end <= start) end.setDate(end.getDate() + 1);
    } else end.setTime(start.getTime() + 3600000);
    persistEvent({
      ...draft,
      title: draft.title.trim(),
      startAt:start.toISOString(),
      endAt: end.toISOString(),
      timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      top: positionFor(draft.time),
      location: draft.location?.trim()
    });
    setEventTitleError("");
    setDraft(null);
  }

  if(!hydrated)return <ModuleShell active="Calendar" title="Calendar"><p role="status">Loading calendar…</p></ModuleShell>;
  return (
    <ModuleShell
      active="Calendar"
      title="Calendar"
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
          <button className="icon-button" aria-label="Previous period" onClick={() => movePeriod(-1)}>
            <CaretLeft />
          </button>
          <h2>
            {view === "Month"
              ? viewMonthDate.toLocaleDateString(undefined, {month: "long", year: "numeric"})
              : view === "Day" || view === "Agenda"
              ? activeSelectedDate.toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"})
              : period}
          </h2>
          <button className="icon-button" aria-label="Next period" onClick={() => movePeriod(1)}>
            <CaretRight />
          </button>
          <button
            className="secondary"
            onClick={() => {
              selectDate(realToday);
            }}
          >
            Today
          </button>
          <button
            className="secondary icon-button calendar-mobile-sync"
            aria-label={syncing ? "Syncing calendar" : "Sync calendar"}
            onClick={() => void triggerSync()}
            disabled={syncing}
          >
            <ArrowsClockwise className={syncing ? "spin-icon" : ""} />
          </button>
          <button
            className="secondary icon-button calendar-mobile-add"
            aria-label="New event"
            onClick={() => {setEventTitleError("");setDraft({...blankEvent(), day: selectedDay})}}
          >
            <Plus />
          </button>
        </div>
        <div className="view-switch" role="group" aria-label="Calendar view">
          {(["Day", "Week", "Month", "Agenda"] as const).map(item => (
            <button className={view === item ? "active" : ""} onClick={() => chooseView(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
        <div className="calendar-toolbar-actions">
          <button
            className="secondary icon-button calendar-sync-action"
            aria-label={syncing ? "Syncing calendar" : "Sync calendar"}
            title="Sync events and tasks with Google Calendar"
            onClick={() => void triggerSync()}
            disabled={syncing}
          >
            <ArrowsClockwise className={syncing ? "spin-icon" : ""} />
          </button>
          <button
            className="primary icon-button calendar-primary-action"
            aria-label="New event"
            title="New event"
            onClick={() => {setEventTitleError("");setDraft({...blankEvent(), day: selectedDay})}}
          >
            <Plus />
          </button>
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
            <div className="week-scroll">
              <div className="week-head">
                <span />
                <>{dates.map((date, index) => <button className={`week-day-header ${isSameDate(date,realToday) ? "active" : ""} ${index === selectedDay ? "selected-day" : ""}`} key={date.toISOString()} onClick={() => selectDate(date)} onDoubleClick={() => { selectDate(date); setView("Day"); }} aria-label={`${days[index]}: select day`}><span>{date.toLocaleDateString(undefined,{weekday:"short"})}</span><b>{date.getDate()}</b></button>)}</>
              </div>
              <div className="week-all-day">
                <span>All day</span>
                <div>{dates.map((date,index)=><div key={date.toISOString()} onDragOver={event=>event.preventDefault()} onDrop={event=>toAllDay(event,index)}>{allDayEvents.filter(event=>event.weekDay===index).map(event=><button draggable className="calendar-all-day" key={event.id} onDragStart={drag=>dragEvent(drag,event)} onClick={()=>setDraft({...event})}>{event.title}</button>)}{allDayTasks.filter(task=>task.day===index).map(task=><button className="calendar-all-day calendar-task" key={`task-${task.id}`} onClick={()=>openTask(task.id)}>{task.title}</button>)}</div>)}</div>
              </div>
              <div className="week-body">
                <div className="times">{dayTimes.map(t => <time dateTime={t} key={t}>{t}</time>)}</div>
                <div className="week-grid">{dates.map((date,index)=><div className="week-day-column" key={date.toISOString()} style={{touchAction:'pan-y'}} onDragOver={event=>event.preventDefault()} onDrop={event=>toTimed(event,index)} onPointerDown={event=>beginSlot(event,index)} onPointerUp={event=>finishSlot(event,index)} onClick={()=>!dragging&&selectDate(date)} onDoubleClick={()=>{selectDate(date);setView("Day")}}>{index===todayColumn&&<span className="calendar-now" style={{top:nowTop}} aria-label="Current time"/>}{overlapLayout(timedEvents.filter(event=>event.weekDay===index).map(event=>({...event,start:minutesAt(event.startAt!),end:minutesAt(event.endAt!)}))).map(event=><button draggable className={`calendar-event ${event.active?"active":""} ${draft?.id===event.id?"selected":""}`} style={{top:event.start,height:Math.max(15,event.end-event.start),left:`calc(${event.lane/event.lanes*100}% + 4px)`,right:`calc(${(event.lanes-event.lane-1)/event.lanes*100}% + 4px)`}} key={`${event.id}-${event.originalStartAt||event.startAt}`} onDragStart={drag=>dragEvent(drag,event)} onPointerDown={click=>{if(click.pointerType==="touch"){const t=setTimeout(()=>{moveItem(click,event,"event",index);navigator.vibrate?.(10)},250);longPressTimer.current=t;const clear=()=>{clearTimeout(t);removeEventListener("pointerup",clear);removeEventListener("pointermove",clear)};addEventListener("pointerup",clear);addEventListener("pointermove",clear)}else moveItem(click,event,"event",index)}} onKeyDown={key=>keyMove(key,event)}><time>{formatTimeRange(event.startAt,event.endAt,event.time,event.timezone)}</time><strong>{event.title}</strong><span className="calendar-resize" aria-label={`Resize ${event.title}`} role="separator" onPointerDown={click=>resizeEvent(click,event,index)} /></button>)}{timedTaskItems.filter(task=>task.day===index).map(task=><button className="calendar-event calendar-task" style={{top:task.top,height:task.height}} key={`task-${task.id}`} onPointerDown={click=>{if(click.pointerType==="touch"){const t=setTimeout(()=>{moveItem(click,task,"task",index);navigator.vibrate?.(10)},250);longPressTimer.current=t;const clear=()=>{clearTimeout(t);removeEventListener("pointerup",clear);removeEventListener("pointermove",clear)};addEventListener("pointerup",clear);addEventListener("pointermove",clear)}else moveItem(click,task,"task",index)}}><time>{formatTimeRange(task.scheduledStartAt,task.scheduledEndAt,task.time)}</time><strong>{task.title}</strong><small>Task</small></button>)}</div>)}</div>
              </div>
            </div>
          </section>
        )}

        {view === "Day" && (
          <section className="day-view">
            <div className="day-all-day">
              <span>All day</span>
              <div
                aria-label="All day items"
                onDragOver={event => event.preventDefault()}
                onDrop={event => toAllDay(event, selectedDay)}
              >
                {selectedEvents.filter(event => event.allDay).map(event => (
                  <button draggable className="calendar-all-day" key={event.id} onDragStart={drag => dragEvent(drag, event)} onClick={() => setDraft({...event})}>
                    {event.title}
                  </button>
                ))}
                {selectedTasks.filter(task => !task.scheduledStartAt).map(task => (
                  <button className="calendar-all-day calendar-task" key={`task-${task.id}`} onClick={() => openTask(task.id)}>
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="times">
              {dayTimes.map(t => (
                <time key={t}>{t}</time>
              ))}
            </div>
            <div
              aria-label="Day schedule"
              onDragOver={event => event.preventDefault()}
              onDrop={event => toTimed(event, selectedDay)}
              onClick={event => {
                const target = event.target as HTMLElement;
                if (target.closest("button")) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const start = withMinutes(activeSelectedDate, snapMinutes(Math.max(0, event.clientY - rect.top)));
                const end = new Date(start.getTime() + 3600000);
                setDraft({...blankEvent(), day: selectedDay, time: eventTime(start.toISOString()), startAt: start.toISOString(), endAt: end.toISOString()});
              }}
            >
              {isSameDate(now, activeSelectedDate) && <span className="calendar-now" style={{top: nowTop}} aria-label="Current time" />}
              {selectedEvents.filter(event => !event.allDay).map(event => (
                <button style={{top: dayPositionFor(event.time), height: event.height}} key={event.id} onClick={() => setDraft({...event})}>
                  <time dateTime={event.startAt || undefined}>{event.time}</time>
                  <strong>{event.title}</strong>
                  <small>{event.location}</small>
                </button>
              ))}
              {selectedTasks.filter(task => !!task.scheduledStartAt).map(task => (
                <button
                  className="calendar-task"
                  style={{top: dayPositionFor(task.time), height: 42}}
                  key={`task-${task.id}`}
                  onClick={() => openTask(task.id)}
                >
                  <time dateTime={task.scheduledStartAt || task.dueAt || undefined}>{task.time}</time>
                  <strong>{task.title}</strong>
                  <small>Task · {task.project}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === "Month" && (
          <div className="month-scroll"><section className="month-view">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <strong key={day}>{day}</strong>
            ))}
            {Array.from({length: monthGridTotal}, (_, index) => {
              const dateNum = index - firstDayOffset + 1;
              const isValidDate = dateNum > 0 && dateNum <= daysInMonth;
              const isTodayDate = isValidDate && dateNum === todayDateNum;

              const cellDate = isValidDate ? new Date(currentYear, currentMonth, dateNum) : null;
              const isSelected = !!cellDate && isSameDate(cellDate, activeSelectedDate);
              const cellTasks = cellDate
                ? allTasks.filter(task => isSameDate(task.scheduledStartAt || task.dueAt, cellDate))
                : [];
              const cellEvents = cellDate
                ? displayEvents.filter(event => coversDate(event.startAt, event.endAt, cellDate, event.day))
                : [];

              return (
                <button
                  className={`${isTodayDate ? "active" : ""} ${isValidDate && isSelected ? "selected-month-day" : ""}`}
                  key={index}
                  onClick={() => {
                    if (isValidDate) {
                      selectDate(cellDate!);
                    }
                  }}
                  onDoubleClick={() => {
                    if (cellDate) {
                      selectDate(cellDate);
                      setView("Day");
                    }
                  }}
                >
                  <span>{isValidDate ? dateNum : ""}</span>
                  {cellDate&&<span className="calendar-cell-add" role="button" tabIndex={0} aria-label={`Add event on ${cellDate.toLocaleDateString()}`} onClick={event=>{event.stopPropagation();setDraft({...blankEvent(),day:(cellDate.getDay()+6)%7,time:"09:00"})}}>+</span>}
                  {cellEvents.slice(0, 2).map(event => (
                    <small key={event.id}>
                      {event.title}
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
                      {task.title}
                    </small>
                  ))}
                  {cellDate&&(Math.max(0,cellEvents.length-2)+Math.max(0,cellTasks.length-2))>0&&(
                    <small className="month-more" role="button" tabIndex={0} aria-label={`${Math.max(0,cellEvents.length-2)+Math.max(0,cellTasks.length-2)} more items on ${cellDate.toLocaleDateString()}`} onClick={event=>{event.stopPropagation();selectDate(cellDate);setMoreDay(cellDate)}}>+{Math.max(0,cellEvents.length-2)+Math.max(0,cellTasks.length-2)} more</small>
                  )}
                </button>
              );
            })}
          </section></div>
        )}

        {view === "Agenda" && (
          <section className="mobile-agenda-view">
            {agenda.map(event => (
              <button key={event.id} onClick={() => setDraft({...event})}>
                <time dateTime={event.startAt || undefined}>{event.time}</time>
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.location || "No location"}</small>
                </span>
                <CaretRight />
              </button>
            ))}
            {taskAgenda.map(task => (
              <button key={`task-${task.id}`} onClick={() => openTask(task.id)}>
                <time dateTime={task.scheduledStartAt || task.dueAt || undefined}>{task.time}</time>
                <span>
                  <strong>{task.title}</strong>
                  <small>Task · {task.project}</small>
                </span>
                <CaretRight />
              </button>
            ))}
            {!agenda.length && !taskAgenda.length && (
              <p className="agenda-empty">Nothing scheduled for this day.</p>
            )}
          </section>
        )}

        {moreDay && (
          <div className="day-popover-backdrop" onClick={() => setMoreDay(null)}>
            <section className="day-popover" role="dialog" aria-modal="false" aria-label={`Full schedule for ${moreDay.toLocaleDateString()}`} onClick={event => event.stopPropagation()}>
              <header>
                <strong>{moreDay.toLocaleDateString(undefined, {weekday: "long", month: "long", day: "numeric"})}</strong>
                <button type="button" className="icon-button" aria-label="Close day details" onClick={() => setMoreDay(null)}><X /></button>
              </header>
              {displayEvents.filter(event => coversDate(event.startAt, event.endAt, moreDay, event.day)).map(event => (
                <button key={event.id} onClick={() => { setDraft({...event}); setMoreDay(null); }}>
                  <time>{formatTimeRange(event.startAt, event.endAt, event.time, event.timezone)}</time>
                  <span><strong>{event.title}</strong><small>{event.location || "Event"}</small></span>
                </button>
              ))}
              {allTasks.filter(task => isSameDate(task.scheduledStartAt || task.dueAt, moreDay)).map(task => (
                <button key={`task-${task.id}`} className="calendar-task" onClick={() => { openTask(task.id); setMoreDay(null); }}>
                  <time>{task.scheduledStartAt ? eventTime(task.scheduledStartAt) : "All day"}</time>
                  <span><strong>{task.title}</strong><small>Task · {task.project || "No project"}</small></span>
                </button>
              ))}
              {!displayEvents.some(event => coversDate(event.startAt, event.endAt, moreDay, event.day)) && !allTasks.some(task => isSameDate(task.scheduledStartAt || task.dueAt, moreDay)) && (
                <p className="agenda-empty">Nothing scheduled.</p>
              )}
              <footer>
                <button type="button" className="primary" onClick={() => { setDraft({...blankEvent(), day: (moreDay.getDay() + 6) % 7, time: "09:00"}); setMoreDay(null); }}>Add event</button>
              </footer>
            </section>
          </div>
        )}

        {undoToast && (
          <div className="undo-toast" role="status" aria-live="polite">
            <Check weight="bold" />
            <span>{undoToast.message}</span>
            <button type="button" onClick={undoToast.onUndo}>Undo</button>
            <button type="button" aria-label="Dismiss" onClick={() => setUndoToast(null)}><X /></button>
          </div>
        )}

        {draft ? (
          <aside className="object-inspector calendar-inspector" role="dialog" aria-labelledby="event-editor-title">
            <div className="object-inspector-head">
              <div>
                <span id="event-editor-title">{events.some(event => event.id === draft.id) ? "Edit event" : "New event"}</span>
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
                  onChange={e => {setDraft({...draft, title: e.target.value});if(eventTitleError)setEventTitleError("")}}
                  placeholder="Event name"
                  aria-invalid={!!eventTitleError}
                  aria-describedby={eventTitleError?"event-title-error":undefined}
                />
              </label>
              {eventTitleError&&<p className="field-error" id="event-title-error" role="alert">{eventTitleError}</p>}
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
                  Start time
                  <input
                    type="time"
                    value={draft.time}
                    disabled={draft.allDay}
                    onChange={e => setDraft({...draft, time: e.target.value})}
                  />
                </label>
              </div>
              <label>
                End time (optional)
                <input
                  type="time"
                  value={eventTime(draft.endAt)}
                  disabled={draft.allDay}
                  onChange={e => {
                    if (!e.target.value) return setDraft({...draft, endAt: undefined});
                    const end = new Date(dates[draft.day]);
                    end.setHours(Number(e.target.value.slice(0, 2)), Number(e.target.value.slice(3)), 0, 0);
                    setDraft({...draft, endAt: end.toISOString()});
                  }}
                />
              </label>
              <label className="check-field">
                <input type="checkbox" checked={!!draft.allDay} onChange={e => setDraft({...draft, allDay: e.target.checked})} />
                <span>All day</span>
              </label>
              <label>
                Repeat
                <select
                  value={draft.recurrence?.frequency || ""}
                  onChange={e => {
                    const value=e.target.value;
                    if(!value)return setDraft({...draft, recurrence: null});
                    if(value==="weekdays")return setDraft({...draft, recurrence:{frequency:"weekly",rules:["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]}});
                    setDraft({...draft, recurrence:{frequency:value}});
                  }}
                >
                  <option value="">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly on {draft.startAt?new Date(draft.startAt).toLocaleDateString(undefined,{weekday:"long"}):"…"}</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekdays">Every weekday (Mon–Fri)</option>
                </select>
              </label>
              {draft.recurrence?.frequency==="weekly"&&!draft.recurrence.rules&&(
                <label>
                  Repeat every
                  <select
                    value={draft.recurrence.interval||1}
                    onChange={e=>setDraft({...draft,recurrence:{...draft.recurrence,interval:Number(e.target.value)}})}
                  >
                    {[1,2,3,4].map(weeks=><option key={weeks} value={weeks}>{weeks===1?"Week":"Weeks"}{weeks>1?` (every ${weeks})`:""}</option>)}
                  </select>
                </label>
              )}
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
                  list="timezone-options"
                  value={draft.timezone || ""}
                  onChange={e => setDraft({...draft, timezone: e.target.value})}
                  required
                  aria-label="Time zone"
                />
                <datalist id="timezone-options">
                  {Intl.supportedValuesOf("timeZone").map(zone => <option key={zone} value={zone}/>)}
                </datalist>
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
                <div className="reminder-row">
                  <select
                    value=""
                    aria-label="Reminder offset preset"
                    onChange={e => {
                      if(!e.target.value||!draft.startAt)return;
                      setDraft({...draft, reminderAt: new Date(new Date(draft.startAt).getTime()-Number(e.target.value)*60000).toISOString()});
                    }}
                  >
                    <option value="">Minutes before…</option>
                    {[5,10,15,30,60,120,1440].map(minutes=><option key={minutes} value={minutes}>{minutes>=1440?"1 day before":`${minutes} minutes before`}</option>)}
                  </select>
                  <input
                    type="datetime-local"
                    value={reminderValue(draft.reminderAt)}
                    onChange={e => setDraft({...draft, reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null})}
                  />
                </div>
              </label>
              <div className="inspector-actions">
                {events.some(event => event.id === draft.id) && (
                  <button type="button" className="danger-button" onClick={async () => {
                    try {
                      const response = await fetch(`/api/v1/events/${draft.id}`, {
                        method: "DELETE",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({version: (draft as any).version})
                      });
                      if (!response.ok) throw new Error((await response.json()).error?.message || "Delete failed");
                      const deleted = {...draft};
                      setDraft(null);
                      setUndoToast({
                        message: `"${deleted.title}" deleted`,
                        onUndo: async () => {
                          try {
                            const resp = await fetch("/api/v1/events", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({title: deleted.title, day: deleted.day, time: deleted.time, startAt: deleted.startAt, endAt: deleted.endAt, allDay: deleted.allDay, timezone: deleted.timezone, location: deleted.location})});
                            if (resp.ok) setUndoToast(null);
                            else throw new Error("Restore failed");
                          } catch { setUndoToast({message: "Could not restore", onUndo: () => setUndoToast(null)}); }
                        }
                      });
                    } catch (reason) {
                      setSaveMessage((reason as Error).message);
                    }
                  }}>
                    Delete
                  </button>
                )}
                <button type="button" className="secondary" onClick={() => setDraft(null)}>
                  Cancel
                </button>
                <button className="primary calendar-primary-action">Save event</button>
              </div>
            </form>
          </aside>
        ) : hasSelectedItems ? (
          <aside className="agenda calendar-popover" aria-label="Selected date items">
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px"}}>
              <h3 style={{margin: 0}}>
                {activeSelectedDate.toLocaleDateString(undefined, {weekday: "long", month: "short", day: "numeric"})}
              </h3>
              {!isSameDate(activeSelectedDate, realToday) && (
                <button
                  className="secondary icon-button"
                  style={{fontSize: ".75rem", padding: "2px 8px"}}
                  onClick={() => {
                    selectDate(realToday);
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
          </aside>
        ) : null}
      </div>
      {scopeDraft&&<div className="calendar-scope" role="dialog" aria-modal="true" aria-labelledby="recurring-scope-title" onKeyDown={event=>event.key==="Escape"&&setScopeDraft(null)}><div><h2 id="recurring-scope-title">Update recurring event</h2><p>Which events should change?</p><button className="primary" autoFocus onClick={()=>void saveOccurrence(scopeDraft,"this")}>This event</button><button className="secondary" onClick={()=>void saveOccurrence(scopeDraft,"following")}>This and following</button><button className="secondary" onClick={()=>void saveOccurrence(scopeDraft,"all")}>All events</button><button className="secondary" onClick={()=>setScopeDraft(null)}>Cancel</button></div></div>}
      {saveMessage&&<p className="calendar-live" role="status">{saveMessage}</p>}
    </ModuleShell>
  );
}
