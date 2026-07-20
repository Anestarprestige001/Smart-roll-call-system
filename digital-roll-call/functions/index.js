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
  const roleHierarchy = {
    DIRECTOR: ['ADMIN', 'CLASS TEACHER', 'SCHOOL MANAGER'],
    'ICT COORDINATOR': ['CLASS TEACHER'],
    ADMIN: ['CLASS TEACHER'],
  };

  if (!callerRole || !roleHierarchy[callerRole]) {
    throw new functions.https.HttpsError('permission-denied', 'Only ICT Coordinators, Directors, or Admins may assign roles.');
  }

  const { uid, role, classId } = data;
  const isRemoval = role === null || role === undefined;
  const allowedRoles = ['ADMIN', 'CLASS TEACHER', 'SCHOOL MANAGER'];

  if (!uid || (!isRemoval && !allowedRoles.includes(role))) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role assignment payload.');
  }

  if (!isRemoval && !roleHierarchy[callerRole].includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'You lack clearance for this role.');
  }

  if (!isRemoval && role === 'CLASS TEACHER' && !classId) {
    throw new functions.https.HttpsError('invalid-argument', 'A class is required for CLASS TEACHER assignments.');
  }

  const customClaims = {};
  if (!isRemoval) {
    customClaims.role = role;
    if (role === 'CLASS TEACHER') {
      customClaims.classId = classId || null;
    }
  }

  await admin.auth().setCustomUserClaims(uid, customClaims);
  await admin.firestore().collection('users').doc(uid).set({
    role: isRemoval ? null : role,
    classId: isRemoval || role !== 'CLASS TEACHER' ? null : classId || null,
    status: isRemoval ? 'pending' : 'active',
    claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

exports.bootstrapFirstCoordinator = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

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
