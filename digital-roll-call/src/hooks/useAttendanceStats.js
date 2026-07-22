import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { getRosterTotals } from '../constants/classes';

// Helper function to calculate school days elapsed (excluding weekends & holidays)
function getSchoolDays(termStartDate, holidays = []) {
  if (!termStartDate) return 0;
  const start = new Date(termStartDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (today < start) return 0;

  let count = 0;
  const current = new Date(start);
  
  const holidayRanges = holidays.map(h => ({
    start: new Date(h.startDate + 'T00:00:00'),
    end: new Date(h.endDate + 'T23:59:59'),
  }));

  while (current <= today) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    const isHoliday = holidayRanges.some(
      range => current >= range.start && current <= range.end
    );

    if (!isWeekend && !isHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function useAttendanceStats(classId, activeTerm) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [totalRoster, setTotalRoster] = useState(0);

  const [termStats, setTermStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalStudents: 0,
    absentGirls: 0,
    absentBoys: 0,
    absentBoarders: 0,
    absentDayScholars: 0,
    attendanceRate: 0,
  });

  const [todayStats, setTodayStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    absentGirls: 0,
    absentBoys: 0,
    absentBoarders: 0,
    absentDayScholars: 0,
  });

  useEffect(() => {
    if (!activeTerm) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Fetch Class or School Total Roster dynamically
    let unsubRoster;
    if (classId) {
      const classRef = doc(db, 'classes', classId);
      unsubRoster = onSnapshot(classRef, (snap) => {
        const data = snap.data() || {};
        const rosterTotals = getRosterTotals(data);
        setTotalRoster(rosterTotals.totalGirls + rosterTotals.totalBoys);
      });
    } else {
      const classesRef = collection(db, 'classes');
      unsubRoster = onSnapshot(classesRef, (snap) => {
        const total = snap.docs.reduce((acc, docSnap) => {
          const data = docSnap.data() || {};
          const rosterTotals = getRosterTotals(data);
          return acc + rosterTotals.totalGirls + rosterTotals.totalBoys;
        }, 0);
        setTotalRoster(total);
      });
    }

    // 2. Fetch Attendance Logs for the active term
    const logCollection = collection(db, 'attendance_logs');
    let q = query(logCollection, where('termId', '==', activeTerm.id));
    
    if (classId) {
      q = query(
        logCollection,
        where('termId', '==', activeTerm.id),
        where('classId', '==', classId)
      );
    }

    const unsubLogs = onSnapshot(q, async (snapshot) => {
      try {
        const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(allLogs);

        const todayString = new Date().toISOString().split('T')[0];
        const todayLogsData = allLogs.filter(log => log.date === todayString);
        setTodayLogs(todayLogsData);

        // 3. Fetch Holidays to calculate active school days accurately
        const eventsRef = collection(db, 'terms', activeTerm.id, 'events');
        const holidayQuery = query(
          eventsRef,
          where('type', 'in', ['HOLIDAY', 'MIDTERM_BREAK', 'BREAK', 'Holiday', 'Midterm Break', 'Public Holiday'])
        );
        const holidaySnapshot = await getDocs(holidayQuery);
        const holidays = holidaySnapshot.docs.map(d => d.data());

        // 4. Calculate School Days Elapsed & Attendance Rate (%)
        const schoolDaysElapsed = getSchoolDays(activeTerm.startDate, holidays);

        const newTermStats = allLogs.reduce((acc, log) => {
          acc.totalPresent += log.totalPresent || 0;
          acc.totalAbsent += log.totalAbsent || 0;
          acc.totalStudents += log.totalStudents || 0;
          acc.absentGirls += (log.girlsBoardersAbsent || 0) + (log.girlsDayScholarsAbsent || 0);
          acc.absentBoys += (log.boysBoardersAbsent || 0) + (log.boysDayScholarsAbsent || 0);
          acc.absentBoarders += (log.girlsBoardersAbsent || 0) + (log.boysBoardersAbsent || 0);
          acc.absentDayScholars += (log.girlsDayScholarsAbsent || 0) + (log.boysDayScholarsAbsent || 0);
          return acc;
        }, {
          totalPresent: 0,
          totalAbsent: 0,
          totalStudents: 0,
          absentGirls: 0,
          absentBoys: 0,
          absentBoarders: 0,
          absentDayScholars: 0,
        });

        // Term Attendance Rate Calculation
        const possibleStudentDays = totalRoster * schoolDaysElapsed;
        newTermStats.attendanceRate = possibleStudentDays > 0 
          ? Number(((newTermStats.totalPresent / possibleStudentDays) * 100).toFixed(1)) 
          : 0;

        setTermStats(newTermStats);

        // 5. Calculate Today's Stats
        const newTodayStats = todayLogsData.reduce((acc, log) => {
          acc.totalPresent += log.totalPresent || 0;
          acc.totalAbsent += log.totalAbsent || 0;
          acc.absentGirls += (log.girlsBoardersAbsent || 0) + (log.girlsDayScholarsAbsent || 0);
          acc.absentBoys += (log.boysBoardersAbsent || 0) + (log.boysDayScholarsAbsent || 0);
          acc.absentBoarders += (log.girlsBoardersAbsent || 0) + (log.boysBoardersAbsent || 0);
          acc.absentDayScholars += (log.girlsDayScholarsAbsent || 0) + (log.boysDayScholarsAbsent || 0);
          return acc;
        }, {
          totalPresent: 0,
          totalAbsent: 0,
          absentGirls: 0,
          absentBoys: 0,
          absentBoarders: 0,
          absentDayScholars: 0,
        });

        setTodayStats(newTodayStats);
        setError('');
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

    return () => {
      if (unsubRoster) unsubRoster();
      if (unsubLogs) unsubLogs();
    };
  }, [classId, activeTerm, totalRoster]);

  return { loading, error, logs, todayLogs, termStats, todayStats, totalRoster };
}