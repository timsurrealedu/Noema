import {scheduleAutomations} from "./automations.mjs";
import {deliverPush} from "./push.mjs";
import {deliverReminders} from "./reminders.mjs";
import {syncVaults} from "./vaults.mjs";

export async function runScheduledWork(config,db){const now=new Date();deliverReminders(now,db);scheduleAutomations(now,db);syncVaults(now,db);return deliverPush(config,db)}
