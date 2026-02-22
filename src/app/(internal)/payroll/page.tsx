'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './payroll.module.css';

interface PayLine {
    id: string;
    hours: number;
    rate: number;
    currency: string;
    fxRate: number | null;
    totalAmount: number;
    user: { id: string; firstName: string; lastName: string };
}

interface PayRunItem {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    createdAt: string;
    createdBy: { firstName: string; lastName: string };
    approvedBy: { firstName: string; lastName: string } | null;
    lines: PayLine[];
}

const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'draft',
    PENDING_APPROVAL: 'active',
    APPROVED: 'completed',
    EXPORTED: 'new',
};

export default function PayrollPage() {
    const [runs, setRuns] = useState<PayRunItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedRun, setExpandedRun] = useState<string | null>(null);

    const fetchRuns = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        const res = await fetch(`/api/v1/payroll/runs?${params}`);
        const json = await res.json();
        setRuns(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setLoading(false);
    }, [page]);

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    function formatCurrency(n: number, currency = 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
    }

    function getRunTotal(run: PayRunItem): number {
        return run.lines.reduce((s, l) => s + Number(l.totalAmount), 0);
    }

    async function handleExportWise(runId: string) {
        const res = await fetch(`/api/v1/payroll/runs/${runId}/wise-export`, {
            method: 'POST',
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wise-batch-${runId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            fetchRuns();
        }
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Payroll</h1>
                        <p className="page-subtitle">Contractor pay runs and Wise exports</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
                ) : runs.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">💰</div>
                            <div className="empty-state-title">No pay runs</div>
                            <div className="empty-state-text">Create a pay run via the API to get started</div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.runsList}>
                        {runs.map((run) => (
                            <div key={run.id} className={styles.runCard}>
                                <div
                                    className={styles.runHeader}
                                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                                >
                                    <div className={styles.runTitle}>
                                        <span className={`badge badge-${STATUS_BADGE[run.status]}`}>
                                            {run.status.replace(/_/g, ' ')}
                                        </span>
                                        <h3>
                                            {new Date(run.periodStart).toLocaleDateString()} –{' '}
                                            {new Date(run.periodEnd).toLocaleDateString()}
                                        </h3>
                                    </div>
                                    <div className={styles.runMeta}>
                                        <span className={styles.runTotal}>
                                            {formatCurrency(getRunTotal(run))}
                                        </span>
                                        <span className={styles.lineCount}>
                                            {run.lines.length} contractors
                                        </span>
                                        <span className={styles.expandIcon}>
                                            {expandedRun === run.id ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </div>

                                {expandedRun === run.id && (
                                    <div className={styles.runBody}>
                                        <div className="table-wrapper">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Contractor</th>
                                                        <th>Hours</th>
                                                        <th>Rate</th>
                                                        <th>Currency</th>
                                                        <th>FX Rate</th>
                                                        <th>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {run.lines.map((line) => (
                                                        <tr key={line.id}>
                                                            <td>{line.user.firstName} {line.user.lastName}</td>
                                                            <td>{Number(line.hours)}</td>
                                                            <td>{formatCurrency(Number(line.rate), line.currency)}</td>
                                                            <td>{line.currency}</td>
                                                            <td>{line.fxRate ? Number(line.fxRate).toFixed(4) : '—'}</td>
                                                            <td className={styles.totalCell}>
                                                                {formatCurrency(Number(line.totalAmount), line.currency)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td colSpan={5} className={styles.footerLabel}>Total</td>
                                                        <td className={styles.totalCell}>
                                                            {formatCurrency(getRunTotal(run))}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        <div className={styles.runActions}>
                                            <span className={styles.runCreator}>
                                                Created by {run.createdBy.firstName} {run.createdBy.lastName}
                                                {run.approvedBy && (
                                                    <> • Approved by {run.approvedBy.firstName} {run.approvedBy.lastName}</>
                                                )}
                                            </span>
                                            {(run.status === 'APPROVED' || run.status === 'EXPORTED') && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleExportWise(run.id)}
                                                >
                                                    📥 Export Wise CSV
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                        <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                )}
            </div>
        </>
    );
}
