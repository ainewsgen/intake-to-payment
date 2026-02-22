'use client';

import { useState, useEffect } from 'react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    createdAt: string;
    _count: {
        users: number;
        projects: number;
    };
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', slug: '' });

    useEffect(() => {
        fetch('/api/v1/admin/tenants')
            .then(res => res.json())
            .then(json => {
                setTenants(json.data || []);
                setLoading(false);
            });
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/v1/admin/tenants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            const json = await res.json();
            setTenants([json.data, ...tenants]);
            setShowCreate(false);
            setForm({ name: '', slug: '' });
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Organizations</h1>
                    <p className="page-subtitle">Manage all tenant environments in the system</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? 'Cancel' : '+ New Organization'}
                </button>
            </div>

            {showCreate && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                    <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                        <div className="form-group">
                            <label className="form-label">Organization Name</label>
                            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Acme Corp" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Organization Slug (URL)</label>
                            <input className="input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required placeholder="e.g. acme" />
                        </div>
                        <button className="btn btn-primary" type="submit">Create</button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="skeleton" style={{ height: 200 }} />
            ) : (
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Slug</th>
                                <th>Users</th>
                                <th>Projects</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                                    <td><code>{t.slug}</code></td>
                                    <td>{t._count.users}</td>
                                    <td>{t._count.projects}</td>
                                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm">Manage</button>
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
