const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * =================================================================
 * IMPORTANT NOTE ON BOOTSTRAPPING INITIAL ADMIN/DIRECTOR ACCOUNTS
 * =================================================================
 *
 * Security rules rely on custom claims (`request.auth.token.role`) to grant permissions.
 * These claims are set by the `assignUserRole` Cloud Function when a user is approved in the app.
 *
 * If you create an initial admin/director account manually (e.g., for the first user),
 * simply setting the 'role' field in their Firestore 'users' document is NOT enough.
 * The custom claim will be missing, and they will face permission-denied errors.
 *
 * You MUST also set their custom claim using the provided bootstrap script:
 * `node scripts/bootstrap-role.js <uid> "<ROLE>"`
 */
admin.initializeApp();

exports.assignUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const caller = await admin.auth().getUser(context.auth.uid);
  const callerRole = caller.customClaims?.role;
  if (callerRole !== 'DIRECTOR' && callerRole !== 'ICT COORDINATOR') {
    throw new functions.https.HttpsError('permission-denied', 'Only ICT Coordinators or Directors may assign roles.');
  }

  const { uid, role, classId } = data;
  const allowedRoles = ['DIRECTOR', 'ICT COORDINATOR', 'ADMIN', 'CLASS TEACHER', 'SCHOOL MANAGER'];

  if (!uid || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role assignment payload.');
  }

  const customClaims = { role };
  if (role === 'CLASS TEACHER' && classId) {
    customClaims.classId = classId;
  }

  await admin.auth().setCustomUserClaims(uid, customClaims);
  await admin.firestore().collection('users').doc(uid).set({
    role,
    classId: role === 'CLASS TEACHER' ? classId || null : null,
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

exports.bootstrapFirstCoordinator = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const BOOTSTRAP_EMAIL = 'jeffjr2060@gmail.com';

  if (context.auth.token.email !== BOOTSTRAP_EMAIL) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'This account is not authorized to self-bootstrap.'
    );
  }

  // Safety: only allow this once — if this uid (or anyone) already
  // holds ICT COORDINATOR or DIRECTOR, refuse, so this can't be
  // replayed later to reset roles.
  const existing = await admin.auth().getUser(context.auth.uid);
  if (existing.customClaims?.role === 'ICT COORDINATOR' || existing.customClaims?.role === 'DIRECTOR') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This account already holds a privileged role.'
    );
  }

  await admin.auth().setCustomUserClaims(context.auth.uid, { role: 'ICT COORDINATOR' });
  await admin.firestore().collection('users').doc(context.auth.uid).set({
    role: 'ICT COORDINATOR',
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});
