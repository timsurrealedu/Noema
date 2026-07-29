import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
import {getDatabase} from "./db.mjs";

const scrypt=promisify(scryptCallback);
const now=()=>new Date().toISOString();
const hashToken=token=>createHash("sha256").update(token).digest("hex");
const encryptionKey=value=>{if(!value||value.length<32)throw new Error("NOEMA_ENCRYPTION_KEY is required for persisted MFA");return createHash("sha256").update(value).digest()};
const encrypt=(value,key)=>{const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",encryptionKey(key),iv),body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString("base64url")};
const decrypt=(value,key)=>{const packed=Buffer.from(value,"base64url"),decipher=createDecipheriv("aes-256-gcm",encryptionKey(key),packed.subarray(0,12));decipher.setAuthTag(packed.subarray(12,28));return Buffer.concat([decipher.update(packed.subarray(28)),decipher.final()]).toString("utf8")};
const encodeBase32=buffer=>{const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits="",result="";for(const byte of buffer)bits+=byte.toString(2).padStart(8,"0");for(let i=0;i<bits.length;i+=5)result+=alphabet[parseInt(bits.slice(i,i+5).padEnd(5,"0"),2)];return result};
const auditSecurity=(db,userId,action,summary)=>db.prepare("INSERT INTO audit_events(id,actor_id,action,object_type,object_id,summary,created_at) VALUES(?,?,?,?,?,?,?)").run(randomUUID(),userId,action,"authentication",userId,summary,now());
const base32=secret=>{const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",clean=String(secret).replace(/=+$/,"").toUpperCase();let bits="";for(const char of clean){const value=alphabet.indexOf(char);if(value<0)throw new Error("NOEMA_TOTP_SECRET must be base32");bits+=value.toString(2).padStart(5,"0")}const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(bytes)};
export function totp(secret,counter=Math.floor(Date.now()/30000)){const message=Buffer.alloc(8);message.writeBigUInt64BE(BigInt(counter));const digest=createHmac("sha1",base32(secret)).update(message).digest(),offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1_000_000).padStart(6,"0")}
export function verifyTotp(secret,code,userId,db=getDatabase(),counter=Math.floor(Date.now()/30000)){
  if(!/^\d{6}$/.test(String(code)))return false;
  for(const candidate of [counter,counter-1]){let expected;try{expected=Buffer.from(totp(secret,candidate))}catch{return false}const actual=Buffer.from(String(code));if(timingSafeEqual(expected,actual)){try{db.prepare("INSERT INTO totp_uses(user_id,counter,used_at) VALUES(?,?,?)").run(userId,candidate,now());db.prepare("DELETE FROM totp_uses WHERE used_at<?").run(new Date(Date.now()-86400000).toISOString());return true}catch{return false}}}
  return false;
}

export function enforceLoginRateLimit(key,limit=5,windowMs=15*60_000,db=getDatabase()){
  const id=String(key).trim().toLowerCase(),since=new Date(Date.now()-windowMs).toISOString();
  db.prepare("DELETE FROM login_attempts WHERE attempted_at<?").run(since);
  const count=db.prepare("SELECT COUNT(*) count FROM login_attempts WHERE key=? AND attempted_at>=?").get(id,since).count;
  if(count>=limit)throw Object.assign(new Error("Too many login attempts. Try again later."),{status:429});
  db.prepare("INSERT INTO login_attempts(key,attempted_at) VALUES(?,?)").run(id,now());
}

export function clearLoginRateLimit(key,db=getDatabase()){db.prepare("DELETE FROM login_attempts WHERE key=?").run(String(key).trim().toLowerCase())}

export async function hashPassword(password){
  if(typeof password!=="string"||password.length<12)throw new Error("Password must contain at least 12 characters");
  const salt=randomBytes(16);const key=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt$32768$${salt.toString("base64")}$${Buffer.from(key).toString("base64")}`;
}

export async function verifyPassword(password,encoded){
  const [name,n,salt,key]=String(encoded).split("$");if(name!=="scrypt"||!n||!salt||!key)return false;
  const expected=Buffer.from(key,"base64");const actual=Buffer.from(await scrypt(password,Buffer.from(salt,"base64"),expected.length,{N:Number(n),r:8,p:1,maxmem:64*1024*1024}));
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

export async function ensureOwner({email,password},db=getDatabase()){
  const normalized=email.trim().toLowerCase();if(!normalized||!password)return null;
  const found=db.prepare("SELECT id,email FROM users WHERE email=?").get(normalized);if(found)return found;
  const id=randomUUID(),stamp=now(),hash=await hashPassword(password);
  try{db.prepare("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES(?,?,?,?,?)").run(id,normalized,hash,stamp,stamp);return {id,email:normalized}}
  catch(error){const concurrent=db.prepare("SELECT id,email FROM users WHERE email=?").get(normalized);if(concurrent)return concurrent;throw error}
}

export async function login({email,password,device="",totpCode="",recoveryCode="",totpSecret="",encryptionKey=""},db=getDatabase(),hours=720){
  const normalized=email.trim().toLowerCase();enforceLoginRateLimit(normalized||"(empty)",5,15*60_000,db);
  const user=db.prepare("SELECT * FROM users WHERE email=?").get(normalized);if(!user||!await verifyPassword(password,user.password_hash))return null;
  const persisted=user.totp_secret_enc?decrypt(user.totp_secret_enc,encryptionKey):"",activeSecret=persisted||(!user.totp_env_disabled?totpSecret:"");let mfaVerified=false;
  if(activeSecret){if(verifyTotp(activeSecret,totpCode,user.id,db))mfaVerified=true;else if(recoveryCode&&await consumeRecoveryCode(user.id,recoveryCode,db))mfaVerified=true;else return {mfaRequired:true}}
  const token=randomBytes(32).toString("base64url"),stamp=now(),expires=new Date(Date.now()+hours*3600000).toISOString();
  db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at,device,created_at,mfa_verified_at) VALUES(?,?,?,?,?,?,?)").run(randomUUID(),user.id,hashToken(token),expires,String(device).slice(0,200),stamp,mfaVerified?stamp:null);
  clearLoginRateLimit(normalized,db);
  return {token,expiresAt:expires,user:{id:user.id,email:user.email}};
}

export function authenticate(token,db=getDatabase()){
  if(!token)return null;return db.prepare("SELECT u.id,u.email,s.id session_id,s.expires_at,s.mfa_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?").get(hashToken(token),now())||null;
}

export function revokeSession(token,db=getDatabase()){return db.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").run(now(),hashToken(token)).changes===1}

export function listSessions(userId,db=getDatabase()){
  return db.prepare("SELECT id,device,created_at,expires_at FROM sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC").all(userId,now()).map(row=>({id:row.id,device:row.device,createdAt:row.created_at,expiresAt:row.expires_at}));
}

export function revokeSessionById(id,userId,db=getDatabase()){return db.prepare("UPDATE sessions SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL").run(now(),id,userId).changes===1}

export function mfaStatus(userId,db=getDatabase()){const user=db.prepare("SELECT totp_secret_enc,totp_pending_at FROM users WHERE id=?").get(userId);return {enabled:!!user?.totp_secret_enc,enrollmentPending:!!user?.totp_pending_at,recoveryCodes:Number(db.prepare("SELECT COUNT(*) count FROM recovery_codes WHERE user_id=? AND used_at IS NULL").get(userId)?.count||0)}}
export function beginTotpEnrollment(userId,email,key,db=getDatabase()){const secret=encodeBase32(randomBytes(20)),stamp=now();db.prepare("UPDATE users SET totp_pending_enc=?,totp_pending_at=?,updated_at=? WHERE id=?").run(encrypt(secret,key),stamp,stamp,userId);auditSecurity(db,userId,"mfa-enrollment-start","Started authenticator enrollment");return {secret,uri:`otpauth://totp/${encodeURIComponent(`Noema:${email}`)}?secret=${secret}&issuer=Noema&algorithm=SHA1&digits=6&period=30`}}
export async function confirmTotpEnrollment(userId,code,key,db=getDatabase(),sessionId=null){const user=db.prepare("SELECT totp_pending_enc,totp_pending_at FROM users WHERE id=?").get(userId);if(!user?.totp_pending_enc||Date.now()-Date.parse(user.totp_pending_at)>10*60_000)throw Object.assign(new Error("Enrollment challenge expired"),{status:409});const secret=decrypt(user.totp_pending_enc,key);if(!verifyTotp(secret,code,userId,db))throw Object.assign(new Error("Authenticator code is invalid"),{status:400});const codes=Array.from({length:10},()=>`${randomBytes(6).toString("hex").slice(0,6)}-${randomBytes(6).toString("hex").slice(0,6)}`),stamp=now(),hashes=[];for(const code of codes)hashes.push(await hashPassword(code));db.exec("BEGIN IMMEDIATE");try{db.prepare("UPDATE users SET totp_secret_enc=totp_pending_enc,totp_pending_enc=NULL,totp_pending_at=NULL,totp_env_disabled=1,updated_at=? WHERE id=?").run(stamp,userId);if(sessionId)db.prepare("UPDATE sessions SET mfa_verified_at=? WHERE id=? AND user_id=?").run(stamp,sessionId,userId);db.prepare("DELETE FROM recovery_codes WHERE user_id=?").run(userId);const insert=db.prepare("INSERT INTO recovery_codes(id,user_id,code_hash,created_at) VALUES(?,?,?,?)");hashes.forEach(hash=>insert.run(randomUUID(),userId,hash,stamp));auditSecurity(db,userId,"mfa-enabled","Enabled authenticator MFA");db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}return {recoveryCodes:codes}}
export async function consumeRecoveryCode(userId,code,db=getDatabase()){const rows=db.prepare("SELECT id,code_hash FROM recovery_codes WHERE user_id=? AND used_at IS NULL").all(userId);for(const row of rows)if(await verifyPassword(String(code).trim().toLowerCase(),row.code_hash)){const changed=db.prepare("UPDATE recovery_codes SET used_at=? WHERE id=? AND used_at IS NULL").run(now(),row.id).changes===1;if(changed)auditSecurity(db,userId,"recovery-code-used","Consumed a recovery code");return changed}return false}
export async function regenerateRecoveryCodes(userId,db=getDatabase()){if(!db.prepare("SELECT totp_secret_enc FROM users WHERE id=?").get(userId)?.totp_secret_enc)throw Object.assign(new Error("Authenticator MFA is not enabled"),{status:409});const codes=Array.from({length:10},()=>`${randomBytes(6).toString("hex").slice(0,6)}-${randomBytes(6).toString("hex").slice(0,6)}`),hashes=[];for(const code of codes)hashes.push(await hashPassword(code));const time=now();db.exec("BEGIN IMMEDIATE");try{db.prepare("DELETE FROM recovery_codes WHERE user_id=?").run(userId);const insert=db.prepare("INSERT INTO recovery_codes(id,user_id,code_hash,created_at) VALUES(?,?,?,?)");hashes.forEach(hash=>insert.run(randomUUID(),userId,hash,time));auditSecurity(db,userId,"recovery-codes-regenerated","Regenerated and invalidated prior recovery codes");db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}return {recoveryCodes:codes}}
export async function disableTotp(userId,password,key,db=getDatabase()){const user=db.prepare("SELECT password_hash,totp_secret_enc FROM users WHERE id=?").get(userId);if(!user||!await verifyPassword(password,user.password_hash))throw Object.assign(new Error("Password is incorrect"),{status:403});if(!user.totp_secret_enc)return false;db.exec("BEGIN IMMEDIATE");try{db.prepare("UPDATE users SET totp_secret_enc=NULL,totp_pending_enc=NULL,totp_pending_at=NULL,totp_env_disabled=1,updated_at=? WHERE id=?").run(now(),userId);db.prepare("DELETE FROM recovery_codes WHERE user_id=?").run(userId);db.prepare("DELETE FROM totp_uses WHERE user_id=?").run(userId);auditSecurity(db,userId,"mfa-disabled","Disabled authenticator MFA and invalidated recovery codes");db.exec("COMMIT");return true}catch(error){db.exec("ROLLBACK");throw error}}
export async function changePassword(userId,sessionId,currentPassword,newPassword,db=getDatabase()){const user=db.prepare("SELECT password_hash FROM users WHERE id=?").get(userId);if(!user||!await verifyPassword(currentPassword,user.password_hash))throw Object.assign(new Error("Current password is incorrect"),{status:403});const hash=await hashPassword(newPassword),time=now();db.exec("BEGIN IMMEDIATE");try{db.prepare("UPDATE users SET password_hash=?,updated_at=?,version=version+1 WHERE id=?").run(hash,time,userId);db.prepare("UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>? AND revoked_at IS NULL").run(time,userId,sessionId);auditSecurity(db,userId,"password-changed","Changed password and revoked other sessions");db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}return {ok:true}}
