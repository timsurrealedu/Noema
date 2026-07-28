import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("plugin marketplace retains its frozen security boundary",()=>{const page=read("app/plugins/page.tsx"),service=read("server/plugins.mjs");for(const value of [/Inspect source/,/plugin\.install/,/plugin\.enable/,/plugin\.uninstall/,/plugin\.run/,/NOEMA_PLUGIN_CATALOGS/])assert.match(page,value);for(const value of [/packageIntegrity/,/Plugin packages cannot contain symbolic links/,/--unshare-all/,/PLUGIN_PERMISSION_DENIED/,/BEGIN IMMEDIATE/])assert.match(service,value)});
test("collaboration retains its frozen security boundary",()=>{const page=read("app/collaboration/page.tsx"),join=read("app/join/page.tsx"),service=read("server/collaboration.mjs");for(const value of [/\/api\/v1\/workspaces/,/Live presence/,/Recoverable conflicts/,/One-time invitation link/])assert.match(page,value);assert.match(join,/\/api\/v1\/auth\/invite/);for(const value of [/INVITATION_UNAVAILABLE/,/WORKSPACE_ROLE_REQUIRED/,/workspace_comments/,/workspace_presence/,/workspace_conflicts/])assert.match(service,value)});
test("dashboard retains its frozen editor behavior",()=>{const page=read("app/dashboards/page.tsx");assert.match(page,/\/api\/v1\/dashboards/);for(const label of ["Move dashboard left","Add widget","Save layout","Duplicate","Delete","Narrower","Wider","Shorter","Taller"])assert.match(page,new RegExp(label));assert.match(page,/gridColumn/)});
