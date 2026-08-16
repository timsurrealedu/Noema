import { randomUUID } from 'node:crypto';
import { deleteEvent, saveEvent } from './core.mjs';
import { getDatabase } from './db.mjs';
import { loadConfig } from './config.mjs';
import { tokenFor } from './google-calendar.mjs';

const now = () => new Date().toISOString(),
    snapshot = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !['token_enc'].includes(key))),
    midnight = (date, timezone) => {
        let value = Date.parse(`${date}T00:00:00Z`);
        for (let i = 0; i < 2; i++) {
            const parts = Object.fromEntries(
                    new Intl.DateTimeFormat('en-CA', {
                        timeZone: timezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hourCycle: 'h23',
                    })
                        .formatToParts(value)
                        .map((part) => [part.type, part.value]),
                ),
                shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
            value -= shown - Date.parse(`${date}T00:00:00Z`);
        }
        return new Date(value).toISOString();
    };
const normalized = (item, calendar) => {
    const allDay = !!item.start?.date,
        timezone = item.start?.timeZone || item.end?.timeZone || calendar.timezone || 'UTC',
        startAt = allDay ? midnight(item.start.date, timezone) : new Date(item.start?.dateTime).toISOString(),
        rawEnd = allDay ? midnight(item.end.date, timezone) : new Date(item.end?.dateTime).toISOString(),
        endAt = allDay && Date.parse(rawEnd) <= Date.parse(startAt) ? new Date(Date.parse(startAt) + 86400000).toISOString() : rawEnd;
    return {
        title: String(item.summary || 'Untitled event'),
        startAt,
        endAt,
        timezone,
        allDay,
        recurrence: item.recurrence ? { rules: item.recurrence } : null,
        location: item.location || null,
    };
};
const localInput = (row) => ({
        title: row.title,
        startAt: row.start_at,
        endAt: row.end_at,
        timezone: row.timezone,
        allDay: !!row.all_day,
        recurrence: row.recurrence_json ? JSON.parse(row.recurrence_json) : null,
        location: row.location || null,
    }),
    dateInZone = (value, timezone) => {
        const parts = Object.fromEntries(
            new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            })
                .formatToParts(new Date(value))
                .map((part) => [part.type, part.value]),
        );
        return `${parts.year}-${parts.month}-${parts.day}`;
    },
    googlePayload = (row) => {
        const recurrence = row.recurrence_json ? JSON.parse(row.recurrence_json) : null,
            rules = recurrence?.rules || (recurrence?.frequency ? [`RRULE:FREQ=${String(recurrence.frequency).toUpperCase()}`] : undefined),
            payload = {
                summary: row.title,
                location: row.location || undefined,
                recurrence: rules,
            };
        if (row.all_day) {
            payload.start = {
                date: dateInZone(row.start_at, row.timezone),
            };
            payload.end = {
                date: dateInZone(row.end_at, row.timezone),
            };
        } else {
            payload.start = {
                dateTime: row.start_at,
                timeZone: row.timezone,
            };
            payload.end = {
                dateTime: row.end_at,
                timeZone: row.timezone,
            };
        }
        return payload;
    };
function applyGoogleEvent(account, calendar, item, db, userId) {
    const mapping = db.prepare('SELECT * FROM calendar_event_mappings WHERE account_id=? AND calendar_id=? AND google_event_id=?').get(account.id, calendar.calendar_id, item.id),
        local = mapping && db.prepare('SELECT * FROM events WHERE id=?').get(mapping.local_event_id);
    if (mapping?.google_etag === item.etag) return 'unchanged';
    if (mapping && local && local.version !== mapping.last_local_version) {
        db.prepare('INSERT OR IGNORE INTO calendar_conflicts(id,mapping_id,local_snapshot_json,google_snapshot_json,google_etag,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(), mapping.id, JSON.stringify(snapshot(local)), JSON.stringify(item), item.etag || 'deleted', now());
        return 'conflict';
    }
    const time = now();
    if (item.status === 'cancelled') {
        if (mapping && local && !local.deleted_at) {
            const result = deleteEvent(local.id, local.version, db, userId, {
                skipCalendarSync: true,
            });
            db.prepare('UPDATE calendar_event_mappings SET google_etag=?,last_local_version=?,google_snapshot_json=?,tombstone=1,last_synced_at=? WHERE id=?').run(item.etag || null, result.version, JSON.stringify(item), time, mapping.id);
        }
        return mapping ? 'deleted' : 'unchanged';
    }
    const saved = saveEvent(
        {
            id: mapping?.local_event_id || randomUUID(),
            ...normalized(item, calendar),
            version: local?.version,
        },
        db,
        userId,
        { skipCalendarSync: true },
    );
    if (mapping) db.prepare('UPDATE calendar_event_mappings SET google_etag=?,last_local_version=?,google_snapshot_json=?,tombstone=0,last_synced_at=? WHERE id=?').run(item.etag || null, saved.version, JSON.stringify(item), time, mapping.id);
    else db.prepare('INSERT INTO calendar_event_mappings(id,account_id,calendar_id,local_event_id,google_event_id,google_etag,last_local_version,google_snapshot_json,last_synced_at) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(), account.id, calendar.calendar_id, saved.id, item.id, item.etag || null, saved.version, JSON.stringify(item), time);
    return mapping ? 'updated' : 'imported';
}
async function pullCalendar(account, calendar, access, db, fetcher, userId, recover = true) {
    const state = db.prepare('SELECT sync_token FROM google_calendar_sync WHERE account_id=? AND calendar_id=?').get(account.id, calendar.calendar_id),
        counts = {
            imported: 0,
            updated: 0,
            deleted: 0,
            conflict: 0,
            unchanged: 0,
        };
    let page = '',
        nextSync = '';
    do {
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.calendar_id)}/events`);
        url.searchParams.set('showDeleted', 'true');
        if (state?.sync_token) url.searchParams.set('syncToken', state.sync_token);
        if (page) url.searchParams.set('pageToken', page);
        const result = await fetcher(url, {
            headers: {
                Authorization: `Bearer ${access}`,
            },
        });
        if (result.status === 410 && state?.sync_token && recover) {
            db.prepare('DELETE FROM google_calendar_sync WHERE account_id=? AND calendar_id=?').run(account.id, calendar.calendar_id);
            return pullCalendar(account, calendar, access, db, fetcher, userId, false);
        }
        const data = await result.json();
        if (!result.ok)
            throw Object.assign(new Error(data.error?.message || 'Google Calendar sync failed'), {
                status: result.status === 429 ? 429 : 502,
            });
        for (const item of data.items || []) counts[applyGoogleEvent(account, calendar, item, db, userId)]++;
        page = data.nextPageToken || '';
        nextSync = data.nextSyncToken || nextSync;
    } while (page);
    if (!nextSync) throw new Error('Google Calendar did not return a sync token');
    db.prepare(`INSERT INTO google_calendar_sync(account_id,calendar_id,sync_token,last_synced_at,last_error) VALUES(?,?,?,?,NULL) ON CONFLICT(account_id,calendar_id) DO UPDATE SET sync_token=excluded.sync_token,last_synced_at=excluded.last_synced_at,last_error=NULL`).run(account.id, calendar.calendar_id, nextSync, now());
    return counts;
}
export async function pullGoogleCalendar(actor, config = loadConfig(), db = getDatabase(), fetcher = fetch) {
    const userId = typeof actor === 'object' ? actor.id : actor,
        workspaceId = typeof actor === 'object' ? actor.workspaceId || actor.workspace?.id || null : null;
    const account = db.prepare('SELECT * FROM google_accounts WHERE user_id=?').get(userId);
    if (!account) throw Object.assign(new Error('Google Calendar is not connected'), { status: 409 });
    const calendars = db.prepare('SELECT * FROM google_calendars WHERE account_id=? AND selected=1').all(account.id);
    if (!calendars.length) throw Object.assign(new Error('Select at least one Google calendar'), { status: 409 });
    const access = await tokenFor(account, config, db, fetcher),
        total = {
            imported: 0,
            updated: 0,
            deleted: 0,
            conflict: 0,
            unchanged: 0,
        };
    for (const calendar of calendars) {
        try {
            const counts = await pullCalendar(account, calendar, access, db, fetcher, { id: userId, workspaceId });
            for (const key of Object.keys(total)) total[key] += counts[key];
        } catch (error) {
            db.prepare(`INSERT INTO google_calendar_sync(account_id,calendar_id,last_error) VALUES(?,?,?) ON CONFLICT(account_id,calendar_id) DO UPDATE SET last_error=excluded.last_error`).run(account.id, calendar.calendar_id, String(error.message).slice(0, 500));
            throw error;
        }
    }
    return total;
}
function claimWrite(db) {
    db.exec('BEGIN IMMEDIATE');
    try {
        const row = db.prepare("SELECT * FROM calendar_sync_writes WHERE state IN ('pending','retry') AND next_attempt_at<=? ORDER BY created_at LIMIT 1").get(now());
        if (row) db.prepare("UPDATE calendar_sync_writes SET state='processing',attempts=attempts+1,updated_at=? WHERE id=?").run(now(), row.id);
        db.exec('COMMIT');
        return row;
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}
async function remoteSnapshot(access, mapping, fetcher) {
    const result = await fetcher(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id)}/events/${encodeURIComponent(mapping.google_event_id)}`, {
        headers: {
            Authorization: `Bearer ${access}`,
        },
    });
    return result.ok
        ? result.json()
        : {
              id: mapping.google_event_id,
              etag: mapping.google_etag,
              status: 'cancelled',
          };
}
export async function pushGoogleCalendar(userId, config = loadConfig(), db = getDatabase(), fetcher = fetch, limit = 50) {
    const account = db.prepare('SELECT * FROM google_accounts WHERE user_id=?').get(userId);
    if (!account) throw Object.assign(new Error('Google Calendar is not connected'), { status: 409 });
    const access = await tokenFor(account, config, db, fetcher),
        counts = {
            completed: 0,
            retried: 0,
            conflict: 0,
        };
    for (let i = 0; i < limit; i++) {
        const write = claimWrite(db);
        if (!write) break;
        const mapping = db.prepare('SELECT * FROM calendar_event_mappings WHERE id=? AND account_id=?').get(write.mapping_id, account.id),
            row = mapping && db.prepare('SELECT * FROM events WHERE id=?').get(mapping.local_event_id);
        if (!mapping || !row) {
            db.prepare("UPDATE calendar_sync_writes SET state='failed',last_error='Mapped event is missing',updated_at=? WHERE id=?").run(now(), write.id);
            continue;
        }
        const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id)}/events`,
            occurrence = write.operation === 'instance' ? JSON.parse(write.payload_json) : null;
        let instance;
        if (occurrence) {
            const response = await fetcher(`${base}/${encodeURIComponent(mapping.google_event_id)}/instances`, { headers: { Authorization: `Bearer ${access}` } });
            if (!response.ok) { db.prepare("UPDATE calendar_sync_writes SET state='retry',next_attempt_at=?,last_error=?,updated_at=? WHERE id=?").run(new Date(Date.now()+60000).toISOString(),`Could not load Google instances (${response.status})`,now(),write.id);counts.retried++;continue; }
            instance = (await response.json()).items?.find(item => new Date(item.originalStartTime?.dateTime || `${item.originalStartTime?.date}T00:00:00Z`).toISOString() === occurrence.originalStartAt);
            if (!instance) { db.prepare("UPDATE calendar_sync_writes SET state='failed',last_error='Google instance is missing',updated_at=? WHERE id=?").run(now(),write.id);continue; }
        }
        const url = write.operation === 'create' ? base : `${base}/${encodeURIComponent(occurrence ? instance.id : mapping.google_event_id)}`,
            headers = {
                Authorization: `Bearer ${access}`,
                'Content-Type': 'application/json',
                ...((occurrence ? instance.etag : mapping.google_etag) && write.operation !== 'create'
                    ? {
                          'If-Match': occurrence ? instance.etag : mapping.google_etag,
                      }
                    : {}),
            },
            result = await fetcher(url, {
                method: write.operation === 'create' ? 'POST' : write.operation === 'delete' ? 'DELETE' : occurrence ? 'PUT' : 'PATCH',
                headers,
                body:
                    write.operation === 'delete'
                        ? undefined
                        : JSON.stringify({
                              ...googlePayload(occurrence ? {...row,start_at:occurrence.startAt,end_at:occurrence.endAt,all_day:occurrence.allDay?1:0} : row),
                              ...(write.operation === 'create'
                                  ? {
                                        id: mapping.google_event_id,
                                    }
                                  : {}),
                          }),
            });
        if (result.status === 429 || result.status >= 500) {
            const delay = Math.min(3600, 2 ** Math.min(write.attempts + 1, 10)),
                error = `Google Calendar returned ${result.status}`;
            db.prepare("UPDATE calendar_sync_writes SET state='retry',next_attempt_at=?,last_error=?,updated_at=? WHERE id=?").run(new Date(Date.now() + delay * 1000).toISOString(), error, now(), write.id);
            counts.retried++;
            continue;
        }
        if (result.status === 412) {
            const google = await remoteSnapshot(access, mapping, fetcher);
            db.prepare('INSERT OR IGNORE INTO calendar_conflicts(id,mapping_id,local_snapshot_json,google_snapshot_json,google_etag,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(), mapping.id, JSON.stringify(snapshot(row)), JSON.stringify(google), google.etag || 'deleted', now());
            db.prepare("UPDATE calendar_sync_writes SET state='conflict',last_error='Google event changed',updated_at=? WHERE id=?").run(now(), write.id);
            counts.conflict++;
            continue;
        }
        let remote;
        if (result.status === 409 && write.operation === 'create') remote = await remoteSnapshot(access, mapping, fetcher);
        else if (!result.ok) {
            db.prepare("UPDATE calendar_sync_writes SET state='failed',last_error=?,updated_at=? WHERE id=?").run(`Google Calendar returned ${result.status}`, now(), write.id);
            continue;
        } else
            remote =
                result.status === 204
                    ? {
                          id: mapping.google_event_id,
                          etag: mapping.google_etag,
                          status: 'cancelled',
                      }
                    : await result.json();
        if (occurrence) db.prepare("UPDATE event_occurrences SET google_event_id=?,google_etag=?,updated_at=? WHERE event_id=? AND original_start_at=?").run(remote.id,remote.etag,now(),row.id,occurrence.originalStartAt);
        else db.prepare('UPDATE calendar_event_mappings SET google_event_id=?,google_etag=?,last_local_version=?,google_snapshot_json=?,tombstone=?,last_synced_at=? WHERE id=?').run(remote.id || mapping.google_event_id, remote.etag || mapping.google_etag, write.local_version, JSON.stringify(remote), write.operation === 'delete' ? 1 : 0, now(), mapping.id);
        db.prepare("UPDATE calendar_sync_writes SET state='completed',last_error=NULL,updated_at=? WHERE id=?").run(now(), write.id);
        counts.completed++;
    }
    return counts;
}
export function resolveCalendarConflict(userId, id, choice, db = getDatabase()) {
    if (!['local', 'google', 'duplicate'].includes(choice)) throw new Error('choice must be local, google, or duplicate');
    const conflict = db.prepare("SELECT m.*,f.*,c.timezone AS calendar_timezone,a.user_id FROM calendar_conflicts f JOIN calendar_event_mappings m ON m.id=f.mapping_id JOIN google_calendars c ON c.account_id=m.account_id AND c.calendar_id=m.calendar_id JOIN google_accounts a ON a.id=m.account_id WHERE f.id=? AND f.state='pending' AND a.user_id=?").get(id, userId);
    if (!conflict) throw Object.assign(new Error('Calendar conflict not found'), { status: 404 });
    const local = db.prepare('SELECT * FROM events WHERE id=?').get(conflict.local_event_id),
        google = JSON.parse(conflict.google_snapshot_json),
        time = now();
    db.exec('BEGIN IMMEDIATE');
    try {
        if (choice === 'local') {
            db.prepare('UPDATE calendar_event_mappings SET google_etag=?,google_snapshot_json=? WHERE id=?').run(conflict.google_etag, conflict.google_snapshot_json, conflict.mapping_id);
            db.prepare("UPDATE calendar_sync_writes SET state='pending',next_attempt_at=?,updated_at=? WHERE mapping_id=? AND local_version=?").run(time, time, conflict.mapping_id, local.version);
            if (!db.prepare('SELECT 1 FROM calendar_sync_writes WHERE mapping_id=? AND local_version=?').get(conflict.mapping_id, local.version)) {
                db.prepare('INSERT INTO calendar_sync_writes(id,mapping_id,operation,payload_json,local_version,next_attempt_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), conflict.mapping_id, 'update', JSON.stringify(local), local.version, time, time, time);
            }
        } else {
            if (choice === 'duplicate')
                saveEvent(
                    {
                        ...localInput(local),
                        googleCalendarId: conflict.calendar_id,
                    },
                    db,
                    userId,
                );
            db.prepare("UPDATE calendar_sync_writes SET state='superseded',updated_at=? WHERE mapping_id=? AND state!='completed'").run(time, conflict.mapping_id);
            if (google.status === 'cancelled') {
                const result = local.deleted_at
                    ? {
                          version: local.version,
                      }
                    : deleteEvent(local.id, local.version, db, userId, {
                          skipCalendarSync: true,
                      });
                db.prepare('UPDATE calendar_event_mappings SET google_etag=?,last_local_version=?,google_snapshot_json=?,tombstone=1,last_synced_at=? WHERE id=?').run(conflict.google_etag, result.version, conflict.google_snapshot_json, time, conflict.mapping_id);
            } else {
                const saved = saveEvent(
                    {
                        id: local.id,
                        ...normalized(google, {
                            timezone: conflict.calendar_timezone,
                        }),
                        version: local.version,
                    },
                    db,
                    userId,
                    {
                        skipCalendarSync: true,
                    },
                );
                db.prepare('UPDATE calendar_event_mappings SET google_etag=?,last_local_version=?,google_snapshot_json=?,tombstone=0,last_synced_at=? WHERE id=?').run(conflict.google_etag, saved.version, conflict.google_snapshot_json, time, conflict.mapping_id);
            }
        }
        db.prepare('UPDATE calendar_conflicts SET state=?,resolved_at=? WHERE id=?').run(`resolved-${choice}`, time, id);
        db.prepare('INSERT INTO audit_events(id,actor_id,action,object_type,object_id,summary,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), userId, 'resolve', 'calendar-conflict', id, `Kept ${choice} calendar version`, time);
        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
    return { ok: true, choice };
}
export function calendarSyncStatus(userId, db = getDatabase()) {
    return {
        calendars: db.prepare('SELECT c.calendar_id AS id,c.name,s.last_synced_at AS lastSyncedAt,s.last_error AS lastError FROM google_calendars c JOIN google_accounts a ON a.id=c.account_id LEFT JOIN google_calendar_sync s ON s.account_id=c.account_id AND s.calendar_id=c.calendar_id WHERE a.user_id=? AND c.selected=1 ORDER BY c.name').all(userId),
        writes: db.prepare("SELECT w.id,w.operation,w.state,w.attempts,w.next_attempt_at AS nextAttemptAt,w.last_error AS lastError,m.local_event_id AS localEventId FROM calendar_sync_writes w JOIN calendar_event_mappings m ON m.id=w.mapping_id JOIN google_accounts a ON a.id=m.account_id WHERE a.user_id=? AND w.state NOT IN ('completed','superseded') ORDER BY w.created_at").all(userId),
        conflicts: db
            .prepare("SELECT f.id,f.mapping_id AS mappingId,f.local_snapshot_json AS localSnapshot,f.google_snapshot_json AS googleSnapshot,f.created_at AS createdAt FROM calendar_conflicts f JOIN calendar_event_mappings m ON m.id=f.mapping_id JOIN google_accounts a ON a.id=m.account_id WHERE a.user_id=? AND f.state='pending' ORDER BY f.created_at")
            .all(userId)
            .map((row) => ({
                ...row,
                localSnapshot: JSON.parse(row.localSnapshot),
                googleSnapshot: JSON.parse(row.googleSnapshot),
            })),
    };
}
