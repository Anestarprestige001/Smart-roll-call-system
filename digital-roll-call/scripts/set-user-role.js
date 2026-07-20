#!/usr/bin/env node

/**
 * Reusable admin script to set a user's Firebase Auth custom claims and
 * synchronize the matching Firestore user document.
 *
 * IMPORTANT: Never edit the role field directly in the Firestore console.
 * Firestore writes alone do not update Firebase Auth custom claims, and the
 * user will remain stuck in the app's permission-sync loop because the ID
 * token will never receive the new role claim.
 */

import admin from 'firebase-admin';
import { parseArgs } from 'node:util';

const VALID_ROLES = ['DIRECTOR', 'ADMIN', 'ICT COORDINATOR', 'SCHOOL MANAGER', 'CLASS TEACHER'];

function parseCommandLine() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      uid: { type: 'string' },
      role: { type: 'string' },
      classId: { type: 'string' },
    },
    allowPositionals: false,
  });

  const { email, uid, role, classId } = values;
  if (!role) {
    throw new Error('Missing required --role argument.');
  }
  if (!email && !uid) {
    throw new Error('Provide either --email or --uid.');
  }
  if (email && uid) {
    throw new Error('Provide either --email or --uid, not both.');
  }
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  return { email, uid, role, classId: classId || null };
}

async function main() {
  try {
    admin.initializeApp();
    const { email, uid, role, classId } = parseCommandLine();

    const userRecord = email
      ? await admin.auth().getUserByEmail(email)
      : await admin.auth().getUser(uid);

    const customClaims = { role };
    if (classId) {
      customClaims.classId = classId;
    } else {
      customClaims.classId = null;
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      role,
      classId: classId || null,
      status: 'active',
      claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Updated role for ${userRecord.email || userRecord.uid}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email || 'n/a'}`);
    console.log(`   Claims: ${JSON.stringify(customClaims)}`);
  } catch (error) {
    console.error(`❌ ${error.message || error}`);
    process.exit(1);
  }
}

main();
