const functions = require('firebase-functions');
const admin = require('firebase-admin');

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
