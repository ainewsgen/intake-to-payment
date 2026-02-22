import { UserRole } from '@prisma/client';

/**
 * RBAC permission definitions.
 * Maps each action to the allowed internal roles.
 * Client users are handled separately via the portal routes.
 */

export type Permission =
    // Tenant & Admin
    | 'tenant:manage'
    | 'integrations:manage'
    | 'users:manage'
    | 'audit:view'
    // Requests
    | 'requests:create'
    | 'requests:view'
    | 'requests:edit'
    // Proposals
    | 'proposals:create'
    | 'proposals:edit'
    | 'proposals:approve'
    | 'proposals:view'
    // Rate Cards
    | 'rate-cards:manage'
    | 'rate-cards:view'
    // Projects
    | 'projects:manage'
    | 'projects:edit'
    | 'projects:view'
    | 'projects:assign'
    // Milestones & Docs
    | 'milestones:manage'
    | 'documents:manage'
    // Time
    | 'time:view-all'
    | 'time:view-own'
    | 'time:view'
    | 'time:log'
    | 'time:approve'
    // Billing
    | 'invoices:create'
    | 'invoices:approve'
    | 'invoices:view'
    // Payroll
    | 'payroll:manage'
    | 'payroll:approve'
    | 'payroll:view-own'
    // OT
    | 'ot:request'
    | 'ot:approve'
    // Clients
    | 'clients:view';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    ADMIN: [
        'tenant:manage',
        'integrations:manage',
        'users:manage',
        'audit:view',
        'requests:create',
        'requests:view',
        'requests:edit',
        'proposals:create',
        'proposals:edit',
        'proposals:approve',
        'proposals:view',
        'rate-cards:manage',
        'rate-cards:view',
        'projects:manage',
        'projects:edit',
        'projects:view',
        'projects:assign',
        'milestones:manage',
        'documents:manage',
        'time:view-all',
        'time:view-own',
        'time:view',
        'time:log',
        'time:approve',
        'invoices:create',
        'invoices:approve',
        'invoices:view',
        'payroll:manage',
        'payroll:approve',
        'payroll:view-own',
        'ot:request',
        'ot:approve',
        'clients:view',
    ],
    ESTIMATOR: [
        'requests:create',
        'requests:view',
        'requests:edit',
        'proposals:create',
        'proposals:edit',
        'proposals:view',
        'rate-cards:view',
        'projects:view',
        'time:view-own',
        'time:view',
        'time:log',
        'ot:request',
        'clients:view',
    ],
    PM: [
        'requests:view',
        'proposals:view',
        'proposals:approve',
        'rate-cards:view',
        'projects:manage',
        'projects:edit',
        'projects:view',
        'projects:assign',
        'milestones:manage',
        'documents:manage',
        'time:view-all',
        'time:view',
        'time:log',
        'time:approve',
        'invoices:view',
        'ot:request',
        'ot:approve',
    ],
    FINANCE: [
        'requests:view',
        'proposals:view',
        'rate-cards:manage',
        'rate-cards:view',
        'projects:view',
        'time:view-all',
        'time:view',
        'time:approve',
        'invoices:create',
        'invoices:approve',
        'invoices:view',
        'payroll:manage',
        'payroll:approve',
        'audit:view',
        'ot:approve',
    ],
    EMPLOYEE: [
        'time:view-own',
        'time:view',
        'time:log',
        'payroll:view-own',
        'ot:request',
    ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
    role: UserRole,
    permissions: Permission[]
): boolean {
    return permissions.some((p) => hasPermission(role, p));
}

export function requirePermission(role: UserRole, permission: Permission): void {
    if (!hasPermission(role, permission)) {
        throw new Error(`Forbidden: role '${role}' lacks permission '${permission}'`);
    }
}

/**
 * Returns all permissions for a given role.
 */
export function getPermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
}
