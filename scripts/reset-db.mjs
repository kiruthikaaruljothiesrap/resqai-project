/**
 * ⚠️  DANGER: This script permanently deletes ALL Firestore data.
 * Run ONLY when you want a full database reset.
 *
 * Usage:
 *   node scripts/reset-db.mjs
 *
 * Requirements:
 *   npm install firebase-admin  (run once if not installed)
 *   Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON,
 *   OR paste your serviceAccountKey.json path below.
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createInterface } from "readline";

// ── CONFIG ─────────────────────────────────────────────────────────────────
// Download your service account key from:
// Firebase Console → Project Settings → Service Accounts → Generate new private key
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json"; // <── put your file here
const PROJECT_ID = "chachi-beti";

// Collections to wipe (add more if needed)
const COLLECTIONS = [
  "users",
  "tasks",
  "needs",
  "messages",
  "otpVerifications",
  "groups",
];
// ───────────────────────────────────────────────────────────────────────────

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim().toUpperCase()); });
  });
}

async function deleteCollection(db, collectionName, batchSize = 100) {
  const ref = db.collection(collectionName);
  let deleted = 0;
  while (true) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.docs.length;
    process.stdout.write(`\r  Deleted ${deleted} docs from [${collectionName}]...`);
  }
  console.log(`\r  ✅ Cleared [${collectionName}] – ${deleted} documents deleted.`);
}

async function main() {
  console.log("\n⚠️  ═══════════════════════════════════════════════");
  console.log("   FULL DATABASE RESET — ResQAI / chachi-beti");
  console.log("   This will permanently delete ALL Firestore data.");
  console.log("═══════════════════════════════════════════════════\n");

  const answer = await confirm('Type "RESET" to confirm and proceed: ');
  if (answer !== "RESET") {
    console.log("\n❌ Aborted. No data was deleted.");
    process.exit(0);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  } catch {
    console.error(`\n❌ Could not read service account key at: ${SERVICE_ACCOUNT_PATH}`);
    console.error("   Download it from Firebase Console → Project Settings → Service Accounts");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });

  const db = admin.firestore();

  console.log("\n🗑️  Deleting Firestore collections...\n");
  for (const col of COLLECTIONS) {
    await deleteCollection(db, col);
  }

  console.log("\n✅ All Firestore data deleted successfully.");
  console.log("\n📌 NEXT STEPS:");
  console.log("   1. Go to Firebase Console → Authentication → Delete all users manually.");
  console.log("   2. Restart your dev server: npm run dev");
  console.log("   3. Create a fresh admin/NGO account to start clean.\n");

  process.exit(0);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
