import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./service-account.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim() {
  const uid = "7nycjkm2f0Omnni1Ut2QNxYBWyH3";
  try {
    await admin.auth().setCustomUserClaims(uid, { isAdmin: true });
    console.log("Admin claim set for UID:", uid);
  } catch (error) {
    console.error("Error setting admin claim:", error);
  }
}

setAdminClaim();