import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

function getTodayKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function useTodaysAttendanceStatus(classes = [], enabled = true) {
  const [attendanceStatus, setAttendanceStatus] = useState([]);
  const [loading, setLoading] = useState(Boolean(classes.length && enabled));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setAttendanceStatus([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    if (!classes.length) {
      setAttendanceStatus([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    const docDate = getTodayKey();

    Promise.all(classes.map(async (classItem) => {
      const attendanceDocId = `${classItem.id}_${docDate}`;
      const docSnap = await getDoc(doc(db, 'attendance_logs', attendanceDocId));
      return {
        classId: classItem.id,
        className: classItem.name,
        exists: docSnap.exists(),
      };
    }))
      .then((status) => {
        if (isMounted) {
          setAttendanceStatus(status);
          setLoading(false);
          setError('');
        }
      })
      .catch((err) => {
        console.error('Error loading attendance status:', err);
        if (isMounted) {
          setAttendanceStatus([]);
          setError('Unable to load attendance status for classes.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [classes, enabled]);

  return { attendanceStatus, loading, error };
}
