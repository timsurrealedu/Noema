import {scheduleAutomations} from "./automations.mjs";
import {deliverPush} from "./push.mjs";
import {deliverReminders} from "./reminders.mjs";
import {syncVaults} from "./vaults.mjs";
import {syncGoogleCalendars} from "./google-sync.mjs";

export async function runScheduledWork(config,db){const now=new Date();deliverReminders(now,db);scheduleAutomations(now,db);syncVaults(now,db);await syncGoogleCalendars(now,db,config);return deliverPush(config,db)}
