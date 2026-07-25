import {DatabaseSync} from "node:sqlite";
import {ensureDataDirs,loadConfig} from "./config.mjs";

let singleton;

const schema=`
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT UNIQUE NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT,device TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS captures(id TEXT PRIMARY KEY,text TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL,source_label TEXT NOT NULL,objects_json TEXT NOT NULL DEFAULT '[]',error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,title TEXT NOT NULL,project TEXT NOT NULL,due TEXT NOT NULL,priority TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,recurrence TEXT,subtasks_json TEXT NOT NULL DEFAULT '[]',archived INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,title TEXT NOT NULL,day INTEGER NOT NULL,time TEXT NOT NULL,top REAL NOT NULL,height REAL NOT NULL,location TEXT,active INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,title TEXT NOT NULL,excerpt TEXT NOT NULL,content TEXT NOT NULL,tags_json TEXT NOT NULL DEFAULT '[]',ai INTEGER NOT NULL DEFAULT 0,source TEXT,favorite INTEGER NOT NULL DEFAULT 0,trashed INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id UNINDEXED,title,content,tags);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,state TEXT NOT NULL,input_json TEXT NOT NULL,result_json TEXT,error TEXT,lease_until TEXT,cancel_requested INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS job_events(id INTEGER PRIMARY KEY AUTOINCREMENT,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,type TEXT NOT NULL,data_json TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,actor_id TEXT,action TEXT NOT NULL,object_type TEXT NOT NULL,object_id TEXT NOT NULL,summary TEXT NOT NULL,inverse_json TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS idempotency_keys(actor_id TEXT NOT NULL,key TEXT NOT NULL,request_hash TEXT NOT NULL,response_json TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(actor_id,key));
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,sha256 TEXT UNIQUE NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS capture_assets(capture_id TEXT NOT NULL REFERENCES captures(id) ON DELETE CASCADE,asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,PRIMARY KEY(capture_id,asset_id));
CREATE INDEX IF NOT EXISTS sessions_token ON sessions(token_hash,expires_at);
CREATE INDEX IF NOT EXISTS jobs_claim ON jobs(state,created_at);
CREATE INDEX IF NOT EXISTS job_events_job ON job_events(job_id,id);
`;

export function openDatabase(path){
  const db=new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;");
  db.exec(schema);
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(1,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(2,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(3,?)").run(new Date().toISOString());
  return db;
}

export function getDatabase(config=loadConfig()){
  if(!singleton){ensureDataDirs(config);singleton=openDatabase(config.dbPath)}
  return singleton;
}

export function closeDatabase(){singleton?.close();singleton=undefined}
