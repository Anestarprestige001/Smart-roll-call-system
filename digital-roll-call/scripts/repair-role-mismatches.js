#!/usr/bin/env node

/**
 * One-time repair script for users whose Firestore role document no longer
 * matches their Firebase Auth custom claims.
 */

import admin from 'firebase-admin';

const VALID_ROLES = ['DIRECTOR', 'ADMIN', 'ICT COORDINATOR', 'SCHOOL MANAGER', 'CLASS TEACHER'];

async function syncUserRole(userDoc) {
  const uid = userDoc.id;
  const userData = userDoc.data() || {};
  const firestoreRole = userData.role || null;
  const firestoreClassId = userData.classId || null;

  if (!firestoreRole || userData.status !== 'active') {
    return { status: 'skipped', reason: 'not active or no role' };
  }

  if (!VALID_ROLES.includes(firestoreRole)) {
    return { status: 'skipped', reason: `invalid role ${firestoreRole}` };
  }

  const userRecord = await admin.auth().getUser(uid);
  const claims = userRecord.customClaims || {};
  const claimRole = claims.role || null;
  const claimClassId = claims.classId || null;

  const rolesMatch = claimRole === firestoreRole;
  const classMatches = claimClassId === firestoreClassId;
  if (rolesMatch && classMatches) {
    return { status: 'already-synced' };
  }

  const customClaims = { role: firestoreRole };
  if (firestoreClassId) {
    customClaims.classId = firestoreClassId;
  } else {
    customClaims.classId = null;
  }

  await admin.auth().setCustomUserClaims(uid, customClaims);
  await admin.firestore().collection('users').doc(uid).set({
    role: firestoreRole,
    classId: firestoreClassId || null,
    status: 'active',
    claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    status: 'repaired',
    uid,
    email: userRecord.email || null,
    role: firestoreRole,
    classId: firestoreClassId || null,
  };
}

async function main() {
  try {
    admin.initializeApp();

    const snapshot = await admin.firestore().collection('users').where('status', '==', 'active').where('role', '!=', null).get();
    const users = snapshot.docs;
    const summary = {
      checked: users.length,
      alreadySynced: 0,
      repaired: 0,
      repairedUsers: [],
      skipped: 0,
    };

    for (const userDoc of users) {
      const result = await syncUserRole(userDoc);
      if (result.status === 'already-synced') {
        summary.alreadySynced += 1;
      } else if (result.status === 'repaired') {
        summary.repaired += 1;
        summary.repairedUsers.push({
          email: result.email,
          role: result.role,
          uid: result.uid,
        });
      } else {
        summary.skipped += 1;
      }
    }

    console.log('Summary');
    console.log(`Checked: ${summary.checked}`);
    console.log(`Already in sync: ${summary.alreadySynced}`);
    console.log(`Repaired: ${summary.repaired}`);
    console.log(`Skipped: ${summary.skipped}`);
    if (summary.repairedUsers.length > 0) {
      console.log('Repaired users:');
      summary.repairedUsers.forEach((entry) => {
        console.log(`- ${entry.email || entry.uid} -> ${entry.role}`);
      });
    }
  } catch (error) {
    console.error(`❌ ${error.message || error}`);
    process.exit(1);
  }
}

main();
