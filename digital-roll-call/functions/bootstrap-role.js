// scripts/bootstrap-role.js
const admin = require('firebase-admin');

/**
 * IMPORTANT: How to authenticate this script.
 *
 * This script uses the Firebase Admin SDK and requires authentication to interact
 * with your Firebase project services. You have two main options:
 *
 * 1. Use a Service Account JSON file:
 *    - In the Firebase console, go to Project settings > Service accounts.
 *    - Click "Generate new private key" and download the JSON file.
 *    - Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the absolute
 *      path of this file before running the script.
 *
 *      For Windows (Command Prompt):
 *      set GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\service-account-file.json"
 *
 *      For macOS/Linux:
 *      export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-file.json"
 *
 * 2. Use Application Default Credentials (if you have the gcloud CLI):
 *    - Run `gcloud auth application-default login` in your terminal.
 *    - The Admin SDK will automatically pick up these credentials.
 *
 * After authenticating, run the script from the project root.
 */
admin.initializeApp();

const [uid, role] = process.argv.slice(2);

if (!uid || !role) {
  console.error('Usage: node scripts/bootstrap-role.js <uid> "<ROLE>"');
  console.error('Example: node scripts/bootstrap-role.js anaOykxuN7Uk8Xhyq7FOL3ENiua2 "ICT COORDINATOR"');
  process.exit(1);
}

const allowedRoles = ['DIRECTOR', 'ICT COORDINATOR', 'ADMIN', 'CLASS TEACHER', 'SCHOOL MANAGER'];

if (!allowedRoles.includes(role)) {
    console.error(`Invalid role: "${role}". Must be one of: ${allowedRoles.join(', ')}`);
    process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { role })
  .then(() => {
    console.log(`✅ Successfully set custom claim for UID ${uid} to role "${role}".`);
    console.log('The user must sign out and sign back in for the change to take effect.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting custom claim:', error);
    process.exit(1);
  });