import {DatabaseSync} from "node:sqlite";
import {ensureDataDirs,loadConfig} from "./config.mjs";

let singleton;

const schema=`
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT UNIQUE NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT,device TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS captures(id TEXT PRIMARY KEY,text TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL,source_label TEXT NOT NULL,objects_json TEXT NOT NULL DEFAULT '[]',error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,title TEXT NOT NULL,project TEXT NOT NULL,due TEXT NOT NULL,priority TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,recurrence TEXT,subtasks_json TEXT NOT NULL DEFAULT '[]',archived INTEGER NOT NULL DEFAULT 0,reminder_at TEXT,reminder_sent_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,title TEXT NOT NULL,day INTEGER NOT NULL,time TEXT NOT NULL,top REAL NOT NULL,height REAL NOT NULL,location TEXT,active INTEGER NOT NULL DEFAULT 0,reminder_at TEXT,reminder_sent_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
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
CREATE TABLE IF NOT EXISTS note_optimizations(id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,mode TEXT NOT NULL,state TEXT NOT NULL,before_content TEXT NOT NULL,after_content TEXT,summary TEXT,provider TEXT,error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,applied_at TEXT);
CREATE TABLE IF NOT EXISTS tutor_sessions(id TEXT PRIMARY KEY,kind TEXT NOT NULL,subject_id TEXT,subject_title TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tutor_messages(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,citations_json TEXT NOT NULL DEFAULT '[]',replacement TEXT,provider TEXT,inserted_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,inserted_note_version INTEGER,created_at TEXT NOT NULL);
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
CREATE INDEX IF NOT EXISTS note_optimizations_note ON note_optimizations(note_id,created_at DESC);
CREATE INDEX IF NOT EXISTS tutor_sessions_subject ON tutor_sessions(kind,subject_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS tutor_messages_session ON tutor_messages(session_id,created_at);
`;

export function openDatabase(path){
  const db=new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;");
  db.exec(schema);
  ensureColumn(db,"jobs","attempts","INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db,"jobs","max_attempts","INTEGER NOT NULL DEFAULT 3");
  ensureColumn(db,"sessions","mfa_verified_at","TEXT");
  ensureColumn(db,"tasks","reminder_at","TEXT");
  ensureColumn(db,"tasks","reminder_sent_at","TEXT");
  ensureColumn(db,"events","reminder_at","TEXT");
  ensureColumn(db,"events","reminder_sent_at","TEXT");
  ensureColumn(db,"notes","draft","INTEGER NOT NULL DEFAULT 0");
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
  return db;
}

function ensureColumn(db,table,column,definition){if(!db.prepare(`PRAGMA table_info(${table})`).all().some(info=>info.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)}

export function getDatabase(config=loadConfig()){
  if(!singleton){ensureDataDirs(config);singleton=openDatabase(config.dbPath)}
  return singleton;
}

export function closeDatabase(){singleton?.close();singleton=undefined}
