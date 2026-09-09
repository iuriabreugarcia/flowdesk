import { UserRole } from './auth.models';

export function isRoleAllowed(
  role: UserRole,
  allowedRoles: readonly UserRole[]
): boolean {
  return allowedRoles.includes(role);
}
