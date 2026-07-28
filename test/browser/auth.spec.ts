import {createHmac} from "node:crypto";
import {expect,test,type BrowserContext,type Page} from "@playwright/test";

const email="owner@example.com",password="correct horse battery staple";

function totp(secret:string){
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",bytes:number[]=[];let bits=0,value=0;
  for(const char of secret.replace(/=+$/,"").toUpperCase()){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8}}
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30_000)));
  const digest=createHmac("sha1",Buffer.from(bytes)).update(counter).digest(),offset=digest[19]&15;
  return String((digest.readUInt32BE(offset)&0x7fffffff)%1_000_000).padStart(6,"0");
}

async function passwordStep(page:Page){
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button",{name:"Continue securely"}).click();
}

async function loginWithTotp(context:BrowserContext,secret:string){
  const page=await context.newPage();await passwordStep(page);
  await expect(page.getByRole("heading",{name:"Verify it’s you"})).toBeVisible();
  await page.getByLabel("Authenticator code").fill(totp(secret));
  await page.getByRole("button",{name:"Verify code"}).click();
  await expect(page).toHaveURL("/");return page;
}

test("enrollment, MFA login, recovery login, and session revocation",async({browser,page})=>{
  test.setTimeout(90_000);
  await passwordStep(page);await expect(page).toHaveURL("/");
  await page.goto("/settings");await page.getByRole("button",{name:"Security"}).click();
  await page.getByRole("button",{name:"Set up"}).click();
  const secret=(await page.locator(".auth-result code").first().textContent())!.trim();
  await page.getByLabel("Authenticator code").fill(totp(secret));
  await page.getByRole("button",{name:"Confirm"}).click();
  const recovery=page.locator(".auth-result",{hasText:"Save these recovery codes now"});await expect(recovery).toBeVisible();
  const codes=(await recovery.locator("code").textContent())!.trim().split("\n");
  expect(codes).toHaveLength(10);

  await page.waitForTimeout(30_500-Date.now()%30_000);
  const totpContext=await browser.newContext({userAgent:"Noema TOTP browser test"}),totpPage=await loginWithTotp(totpContext,secret);
  const recoveryContext=await browser.newContext({userAgent:"Noema recovery browser test"}),recoveryPage=await recoveryContext.newPage();
  await passwordStep(recoveryPage);await recoveryPage.getByRole("button",{name:"Use a recovery code"}).click();
  await recoveryPage.getByLabel("Recovery code").fill(codes[0]);
  await recoveryPage.getByRole("button",{name:"Verify code"}).click();
  await expect(recoveryPage).toHaveURL("/");

  await page.reload();await page.getByRole("button",{name:"Security"}).click();
  const revoke=page.locator(".session-setting",{hasText:"Noema TOTP browser test"}).getByRole("button",{name:"Revoke"});await revoke.click();
  await expect(revoke).toHaveCount(0);
  const status=await totpPage.evaluate(async()=>fetch("/api/v1/auth/sessions").then(response=>response.status));
  expect(status).toBe(401);
  await totpContext.close();await recoveryContext.close();
});
