import { collection } from 'firebase/firestore';

export const CLASSES_COLLECTION_PATH = 'classes';

export const CANONICAL_CLASSES = [
  { id: 'pp', name: 'PP', house: null, level: 'Lower School' },
  { id: 'pp1-j', name: 'PP1 J', house: 'J', level: 'Lower School' },
  { id: 'pp1-v', name: 'PP1 V', house: 'V', level: 'Lower School' },
  { id: 'pp2-j', name: 'PP2 J', house: 'J', level: 'Lower School' },
  { id: 'pp2-v', name: 'PP2 V', house: 'V', level: 'Lower School' },
  { id: 'grade-1-j', name: 'Grade 1 J', house: 'J', level: 'Lower School' },
  { id: 'grade-1-v', name: 'Grade 1 V', house: 'V', level: 'Lower School' },
  { id: 'grade-2-j', name: 'Grade 2 J', house: 'J', level: 'Lower School' },
  { id: 'grade-2-v', name: 'Grade 2 V', house: 'V', level: 'Lower School' },
  { id: 'grade-3-j', name: 'Grade 3 J', house: 'J', level: 'Lower School' },
  { id: 'grade-3-v', name: 'Grade 3 V', house: 'V', level: 'Lower School' },
  { id: 'grade-4-j', name: 'Grade 4 J', house: 'J', level: 'Middle School' },
  { id: 'grade-4-v', name: 'Grade 4 V', house: 'V', level: 'Middle School' },
  { id: 'grade-5-j', name: 'Grade 5 J', house: 'J', level: 'Middle School' },
  { id: 'grade-5-v', name: 'Grade 5 V', house: 'V', level: 'Middle School' },
  { id: 'grade-6-j', name: 'Grade 6 J', house: 'J', level: 'Middle School' },
  { id: 'grade-6-v', name: 'Grade 6 V', house: 'V', level: 'Middle School' },
  { id: 'grade-7-l', name: 'Grade 7 L', house: 'L', level: 'Junior Secondary' },
  { id: 'grade-7-n', name: 'Grade 7 N', house: 'N', level: 'Junior Secondary' },
  { id: 'grade-7-b', name: 'Grade 7 B', house: 'B', level: 'Junior Secondary' },
  { id: 'grade-8-l', name: 'Grade 8 L', house: 'L', level: 'Junior Secondary' },
  { id: 'grade-8-n', name: 'Grade 8 N', house: 'N', level: 'Junior Secondary' },
  { id: 'grade-8-b', name: 'Grade 8 B', house: 'B', level: 'Junior Secondary' },
  { id: 'grade-9-l', name: 'Grade 9 L', house: 'L', level: 'Junior Secondary' },
  { id: 'grade-9-n', name: 'Grade 9 N', house: 'N', level: 'Junior Secondary' },
  { id: 'grade-9-b', name: 'Grade 9 B', house: 'B', level: 'Junior Secondary' },
];

export const ROSTER_FIELD_DEFINITIONS = [
  { key: 'totalGirlBoarders', label: 'Girl Boarders' },
  { key: 'totalGirlDayScholars', label: 'Girl Day Scholars' },
  { key: 'totalBoyBoarders', label: 'Boy Boarders' },
  { key: 'totalBoyDayScholars', label: 'Boy Day Scholars' },
];

export function getClassesCollectionRef(db) {
  return collection(db, CLASSES_COLLECTION_PATH);
}

export function getRosterTotals(data = {}) {
  const totalGirlBoarders = Number(data.totalGirlBoarders ?? 0);
  const totalGirlDayScholars = Number(data.totalGirlDayScholars ?? 0);
  const totalBoyBoarders = Number(data.totalBoyBoarders ?? 0);
  const totalBoyDayScholars = Number(data.totalBoyDayScholars ?? 0);

  const totalGirls = (totalGirlBoarders + totalGirlDayScholars) || Number(data.totalGirls ?? 0);
  const totalBoys = (totalBoyBoarders + totalBoyDayScholars) || Number(data.totalBoys ?? 0);
  const totalBoarders = (totalGirlBoarders + totalBoyBoarders) || Number(data.totalBoarders ?? 0);
  const totalDayScholars = (totalGirlDayScholars + totalBoyDayScholars) || Number(data.totalDayScholars ?? 0);

  return {
    totalGirlBoarders,
    totalGirlDayScholars,
    totalBoyBoarders,
    totalBoyDayScholars,
    totalGirls,
    totalBoys,
    totalBoarders,
    totalDayScholars,
    total: totalGirls + totalBoys,
  };
}

export function normalizeClassOptions(rawClasses = []) {
  const classItems = Array.isArray(rawClasses) ? rawClasses : [];
  const canonicalClassIds = new Set(CANONICAL_CLASSES.map((item) => item.id));
  const savedClassMap = new Map();

  classItems.forEach((item) => {
    const resolvedId = item.id || item.classId || item.name || '';
    if (!resolvedId) {
      return;
    }
    savedClassMap.set(resolvedId, item);
  });

  const mergedClasses = CANONICAL_CLASSES.map((canonicalItem) => {
    const savedItem = savedClassMap.get(canonicalItem.id);
    const rosterTotals = savedItem ? getRosterTotals(savedItem) : getRosterTotals({});

    return {
      ...canonicalItem,
      ...rosterTotals,
    };
  });

  const extraClasses = classItems
    .filter((item) => {
      const resolvedId = item.id || item.classId || item.name || '';
      return resolvedId && !canonicalClassIds.has(resolvedId);
    })
    .map((item) => {
      const resolvedId = item.id || item.classId || item.name || '';
      const rosterTotals = getRosterTotals(item);
      return {
        id: resolvedId,
        name: item.name || item.className || resolvedId || 'Unnamed class',
        house: item.house ?? null,
        level: item.level || 'Unknown',
        ...rosterTotals,
      };
    });

  return [...mergedClasses, ...extraClasses].sort((left, right) => left.name.localeCompare(right.name));
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
