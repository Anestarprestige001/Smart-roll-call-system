import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function buildRecipientKeys(targetRoles = [], targetUserIds = []) {
  return Array.from(new Set([...(targetRoles || []), ...(targetUserIds || [])].filter(Boolean)));
}

export async function writeNotification({ notificationId, type, targetRoles = [], targetUserIds = [], payload = {} }) {
  const notificationRef = doc(db, 'notifications', notificationId);
  const existing = await getDoc(notificationRef);
  if (existing.exists()) {
    return null;
  }

  await setDoc(notificationRef, {
    type,
    targetRoles,
    targetUserIds,
    recipientKeys: buildRecipientKeys(targetRoles, targetUserIds),
    payload,
    read: false,
    createdAt: serverTimestamp(),
  });

  return notificationRef;
}
