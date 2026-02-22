'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
    stats: { activeProposals: number; activeProjects: number; pendingInvoices: number };
    recentProposals: { id: string; version: number; status: string; totalAmount: number | null; createdAt: string; request: { title: string } }[];
    recentProjects: { id: string; name: string; status: string; createdAt: string; _count: { projectJobs: number; invoices: number } }[];
}

const STATUS_BADGE: Record<string, string> = {
    PENDING_REVIEW: 'active',
    PENDING_APPROVAL: 'new',
    APPROVED: 'completed',
    REJECTED: 'draft',
    ACTIVE: 'active',
    COMPLETED: 'completed',
};

export default function PortalDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/v1/portal/dashboard');
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
            }
            setLoading(false);
        }
        load();
    }, []);

    function formatCurrency(n: number | null) {
        if (!n) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    if (loading) {
        return <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>;
    }

    if (!data) return <div className="card">Unable to load dashboard</div>;

    return (
        <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
                Welcome back
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Here&apos;s an overview of your account
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)' }}>
                        {data.stats.activeProposals}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Active Proposals</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>
                        {data.stats.activeProjects}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Active Projects</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-warning)' }}>
                        {data.stats.pendingInvoices}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Pending Invoices</div>
                </div>
            </div>

            {/* Recent items */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
                        Recent Proposals
                    </h2>
                    <div className="card">
                        {data.recentProposals.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📝</div>
                                <div className="empty-state-title">No proposals</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {data.recentProposals.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/portal/proposals`}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: 'var(--space-3) var(--space-4)',
                                            borderBottom: '1px solid var(--color-border)',
                                            textDecoration: 'none', color: 'inherit',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{p.request.title}</div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>v{p.version}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                                                {formatCurrency(Number(p.totalAmount))}
                                            </span>
                                            <span className={`badge badge-${STATUS_BADGE[p.status] || 'draft'}`}>
                                                {p.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
                        Recent Projects
                    </h2>
                    <div className="card">
                        {data.recentProjects.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📁</div>
                                <div className="empty-state-title">No projects</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {data.recentProjects.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/portal/projects`}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: 'var(--space-3) var(--space-4)',
                                            borderBottom: '1px solid var(--color-border)',
                                            textDecoration: 'none', color: 'inherit',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{p.name}</div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                                {p._count.projectJobs} jobs • {p._count.invoices} invoices
                                            </div>
                                        </div>
                                        <span className={`badge badge-${STATUS_BADGE[p.status] || 'draft'}`}>
                                            {p.status}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
