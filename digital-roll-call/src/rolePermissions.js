const ROLE_ALIASES = {
  MANAGER: 'SCHOOL MANAGER',
  'ICT COORDINATOR': 'ICT COORDINATOR',
  DIRECTOR: 'DIRECTOR',
  ADMIN: 'ADMIN',
  'CLASS TEACHER': 'CLASS TEACHER',
  'SCHOOL MANAGER': 'SCHOOL MANAGER',
};

export function normalizeRole(role) {
  if (!role) return null;
  return ROLE_ALIASES[role.toUpperCase()] || role.toUpperCase();
}

export function getAssignableRoles(callerRole) {
  const role = normalizeRole(callerRole);

  if (role === 'DIRECTOR') {
    return ['ADMIN', 'CLASS TEACHER', 'SCHOOL MANAGER'];
  }

  if (role === 'ICT COORDINATOR') {
    return ['CLASS TEACHER'];
  }

  return [];
}

export function canAssignRole(callerRole, targetRole) {
  return getAssignableRoles(callerRole).includes(normalizeRole(targetRole));
}
