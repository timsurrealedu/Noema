import {DatabaseSync} from "node:sqlite";
import {ensureDataDirs,loadConfig} from "./config.mjs";

let singleton;

const schema=`
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT UNIQUE NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT,device TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS captures(id TEXT PRIMARY KEY,text TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL,source_label TEXT NOT NULL,objects_json TEXT NOT NULL DEFAULT '[]',error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,title TEXT NOT NULL,project TEXT NOT NULL,due TEXT NOT NULL,priority TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,recurrence TEXT,subtasks_json TEXT NOT NULL DEFAULT '[]',archived INTEGER NOT NULL DEFAULT 0,reminder_at TEXT,reminder_sent_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,title TEXT NOT NULL,day INTEGER NOT NULL,time TEXT NOT NULL,top REAL NOT NULL,height REAL NOT NULL,location TEXT,active INTEGER NOT NULL DEFAULT 0,reminder_at TEXT,reminder_sent_at TEXT,start_at TEXT,end_at TEXT,timezone TEXT,all_day INTEGER NOT NULL DEFAULT 0,recurrence_json TEXT,deleted_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,title TEXT NOT NULL,excerpt TEXT NOT NULL,content TEXT NOT NULL,tags_json TEXT NOT NULL DEFAULT '[]',ai INTEGER NOT NULL DEFAULT 0,draft INTEGER NOT NULL DEFAULT 0,source TEXT,favorite INTEGER NOT NULL DEFAULT 0,trashed INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id UNINDEXED,title,content,tags);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,state TEXT NOT NULL,input_json TEXT NOT NULL,result_json TEXT,error TEXT,lease_until TEXT,cancel_requested INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS job_events(id INTEGER PRIMARY KEY AUTOINCREMENT,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,type TEXT NOT NULL,data_json TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,actor_id TEXT,action TEXT NOT NULL,object_type TEXT NOT NULL,object_id TEXT NOT NULL,summary TEXT NOT NULL,inverse_json TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS idempotency_keys(actor_id TEXT NOT NULL,key TEXT NOT NULL,request_hash TEXT NOT NULL,response_json TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(actor_id,key));
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,sha256 TEXT UNIQUE NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS capture_assets(capture_id TEXT NOT NULL REFERENCES captures(id) ON DELETE CASCADE,asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,PRIMARY KEY(capture_id,asset_id));
CREATE TABLE IF NOT EXISTS login_attempts(key TEXT NOT NULL,attempted_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS totp_uses(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,counter INTEGER NOT NULL,used_at TEXT NOT NULL,PRIMARY KEY(user_id,counter));
CREATE TABLE IF NOT EXISTS recovery_codes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,created_at TEXT NOT NULL,used_at TEXT);
CREATE TABLE IF NOT EXISTS user_settings(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,profile_json TEXT NOT NULL DEFAULT '{}',preferences_json TEXT NOT NULL DEFAULT '{}',notifications_json TEXT NOT NULL DEFAULT '{}',agent_permissions_json TEXT NOT NULL DEFAULT '{}',calendar_json TEXT NOT NULL DEFAULT '{}',backup_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,mfa_verified_at TEXT NOT NULL,action_type TEXT NOT NULL,action_hash TEXT NOT NULL,risk TEXT NOT NULL,details_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',expires_at TEXT NOT NULL,approved_at TEXT,consumed_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS project_links(project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,object_type TEXT NOT NULL,object_id TEXT NOT NULL,label TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,PRIMARY KEY(project_id,object_type,object_id));
CREATE TABLE IF NOT EXISTS project_milestones(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,title TEXT NOT NULL,due_at TEXT,status TEXT NOT NULL DEFAULT 'planned',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS project_blockers(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,title TEXT NOT NULL,resolved_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recommendations(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,context_type TEXT NOT NULL,context_id TEXT NOT NULL,proposal_json TEXT NOT NULL,sources_json TEXT NOT NULL,provider TEXT NOT NULL,provenance_json TEXT NOT NULL,feedback TEXT,disposition TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,applied_at TEXT);
CREATE TABLE IF NOT EXISTS pdf_annotations(id TEXT PRIMARY KEY,asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,page INTEGER NOT NULL,kind TEXT NOT NULL,geometry_json TEXT NOT NULL,content TEXT NOT NULL DEFAULT '',color TEXT NOT NULL DEFAULT '#f5d90a',comment TEXT NOT NULL DEFAULT '',link_type TEXT,link_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS notification_deliveries(id TEXT PRIMARY KEY,notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,lease_until TEXT,provider_status INTEGER,provider_response TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(notification_id,subscription_id));
CREATE TABLE IF NOT EXISTS google_accounts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,email TEXT NOT NULL,token_enc TEXT NOT NULL,scopes_json TEXT NOT NULL,expires_at TEXT NOT NULL,health TEXT NOT NULL DEFAULT 'connected',last_error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS google_oauth_states(state TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS google_calendars(account_id TEXT NOT NULL REFERENCES google_accounts(id) ON DELETE CASCADE,calendar_id TEXT NOT NULL,name TEXT NOT NULL,timezone TEXT,access_role TEXT NOT NULL,selected INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(account_id,calendar_id));
CREATE TABLE IF NOT EXISTS google_calendar_sync(account_id TEXT NOT NULL,calendar_id TEXT NOT NULL,sync_token TEXT,last_synced_at TEXT,last_error TEXT,PRIMARY KEY(account_id,calendar_id),FOREIGN KEY(account_id,calendar_id) REFERENCES google_calendars(account_id,calendar_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS calendar_event_mappings(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,calendar_id TEXT NOT NULL,local_event_id TEXT NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,google_event_id TEXT NOT NULL,google_etag TEXT,last_local_version INTEGER NOT NULL,google_snapshot_json TEXT NOT NULL,tombstone INTEGER NOT NULL DEFAULT 0,last_synced_at TEXT NOT NULL,UNIQUE(account_id,calendar_id,google_event_id),FOREIGN KEY(account_id,calendar_id) REFERENCES google_calendars(account_id,calendar_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS calendar_conflicts(id TEXT PRIMARY KEY,mapping_id TEXT NOT NULL REFERENCES calendar_event_mappings(id) ON DELETE CASCADE,local_snapshot_json TEXT NOT NULL,google_snapshot_json TEXT NOT NULL,google_etag TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,resolved_at TEXT,UNIQUE(mapping_id,google_etag));
CREATE TABLE IF NOT EXISTS calendar_sync_writes(id TEXT PRIMARY KEY,mapping_id TEXT NOT NULL REFERENCES calendar_event_mappings(id) ON DELETE CASCADE,operation TEXT NOT NULL,payload_json TEXT NOT NULL,local_version INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,last_error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(mapping_id,operation,local_version));
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Active',summary TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS task_dependencies(task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,created_at TEXT NOT NULL,PRIMARY KEY(task_id,depends_on_task_id));
CREATE TABLE IF NOT EXISTS note_links(source_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,target_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,link_text TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(source_note_id,target_note_id,link_text));
CREATE TABLE IF NOT EXISTS note_versions(note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,version INTEGER NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,tags_json TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(note_id,version));
CREATE TABLE IF NOT EXISTS courses(id TEXT PRIMARY KEY,code TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,term TEXT NOT NULL DEFAULT '',color TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS assignments(id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,title TEXT NOT NULL,due_at TEXT,status TEXT NOT NULL DEFAULT 'todo',score REAL,source TEXT,external_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,UNIQUE(source,external_id));
CREATE TABLE IF NOT EXISTS study_cards(id TEXT PRIMARY KEY,course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,front TEXT NOT NULL,back TEXT NOT NULL,due_at TEXT NOT NULL,interval_days INTEGER NOT NULL DEFAULT 0,ease REAL NOT NULL DEFAULT 2.5,repetitions INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS card_reviews(id TEXT PRIMARY KEY,card_id TEXT NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,rating INTEGER NOT NULL,reviewed_at TEXT NOT NULL,next_due_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY,course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,title TEXT NOT NULL,questions_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS quiz_attempts(id TEXT PRIMARY KEY,quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,answers_json TEXT NOT NULL,score REAL NOT NULL,submitted_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',read_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions(id TEXT PRIMARY KEY,endpoint TEXT UNIQUE NOT NULL,keys_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS automations(id TEXT PRIMARY KEY,name TEXT NOT NULL,trigger_kind TEXT NOT NULL,schedule TEXT,action_kind TEXT NOT NULL,config_json TEXT NOT NULL DEFAULT '{}',enabled INTEGER NOT NULL DEFAULT 1,last_run_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS automation_runs(id TEXT PRIMARY KEY,automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,state TEXT NOT NULL,started_at TEXT NOT NULL,finished_at TEXT,output_json TEXT,error TEXT);
CREATE TABLE IF NOT EXISTS automation_run_steps(id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,position INTEGER NOT NULL,kind TEXT NOT NULL,config_json TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',output_json TEXT,error TEXT,started_at TEXT,finished_at TEXT,UNIQUE(run_id,position));
CREATE TABLE IF NOT EXISTS knowledge_nodes(id TEXT PRIMARY KEY,object_type TEXT NOT NULL,object_id TEXT NOT NULL,label TEXT NOT NULL,href TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(object_type,object_id));
CREATE TABLE IF NOT EXISTS knowledge_edges(id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,target_id TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,kind TEXT NOT NULL,provenance TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(source_id,target_id,kind,provenance));
CREATE TABLE IF NOT EXISTS note_optimizations(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,mode TEXT NOT NULL,state TEXT NOT NULL,before_content TEXT NOT NULL,after_content TEXT,summary TEXT,provider TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,applied_at TEXT);
CREATE TABLE IF NOT EXISTS tutor_sessions(id TEXT PRIMARY KEY,kind TEXT NOT NULL,subject_id TEXT,subject_title TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tutor_messages(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,citations_json TEXT NOT NULL DEFAULT '[]',replacement TEXT,provider TEXT,inserted_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,inserted_note_version INTEGER,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS analytics_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,enabled INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS analytics_events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event TEXT NOT NULL,properties_json TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts(key,attempted_at);
CREATE INDEX IF NOT EXISTS sessions_token ON sessions(token_hash,expires_at);
CREATE INDEX IF NOT EXISTS jobs_claim ON jobs(state,created_at);
CREATE INDEX IF NOT EXISTS job_events_job ON job_events(job_id,id);
CREATE INDEX IF NOT EXISTS projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS task_dependencies_depends ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS note_links_target ON note_links(target_note_id);
CREATE INDEX IF NOT EXISTS note_versions_note ON note_versions(note_id,version DESC);
CREATE INDEX IF NOT EXISTS assignments_course_due ON assignments(course_id,due_at);
CREATE INDEX IF NOT EXISTS study_cards_due ON study_cards(due_at);
CREATE INDEX IF NOT EXISTS quiz_attempts_quiz ON quiz_attempts(quiz_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread ON notifications(read_at,created_at);
CREATE INDEX IF NOT EXISTS automations_enabled ON automations(enabled,trigger_kind);
CREATE INDEX IF NOT EXISTS automation_runs_automation ON automation_runs(automation_id,started_at DESC);
CREATE INDEX IF NOT EXISTS automation_run_steps_run ON automation_run_steps(run_id,position);
CREATE INDEX IF NOT EXISTS knowledge_nodes_type ON knowledge_nodes(object_type,label);
CREATE INDEX IF NOT EXISTS knowledge_edges_source ON knowledge_edges(source_id);
CREATE INDEX IF NOT EXISTS knowledge_edges_target ON knowledge_edges(target_id);
CREATE INDEX IF NOT EXISTS note_optimizations_note ON note_optimizations(note_id,created_at DESC);
CREATE INDEX IF NOT EXISTS tutor_sessions_subject ON tutor_sessions(kind,subject_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS tutor_messages_session ON tutor_messages(session_id,created_at);
CREATE INDEX IF NOT EXISTS analytics_events_user_created ON analytics_events(user_id,created_at);
CREATE INDEX IF NOT EXISTS google_oauth_states_expiry ON google_oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS calendar_conflicts_state ON calendar_conflicts(state,created_at);
CREATE INDEX IF NOT EXISTS calendar_sync_writes_due ON calendar_sync_writes(state,next_attempt_at);
`;

export function openDatabase(path){
  const db=new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;");
  db.exec(schema);
  ensureColumn(db,"jobs","attempts","INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db,"jobs","max_attempts","INTEGER NOT NULL DEFAULT 3");
  ensureColumn(db,"sessions","mfa_verified_at","TEXT");
  ensureColumn(db,"users","totp_secret_enc","TEXT");
  ensureColumn(db,"users","totp_pending_enc","TEXT");
  ensureColumn(db,"users","totp_pending_at","TEXT");
  ensureColumn(db,"users","totp_env_disabled","INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db,"tasks","reminder_at","TEXT");
  ensureColumn(db,"tasks","reminder_sent_at","TEXT");
  ensureColumn(db,"events","reminder_at","TEXT");
  ensureColumn(db,"events","reminder_sent_at","TEXT");
  ensureColumn(db,"events","start_at","TEXT");
  ensureColumn(db,"events","end_at","TEXT");
  ensureColumn(db,"events","timezone","TEXT");
  ensureColumn(db,"events","all_day","INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db,"events","recurrence_json","TEXT");
  ensureColumn(db,"events","deleted_at","TEXT");
  ensureColumn(db,"notes","draft","INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db,"notifications","related_type","TEXT");
  ensureColumn(db,"notifications","related_id","TEXT");
  ensureColumn(db,"automation_runs","job_id","TEXT REFERENCES jobs(id) ON DELETE SET NULL");
  db.exec("CREATE INDEX IF NOT EXISTS tasks_reminders ON tasks(reminder_at,reminder_sent_at); CREATE INDEX IF NOT EXISTS events_reminders ON events(reminder_at,reminder_sent_at);");
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(1,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(2,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(3,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(4,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(5,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(6,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(7,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(8,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(9,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(10,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(11,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(12,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(13,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(14,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(15,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(16,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(17,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(18,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(19,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(20,?)").run(new Date().toISOString());
  migrateLegacyEvents(db);
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(21,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(22,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(23,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(24,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(25,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(26,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(27,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(28,?)").run(new Date().toISOString());
  return db;
}

function ensureColumn(db,table,column,definition){if(!db.prepare(`PRAGMA table_info(${table})`).all().some(info=>info.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)}
function migrateLegacyEvents(db){const update=db.prepare("UPDATE events SET start_at=?,end_at=?,timezone='UTC' WHERE id=?");for(const row of db.prepare("SELECT id,day,time,height,created_at FROM events WHERE start_at IS NULL").all()){const base=new Date(row.created_at),monday=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate()-((base.getUTCDay()+6)%7))),[hour,minute]=row.time.split(":").map(Number),start=new Date(monday);start.setUTCDate(start.getUTCDate()+row.day);start.setUTCHours(hour||0,minute||0,0,0);const end=new Date(start.getTime()+Math.max(15,Math.round(row.height/0.85))*60000);update.run(start.toISOString(),end.toISOString(),row.id)}}

export function getDatabase(config=loadConfig()){
  if(!singleton){ensureDataDirs(config);singleton=openDatabase(config.dbPath)}
  return singleton;
}

export function closeDatabase(){singleton?.close();singleton=undefined}
