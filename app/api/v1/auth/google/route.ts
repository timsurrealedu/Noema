import {ensureOwner} from "../../../../../server/auth.mjs";
import {ensureDefaultWorkspace} from "../../../../../server/collaboration.mjs";
import {loadConfig} from "../../../../../server/config.mjs";
import {beginGoogleSignIn} from "../../../../../server/google-sign-in.mjs";
import {handle} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(){try{const config=loadConfig(),owner=await ensureOwner({email:config.ownerEmail,password:config.ownerPassword});if(owner)ensureDefaultWorkspace(owner.id);return Response.redirect(beginGoogleSignIn(config).authorizationUrl)}catch(error){return handle(error)}}
