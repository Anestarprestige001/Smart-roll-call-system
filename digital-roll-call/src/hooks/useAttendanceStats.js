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
  const dedupedTermLogs = Array.from(
    logs
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      .reduce((acc, log) => {
        const classKey = log.classId || log.id || 'unknown';
        if (!acc.has(classKey)) {
          acc.set(classKey, log);
        }
        return acc;
      }, new Map())
      .values()
  );

  const aggregateDailyStats = (logSet) => {
    return logSet.reduce((acc, log) => {
      acc.totalPresent += log.totalPresent || 0;
      acc.totalAbsent += log.totalAbsent || 0;
      acc.presentGirls += (log.girlsBoardersPresent || 0) + (log.girlsDayScholarsPresent || 0);
      acc.presentBoys += (log.boysBoardersPresent || 0) + (log.boysDayScholarsPresent || 0);
      acc.presentBoarders += (log.girlsBoardersPresent || 0) + (log.boysBoardersPresent || 0);
      acc.presentDayScholars += (log.girlsDayScholarsPresent || 0) + (log.boysDayScholarsPresent || 0);
      acc.absentGirls += (log.girlsBoardersAbsent || 0) + (log.girlsDayScholarsAbsent || 0);
      acc.absentBoys += (log.boysBoardersAbsent || 0) + (log.boysDayScholarsAbsent || 0);
      acc.absentBoarders += (log.girlsBoardersAbsent || 0) + (log.boysBoardersAbsent || 0);
      acc.absentDayScholars += (log.girlsDayScholarsAbsent || 0) + (log.boysDayScholarsAbsent || 0);
      return acc;
    }, {
      totalPresent: 0,
      totalAbsent: 0,
      presentGirls: 0,
      presentBoys: 0,
      presentBoarders: 0,
      presentDayScholars: 0,
      absentGirls: 0,
      absentBoys: 0,
      absentBoarders: 0,
      absentDayScholars: 0,
    });
  };

  const aggregateRosterSnapshot = (logSet) => {
    return logSet.reduce((acc, log) => {
      acc.totalStudents += log.totalStudents || 0;
      return acc;
    }, { totalStudents: 0 });
  };

  const todayStats = aggregateDailyStats(todayLogs);
  const termDailyStats = aggregateDailyStats(logs);
  const termRosterStats = aggregateRosterSnapshot(dedupedTermLogs);
  const termStats = {
    ...termDailyStats,
    ...termRosterStats,
  };

  return {
    loading, error, logs, todayLogs, todayStats, termStats,
  };
}