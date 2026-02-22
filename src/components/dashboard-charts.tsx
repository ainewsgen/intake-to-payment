'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard-charts.module.css';

interface PipelineData {
    requests: number;
    proposals: number;
    projects: number;
    invoices: number;
}
interface MonthlyRev { month: string; invoiced: number; paid: number }

export default function DashboardCharts() {
    const [pipeline, setPipeline] = useState<PipelineData | null>(null);
    const [monthly, setMonthly] = useState<MonthlyRev[]>([]);

    useEffect(() => {
        async function load() {
            const [dashRes, revRes] = await Promise.all([
                fetch('/api/v1/dashboard'),
                fetch('/api/v1/reports/revenue?months=6'),
            ]);
            if (dashRes.ok) {
                const d = await dashRes.json();
                setPipeline(d.data?.stats || d.data || null);
            }
            if (revRes.ok) {
                const r = await revRes.json();
                setMonthly(r.data?.monthly || []);
            }
        }
        load();
    }, []);

    const stages = pipeline ? [
        { label: 'Requests', value: pipeline.requests, color: '#6366f1' },
        { label: 'Proposals', value: pipeline.proposals, color: '#8b5cf6' },
        { label: 'Projects', value: pipeline.projects, color: '#a78bfa' },
        { label: 'Invoices', value: pipeline.invoices, color: '#c4b5fd' },
    ] : [];
    const maxStage = Math.max(...stages.map(s => s.value), 1);

    const maxRev = Math.max(...monthly.map(m => m.invoiced), 1);

    function fmtK(n: number) {
        return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
    }

    return (
        <div className={styles.chartsRow}>
            {/* Pipeline Funnel */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                <h3 className={styles.chartTitle}>Pipeline</h3>
                <div className={styles.funnel}>
                    {stages.map((s) => (
                        <div key={s.label} className={styles.funnelStage}>
                            <span className={styles.funnelLabel}>{s.label}</span>
                            <div className={styles.funnelTrack}>
                                <div
                                    className={styles.funnelBar}
                                    style={{
                                        width: `${(s.value / maxStage) * 100}%`,
                                        background: s.color,
                                    }}
                                />
                            </div>
                            <span className={styles.funnelValue}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Revenue Sparkline */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                <h3 className={styles.chartTitle}>Revenue (6 months)</h3>
                {monthly.length === 0 ? (
                    <div className={styles.empty}>No revenue data</div>
                ) : (
                    <div className={styles.sparkline}>
                        {monthly.map((m) => (
                            <div key={m.month} className={styles.sparkCol}>
                                <div className={styles.sparkBarWrapper}>
                                    <div
                                        className={styles.sparkBar}
                                        style={{ height: `${(m.invoiced / maxRev) * 100}%` }}
                                        title={`${m.month}: $${m.invoiced.toLocaleString()}`}
                                    >
                                        <div
                                            className={styles.sparkBarPaid}
                                            style={{ height: `${m.invoiced > 0 ? (m.paid / m.invoiced) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <span className={styles.sparkLabel}>
                                    {new Date(m.month + '-15').toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className={styles.sparkValue}>{fmtK(m.invoiced)}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className={styles.legend}>
                    <span><span className={styles.legendDot} style={{ background: '#6366f1' }} /> Invoiced</span>
                    <span><span className={styles.legendDot} style={{ background: '#10b981' }} /> Collected</span>
                </div>
            </div>
        </div>
    );
}
