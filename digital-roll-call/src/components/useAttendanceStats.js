import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export function useAttendanceStats(classId, activeTerm) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [termStats, setTermStats] = useState({});
  const [todayStats, setTodayStats] = useState({});

  useEffect(() => {
    if (!activeTerm) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const logCollection = collection(db, 'attendance_logs');
    
    let q;
    if (classId) {
      q = query(logCollection, where('termId', '==', activeTerm.id), where('classId', '==', classId));
    } else {
      q = query(logCollection, where('termId', '==', activeTerm.id));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(allLogs);

        const todayString = new Date().toISOString().split('T')[0];
        const todayLogsData = allLogs.filter(log => log.date === todayString);
        setTodayLogs(todayLogsData);

        // Fetch holidays to exclude from missing stats
        const eventsRef = collection(db, 'terms', activeTerm.id, 'events');
        const holidayQuery = query(eventsRef, where('type', 'in', ['Holiday', 'Midterm Break', 'Public Holiday']));
        const holidaySnapshot = await getDocs(holidayQuery);
        const holidays = holidaySnapshot.docs.map(doc => doc.data());

        // Calculate stats
        const newTermStats = allLogs.reduce((acc, log) => {
          acc.totalPresent += log.totalPresent || 0;
          acc.totalAbsent += log.totalAbsent || 0;
          acc.totalStudents += log.totalStudents || 0;
          acc.absentGirls += log.girlsBoardersAbsent + log.girlsDayScholarsAbsent;
          acc.absentBoys += log.boysBoardersAbsent + log.boysDayScholarsAbsent;
          acc.absentBoarders += log.girlsBoardersAbsent + log.boysBoardersAbsent;
          acc.absentDayScholars += log.girlsDayScholarsAbsent + log.boysDayScholarsAbsent;
          return acc;
        }, { totalPresent: 0, totalAbsent: 0, totalStudents: 0, absentGirls: 0, absentBoys: 0, absentBoarders: 0, absentDayScholars: 0 });
        setTermStats(newTermStats);

        const newTodayStats = todayLogsData.reduce((acc, log) => {
          acc.totalPresent += log.totalPresent || 0;
          acc.totalAbsent += log.totalAbsent || 0;
          acc.absentGirls += log.girlsBoardersAbsent + log.girlsDayScholarsAbsent;
          acc.absentBoys += log.boysBoardersAbsent + log.boysDayScholarsAbsent;
          acc.absentBoarders += log.girlsBoardersAbsent + log.boysBoardersAbsent;
          acc.absentDayScholars += log.girlsDayScholarsAbsent + log.boysDayScholarsAbsent;
          return acc;
        }, { totalPresent: 0, totalAbsent: 0, absentGirls: 0, absentBoys: 0, absentBoarders: 0, absentDayScholars: 0 });
        setTodayStats(newTodayStats);

        // This is where you would calculate missing submissions, excluding holidays
        // For example:
        const termStart = new Date(activeTerm.startDate);
        const today = new Date();
        let missingCount = 0;
        for (let d = termStart; d <= today; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends

            const dateString = d.toISOString().split('T')[0];
            const isHoliday = holidays.some(h => dateString >= h.startDate && dateString <= h.endDate);
            if (isHoliday) continue;

            const logExists = allLogs.some(log => log.date === dateString);
            if (!logExists) {
                missingCount++;
            }
        }
        // You can then set `missingCount` to state if needed.

      } catch (e) {
        console.error("Error processing attendance stats:", e);
        setError("Failed to process attendance statistics.");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching attendance logs:", err);
      setError("Failed to load attendance data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, activeTerm]);

  return { loading, error, logs, todayLogs, termStats, todayStats };
}