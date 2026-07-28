import {scheduleAutomations} from "./automations.mjs";
import {deliverPush} from "./push.mjs";
import {deliverReminders} from "./reminders.mjs";

export async function runScheduledWork(config,db){const now=new Date();deliverReminders(now,db);scheduleAutomations(now,db);return deliverPush(config,db)}
