import { collection } from 'firebase/firestore';

export const CLASSES_COLLECTION_PATH = 'classes';

export const CANONICAL_CLASSES = [
  // Lower school — PP is a single class, the rest are two streams (J, V)
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

  // Middle school — grades 4-6, two streams each (J, V)
  { id: 'grade-4-j', name: 'Grade 4 J', house: 'J', level: 'Middle School' },
  { id: 'grade-4-v', name: 'Grade 4 V', house: 'V', level: 'Middle School' },
  { id: 'grade-5-j', name: 'Grade 5 J', house: 'J', level: 'Middle School' },
  { id: 'grade-5-v', name: 'Grade 5 V', house: 'V', level: 'Middle School' },
  { id: 'grade-6-j', name: 'Grade 6 J', house: 'J', level: 'Middle School' },
  { id: 'grade-6-v', name: 'Grade 6 V', house: 'V', level: 'Middle School' },

  // Junior secondary — grades 7-9, three streams each (L, N, B)
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

export function getClassesCollectionRef(db) {
  return collection(db, CLASSES_COLLECTION_PATH);
}

export function normalizeClassOptions(rawClasses = []) {
  if (!rawClasses || rawClasses.length === 0) {
    return CANONICAL_CLASSES.map((item) => ({ ...item }));
  }

  return rawClasses
    .map((item) => ({
      id: item.id || item.classId || item.name || '',
      name: item.name || item.className || item.id || 'Unnamed class',
      house: item.house ?? null,
      level: item.level || 'Unknown',
      totalBoys: item.totalBoys ?? 0,
      totalGirls: item.totalGirls ?? 0,
      totalBoarders: item.totalBoarders ?? 0,
      totalDayScholars: item.totalDayScholars ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
