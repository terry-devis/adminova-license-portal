/**
 * Adminova Utility: Purge Anonymous Ghost Users
 * 
 * This script connects to Firebase Authentication and safely purges all 
 * anonymous/unidentified ghost user sessions that accumulated from client activations,
 * while leaving your real admin account completely untouched.
 * 
 * Usage:
 * 1. Download your serviceAccountKey.json from Firebase Console:
 *    Project Settings -> Service Accounts -> Generate New Private Key
 * 2. Save it in this directory as 'serviceAccountKey.json'
 * 3. Run: node scripts/purge-ghost-users.mjs
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(keyPath)) {
  console.log("\n⚠️  serviceAccountKey.json not found in /scripts directory.");
  console.log("👉 Alternatively, you can delete anonymous users in 2 clicks via the Firebase Web Console:");
  console.log("   1. Open https://console.firebase.google.com/project/sims-licensing/authentication/users");
  console.log("   2. Click the Filter icon next to Search");
  console.log("   3. Select 'Provider: Anonymous'");
  console.log("   4. Select all -> Click 'Delete accounts'\n");
  process.exit(0);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function purgeAnonymous() {
  console.log("🔍 Scanning Firebase Authentication users...");
  let nextPageToken;
  let totalDeleted = 0;
  let realUsersCount = 0;

  do {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    const anonymousUids = [];

    for (const user of listResult.users) {
      if (user.providerData.length === 0) {
        anonymousUids.push(user.uid);
      } else {
        realUsersCount++;
        console.log(`🛡️  Preserving Real Admin User: ${user.email} (${user.uid})`);
      }
    }

    if (anonymousUids.length > 0) {
      console.log(`🗑️  Deleting batch of ${anonymousUids.length} anonymous accounts...`);
      const deleteResult = await admin.auth().deleteUsers(anonymousUids);
      totalDeleted += deleteResult.successCount;
      if (deleteResult.failureCount > 0) {
        console.warn(`⚠️  Failed to delete ${deleteResult.failureCount} users.`);
      }
    }

    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`\n✅ Finished! Deleted ${totalDeleted} anonymous ghost accounts.`);
  console.log(`👤 Remaining verified admin accounts: ${realUsersCount}\n`);
}

purgeAnonymous().catch(console.error);
