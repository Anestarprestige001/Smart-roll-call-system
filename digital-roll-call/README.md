# Smart Roll System

## Role administration

Do not edit the role field directly in the Firestore console for a user.
Firestore writes alone do not update Firebase Auth custom claims, and the user
will remain stuck in the permission-sync loop because the ID token never receives
its new role claim.

Use the admin scripts in the scripts/ folder instead:

- node scripts/set-user-role.js --email=someone@school.com --role="ICT COORDINATOR"
- node scripts/set-user-role.js --email=teacher@school.com --role="CLASS TEACHER" --classId=grade5a
