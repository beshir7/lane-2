import "server-only";

// Settings — team, sessions, audit reads plus the roles/permissions catalogue.

import { db } from "@/services/db";
import { ROLES, PERMISSIONS, DEFAULT_PERMISSIONS } from "@/lib/reference";

export const listUsers = () => db.users;

export const listSessions = () => db.sessions;

export const listAudit = () => db.audit;

/** Roles, the permission catalogue, and the default role→permission matrix. */
export const getRolesConfig = () => ({
  roles: ROLES,
  permissions: PERMISSIONS,
  matrix: DEFAULT_PERMISSIONS,
});
