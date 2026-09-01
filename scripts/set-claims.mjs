// Run locally with your Firebase service account key — this is how roles get
// assigned without paying for a Cloud Function. See README for setup.
//
// Examples:
//   node scripts/set-claims.mjs --admin m.mukuka1323@gmail.com
//   node scripts/set-claims.mjs --staff staff@business.com --business abc123

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";

const args = process.argv.slice(2);
const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

async function main() {
  if (args[0] === "--admin") {
    const email = args[1];
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`${email} is now a super admin.`);
    return;
  }

  if (args[0] === "--staff") {
    const email = args[1];
    const businessIndex = args.indexOf("--business");
    const businessId = args[businessIndex + 1];
    if (!businessId) throw new Error("Pass --business <businessId>");

    const user = await auth.getUserByEmail(email);
    const existing = user.customClaims?.staffOf ?? [];
    const staffOf = Array.from(new Set([...existing, businessId]));
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, staffOf });
    console.log(`${email} is now staff of business ${businessId}. staffOf: ${staffOf.join(", ")}`);
    return;
  }

  console.log("Usage:\n  node scripts/set-claims.mjs --admin <email>\n  node scripts/set-claims.mjs --staff <email> --business <businessId>");
}

main().catch((e) => { console.error(e); process.exit(1); });
