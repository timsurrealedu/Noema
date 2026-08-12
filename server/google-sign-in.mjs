import {randomBytes} from "node:crypto";
import {getDatabase} from "./db.mjs";
import {loadConfig} from "./config.mjs";
import {createFederatedSession} from "./auth.mjs";
import {provisionGoogleInviteAccount} from "./collaboration.mjs";

const now=()=>new Date().toISOString();
const configured=config=>{if(!config.googleClientId||!config.googleClientSecret||!config.googleLoginRedirectUri)throw Object.assign(new Error("Google sign-in is not configured"),{status:503})};
const json=async response=>{const data=await response.json();if(!response.ok)throw Object.assign(new Error("Google sign-in failed"),{status:502});return data};

export function beginGoogleSignIn(config=loadConfig(),db=getDatabase()){
  configured(config);const state=randomBytes(32).toString("base64url"),created=now(),expires=new Date(Date.now()+10*60_000).toISOString();db.prepare("DELETE FROM google_login_states WHERE expires_at<=?").run(created);db.prepare("INSERT INTO google_login_states(state,expires_at,created_at) VALUES(?,?,?)").run(state,expires,created);const query=new URLSearchParams({client_id:config.googleClientId,redirect_uri:config.googleLoginRedirectUri,response_type:"code",state,scope:"openid email",prompt:"select_account"});return {authorizationUrl:`https://accounts.google.com/o/oauth2/v2/auth?${query}`};
}

export async function completeGoogleSignIn(state,code,device="",config=loadConfig(),db=getDatabase(),fetcher=fetch){
  configured(config);const pending=db.prepare("SELECT state FROM google_login_states WHERE state=? AND expires_at>?").get(state,now());if(!pending)throw Object.assign(new Error("Google sign-in state is invalid or expired"),{status:409});db.prepare("DELETE FROM google_login_states WHERE state=?").run(state);const tokens=await json(await fetcher("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:config.googleClientId,client_secret:config.googleClientSecret,redirect_uri:config.googleLoginRedirectUri,grant_type:"authorization_code"})})),profile=await json(await fetcher("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${tokens.access_token}`}})),email=String(profile.email||"").trim().toLowerCase(),subject=String(profile.sub||profile.id||"");if(profile.email_verified!==true&&profile.verified_email!==true)throw Object.assign(new Error("Google account is not authorized"),{status:403});await provisionGoogleInviteAccount(email,subject,db);return createFederatedSession(email,device,db,config.sessionHours);
}
