export function getCurrentWeekKey(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current.toISOString().split('T')[0];
}

export function getTeacherDisplayName(teacher = {}) {
  return teacher.name || teacher.email || 'Unnamed teacher';
}
