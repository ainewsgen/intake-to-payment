'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Client360Page() {
    const params = useParams();
    const router = useRouter();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/v1/clients/${params.id}/360`);
            if (!res.ok) {
                router.push('/clients');
                return;
            }
            const json = await res.json();
            setClient(json.data);
            setLoading(false);
        }
        load();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="page-body">
                <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
            </div>
        );
    }

    if (!client) return null;

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                            <Link href="/clients">Clients</Link> <span>/</span> <span>{client.name}</span>
                        </div>
                        <h1 className="page-title">{client.name} - CRM 360°</h1>
                        <p className="page-subtitle">Relationship and Financial Profile</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                    <div className="card">
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Total WIP (Active Budget)</div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600 }}>${client.financials.totalWip.toLocaleString()}</div>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Lifetime Billed (Invoiced)</div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600 }}>${client.financials.totalBilled.toLocaleString()}</div>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Total Contacts</div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600 }}>{client.clientUsers.length}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', minHeight: 300 }}>
                    <div className="card">
                        <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>⚡ Active Pipeline (Intake)</h3>
                        {client.activePipeline.length === 0 ? <p className="empty-state-text">No active pipeline requests.</p> : (
                            <table className="table">
                                <tbody>
                                    {client.activePipeline.map((req: any) => (
                                        <tr key={req.id}>
                                            <td><Link href={`/requests/${req.id}`}>{req.title}</Link></td>
                                            <td style={{ textAlign: 'right' }}><span className={`badge badge-${req.status === 'NEW' ? 'new' : 'active'}`}>{req.status.replace('_', ' ')}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>🚀 Active Delivery (Projects)</h3>
                        {client.activeProjects.length === 0 ? <p className="empty-state-text">No active delivery projects.</p> : (
                            <table className="table">
                                <tbody>
                                    {client.activeProjects.map((proj: any) => (
                                        <tr key={proj.id}>
                                            <td><Link href={`/projects/${proj.id}`}>{proj.name}</Link></td>
                                            <td style={{ textAlign: 'right' }}><span className="badge badge-active">Active</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>📖 Relationship History (Completed Work)</h3>
                    {client.history.length === 0 ? <p className="empty-state-text">No completed past projects found.</p> : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Project Name</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Total Billed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {client.history.map((proj: any) => {
                                    const invoicedAmount = proj.invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
                                    return (
                                        <tr key={proj.id}>
                                            <td><Link href={`/projects/${proj.id}`}>{proj.name}</Link></td>
                                            <td><span className="badge badge-completed">{proj.status}</span></td>
                                            <td style={{ textAlign: 'right' }}>${invoicedAmount.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
