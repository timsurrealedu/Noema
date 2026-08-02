import { firefox } from "@playwright/test";
const base = "http://localhost:3107";
const email = process.env.NOEMA_E2E_EMAIL, password = process.env.NOEMA_E2E_PASSWORD;
if(!email||!password)throw new Error("NOEMA_E2E_EMAIL and NOEMA_E2E_PASSWORD are required");
const out = [];
const log = (...a)=>{ const s=a.map(x=>typeof x==="string"?x:JSON.stringify(x)).join(" "); out.push(s); console.log(s); };

const browser = await firefox.launch();
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const p = await ctx.newPage();
p.on("console", m=> log("[console."+m.type()+"]", m.text()));
p.on("pageerror", e=> log("[PAGEERROR]", e.message));

async function go(pg){
  const url = `${base}/${pg}`;
  try{
    await p.goto(url,{waitUntil:"domcontentloaded",timeout:15000});
    await p.waitForTimeout(1500);
    const status = p.url().replace(base,"");
    const heading = await p.locator("h1,h2").first().textContent().catch(()=>"(none)");
    const btns = await p.locator("button,a[role=button]").count();
    await p.screenshot({path:`/tmp/shots/page-${(pg||"home").replace("/","-")}.png`,fullPage:true});
    log(`PAGE ${JSON.stringify(pg)} -> ${JSON.stringify(status)} | head: ${JSON.stringify((heading||"").trim().slice(0,50))} | btns:${btns}`);
  }catch(e){ log(`PAGE ${pg} ERR: ${e.message.split("\n")[0]}`); }
}

// login
await p.goto(base+"/login",{waitUntil:"domcontentloaded"});
await p.fill('input[name="email"]',email);
await p.fill('input[name="password"]',password);
await p.locator('form button.primary').click();
await p.waitForTimeout(3000);
log("after login url:", p.url());

// walk pages
for(const pg of ["","tasks","calendar","vault","capture","study","projects","notifications","automations","settings","activity","canvas","coding","graph","plugins","collaboration","help","dashboards"]){
  await go(pg);
}

await browser.close();
await import("node:fs").then(fs=>fs.writeFileSync("/tmp/e2e-report.txt", out.join("\n")));
console.log("=== DONE ===");
