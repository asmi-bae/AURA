export type Role = 'admin' | 'editor' | 'viewer' | 'user';

export interface Permission {
  resource: string;
  action: string[];
}

export const RolePermissions: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', action: ['*'] },
  ],
  editor: [
    { resource: 'workflow', action: ['create', 'read', 'update', 'delete', 'execute'] },
    { resource: 'plugin', action: ['create', 'read', 'update'] },
    { resource: 'user', action: ['read'] },
  ],
  viewer: [
    { resource: 'workflow', action: ['read'] },
    { resource: 'plugin', action: ['read'] },
    { resource: 'execution', action: ['read'] },
  ],
  user: [
    { resource: 'workflow', action: ['read', 'execute'] },
    { resource: 'execution', action: ['read'] },
  ],
};

export class RBACService {
  hasPermission(userRoles: Role[], resource: string, action: string): boolean {
    for (const role of userRoles) {
      const permissions = RolePermissions[role];
      for (const permission of permissions) {
        if (
          (permission.resource === '*' || permission.resource === resource) &&
          (permission.action.includes('*') || permission.action.includes(action))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  hasRole(userRoles: Role[], requiredRole: Role): boolean {
    const roleHierarchy: Record<Role, number> = {
      admin: 4,
      editor: 3,
      viewer: 2,
      user: 1,
    };

    const requiredLevel = roleHierarchy[requiredRole];
    return userRoles.some(role => roleHierarchy[role] >= requiredLevel);
  }

  getPermissions(userRoles: Role[]): Permission[] {
    const allPermissions: Permission[] = [];
    const seen = new Set<string>();

    for (const role of userRoles) {
      for (const permission of RolePermissions[role]) {
        const key = `${permission.resource}:${permission.action.join(',')}`;
        if (!seen.has(key)) {
          allPermissions.push(permission);
          seen.add(key);
        }
      }
    }

    return allPermissions;
  }
}

