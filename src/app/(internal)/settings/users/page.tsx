'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './users.module.css';

interface UserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    userType: string;
    isActive: boolean;
    createdAt: string;
    clientAccount: { name: string } | null;
}

const ROLES = ['ADMIN', 'ESTIMATOR', 'PM', 'FINANCE', 'EMPLOYEE'];
const USER_TYPES = ['INTERNAL', 'CLIENT'];

const PERMISSIONS_GROUPS = [
    {
        title: 'General',
        items: ['tenant:manage', 'integrations:manage', 'users:manage', 'audit:view']
    },
    {
        title: 'Requests & Proposals',
        items: ['requests:create', 'requests:view', 'requests:edit', 'proposals:create', 'proposals:edit', 'proposals:approve', 'proposals:view']
    },
    {
        title: 'Projects & Delivery',
        items: ['projects:manage', 'projects:edit', 'projects:view', 'projects:assign', 'milestones:manage', 'documents:manage']
    },
    {
        title: 'Time & Attendance',
        items: ['time:view-all', 'time:view-own', 'time:view', 'time:log', 'time:approve', 'ot:request', 'ot:approve']
    },
    {
        title: 'Finance & Payroll',
        items: ['invoices:create', 'invoices:approve', 'invoices:view', 'payroll:manage', 'payroll:approve', 'payroll:view-own']
    }
];

export default function UsersPage() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '', firstName: '', lastName: '', role: 'EMPLOYEE', userType: 'INTERNAL', password: '',
    });
    const [formLoading, setFormLoading] = useState(false);

    // Permission Modal State
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (roleFilter) params.set('role', roleFilter);
        if (typeFilter) params.set('userType', typeFilter);

        const res = await fetch(`/api/v1/users?${params}`);
        const json = await res.json();
        setUsers(json.data || []);
        setLoading(false);
    }, [search, roleFilter, typeFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);
        await fetch('/api/v1/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inviteForm),
        });
        setShowInvite(false);
        setInviteForm({ email: '', firstName: '', lastName: '', role: 'EMPLOYEE', userType: 'INTERNAL', password: '' });
        setFormLoading(false);
        fetchUsers();
    }

    async function toggleActive(userId: string, isActive: boolean) {
        await fetch(`/api/v1/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !isActive }),
        });
        fetchUsers();
    }

    async function changeRole(userId: string, role: string) {
        await fetch(`/api/v1/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        fetchUsers();
    }

    const openPermissionsModal = (user: UserItem) => {
        setSelectedUser(user);
        // Assuming user.customPermissions is added to UserItem interface
        // For now, let's cast or adjust the interface
        setUserPermissions((user as any).customPermissions || []);
    };

    const savePermissions = async () => {
        if (!selectedUser) return;
        setIsSavingPermissions(true);
        await fetch(`/api/v1/users/${selectedUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customPermissions: userPermissions }),
        });
        setIsSavingPermissions(false);
        setSelectedUser(null);
        fetchUsers();
    };

    const togglePermission = (perm: string) => {
        setUserPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Users</h1>
                        <p className="page-subtitle">Manage team members and client users</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowInvite(!showInvite)}>
                        {showInvite ? 'Cancel' : '+ Invite User'}
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Invite form */}
                {showInvite && (
                    <div className={styles.inviteCard}>
                        <h3 className={styles.inviteTitle}>Invite New User</h3>
                        <form onSubmit={handleInvite} className={styles.inviteForm}>
                            <div className={styles.formGrid}>
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input className="input" value={inviteForm.firstName}
                                        onChange={(e) => setInviteForm(f => ({ ...f, firstName: e.target.value }))}
                                        required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input className="input" value={inviteForm.lastName}
                                        onChange={(e) => setInviteForm(f => ({ ...f, lastName: e.target.value }))}
                                        required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="input" type="email" value={inviteForm.email}
                                        onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                                        required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Temporary Password</label>
                                    <input className="input" type="password" value={inviteForm.password}
                                        onChange={(e) => setInviteForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="changeme123" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="select" value={inviteForm.role}
                                        onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">User Type</label>
                                    <select className="select" value={inviteForm.userType}
                                        onChange={(e) => setInviteForm(f => ({ ...f, userType: e.target.value }))}>
                                        {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button className="btn btn-primary" type="submit" disabled={formLoading}>
                                {formLoading ? 'Creating…' : 'Create User'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className={styles.filters}>
                    <input
                        className="input"
                        placeholder="Search users…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 260 }}
                    />
                    <select className="select" value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 150 }}>
                        <option value="">All roles</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select className="select" value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: 150 }}>
                        <option value="">All types</option>
                        {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
                ) : users.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <div className="empty-state-title">No users found</div>
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className={!user.isActive ? styles.inactive : ''}>
                                            <td>
                                                <div className={styles.userName}>
                                                    <span className={styles.avatar}>
                                                        {user.firstName[0]}{user.lastName[0]}
                                                    </span>
                                                    {user.firstName} {user.lastName}
                                                </div>
                                            </td>
                                            <td className={styles.email}>{user.email}</td>
                                            <td>
                                                <select
                                                    className={styles.roleSelect}
                                                    value={user.role}
                                                    onChange={(e) => changeRole(user.id, e.target.value)}
                                                >
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <span className={styles.typeTag}>
                                                    {user.userType}
                                                </span>
                                                {user.clientAccount && (
                                                    <span className={styles.clientName}>{user.clientAccount.name}</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge badge-${user.isActive ? 'completed' : 'draft'}`}>
                                                    {user.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => openPermissionsModal(user)}
                                                    >
                                                        Permissions
                                                    </button>
                                                    <button
                                                        className={`btn btn-ghost btn-sm ${user.isActive ? styles.deactivateBtn : styles.activateBtn}`}
                                                        onClick={() => toggleActive(user.id, user.isActive)}
                                                    >
                                                        {user.isActive ? 'Disable' : 'Enable'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Permissions Modal */}
            {selectedUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 className={styles.modalTitle}>Manage Permissions</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>✕</button>
                        </div>

                        <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                            Granting specific permissions to <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>.
                            These will override their default role ({selectedUser.role}).
                        </p>

                        {PERMISSIONS_GROUPS.map(group => (
                            <div key={group.title} className={styles.permissionGroup}>
                                <h4 className={styles.groupTitle}>{group.title}</h4>
                                <div className={styles.permissionList}>
                                    {group.items.map(perm => (
                                        <div key={perm} className={styles.permissionItem}>
                                            <input
                                                type="checkbox"
                                                id={perm}
                                                checked={userPermissions.includes(perm)}
                                                onChange={() => togglePermission(perm)}
                                            />
                                            <label htmlFor={perm} style={{ cursor: 'pointer' }}>{perm}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={savePermissions} disabled={isSavingPermissions}>
                                {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

