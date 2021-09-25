export type Role =
  | 'read'
  | 'get'
  | 'list'
  | 'write'
  | 'create'
  | 'update'
  | 'delete';
export type RolesState = Record<string, Role[]>;

export function canWrite(write: 'create' | 'update' | 'delete', roles: Role[]) {
  return roles.some((role) => role === write || role === 'write');
}
export function canRead(read: 'get' | 'list', roles: Role[]) {
  return roles.some((role) => role === read || role === 'write');
}

export function hasRole(role: Role, roles: Role[]) {
  switch (role) {
    case 'write':
      return roles.includes('write');
    case 'create':
      return canWrite('create', roles);
    case 'delete':
      return canWrite('delete', roles);
    case 'update':
      return canWrite('update', roles);
    case 'read':
      return roles.includes('read');
    case 'get':
      return canRead('get', roles);
    case 'list':
      return canRead('list', roles);
    default:
      return false;
  }
}
