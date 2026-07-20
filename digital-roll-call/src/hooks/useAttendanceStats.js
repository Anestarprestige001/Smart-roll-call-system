import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';

export function useAttendanceStats(classId, activeTerm) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTerm) {
      setLoading(false);
      return;
    }

    let q = query(collection(db, 'attendance_logs'), orderBy('date', 'desc'));

    if (classId) {
      q = query(
        collection(db, 'attendance_logs'),
        where('classId', '==', classId),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const allLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const termLogs = allLogs.filter(log => log.termId === activeTerm.id);
      setLogs(termLogs);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error(`Error loading attendance logs for ${classId || 'school'}:`, err);
      setError('Could not load attendance data.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, activeTerm]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l) => l.date === todayStr);

  const aggregateStats = (logSet) => {
    return logSet.reduce((acc, log) => {
      acc.totalPresent += log.totalPresent || 0;
      acc.totalAbsent += log.totalAbsent || 0;
      acc.totalStudents += log.totalStudents || 0;
      return acc;
    }, { totalPresent: 0, totalAbsent: 0, totalStudents: 0 });
  };

  const todayStats = aggregateStats(todayLogs);
  const termStats = aggregateStats(logs);

  return {
    loading, error, logs, todayLogs, todayStats, termStats,
  };
}