'use client';

import { useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isSystemAdmin: boolean;
    isActive: boolean;
    tenant: { name: string; slug: string };
}

export default function GlobalUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetch(`/api/v1/admin/users?search=${search}`)
                .then(res => res.json())
                .then(json => {
                    setUsers(json.data || []);
                    setLoading(false);
                });
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [search]);

    const toggleSystemAdmin = async (userId: string, currentStatus: boolean) => {
        await fetch(`/api/v1/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isSystemAdmin: !currentStatus })
        });
        setUsers(users.map(u => u.id === userId ? { ...u, isSystemAdmin: !currentStatus } : u));
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Global Users</h1>
                <p className="page-subtitle">View and manage all users across all organizations</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                <input
                    className="input"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: 400 }}
                />
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: 300 }} />
            ) : (
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Organization</th>
                                <th>Role</th>
                                <th>SysAdmin</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>{u.firstName} {u.lastName}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span style={{ fontSize: '0.875rem' }}>{u.tenant.name}</span>
                                        <br />
                                        <code style={{ fontSize: '0.75rem' }}>{u.tenant.slug}</code>
                                    </td>
                                    <td>{u.role}</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={u.isSystemAdmin}
                                            onChange={() => toggleSystemAdmin(u.id, u.isSystemAdmin)}
                                        />
                                    </td>
                                    <td>
                                        <span className={`badge badge-${u.isActive ? 'completed' : 'draft'}`}>
                                            {u.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm">Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
