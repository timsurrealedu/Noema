import {ensureOwner} from "../../../../../server/auth.mjs";
import {loadConfig} from "../../../../../server/config.mjs";
import {beginGoogleSignIn} from "../../../../../server/google-sign-in.mjs";
import {handle} from "../../../../../server/http.mjs";
export const runtime="nodejs";
export async function GET(){try{const config=loadConfig();await ensureOwner({email:config.ownerEmail,password:config.ownerPassword});return Response.redirect(beginGoogleSignIn(config).authorizationUrl)}catch(error){return handle(error)}}
