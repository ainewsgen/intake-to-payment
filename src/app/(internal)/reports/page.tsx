'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './reports.module.css';

type Tab = 'revenue' | 'utilization' | 'profitability';

interface MonthlyRev { month: string; invoiced: number; paid: number; pending: number }
interface ClientRev { id: string; name: string; invoiced: number; paid: number }
interface ProjectRev { id: string; name: string; client: string; invoiced: number; paid: number }
interface RevData {
    totals: { invoiced: number; paid: number; pending: number };
    monthly: MonthlyRev[];
    byClient: ClientRev[];
    byProject: ProjectRev[];
}

interface WeeklyHours { week: string; hours: number }
interface UserUtil {
    userId: string; name: string; totalHours: number;
    avgHoursPerWeek: number; utilization: number;
    weeklyHours: WeeklyHours[];
}
interface UtilData {
    totalHours: number; teamSize: number; avgUtilization: number;
    weekKeys: string[]; weeklyTeam: WeeklyHours[]; byUser: UserUtil[];
}

interface ProjectProfit {
    id: string; name: string; status: string; client: string;
    totalInvoiced: number; totalPaid: number;
    totalEstimatedHours: number; totalActualHours: number;
    hoursVariance: number; effectiveRate: number;
}
interface ProfitData {
    projects: ProjectProfit[];
    totals: { invoiced: number; paid: number; estimatedHours: number; actualHours: number };
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function BarChart({ data, maxVal, label }: { data: { key: string; value: number; secondary?: number }[]; maxVal: number; label: string }) {
    return (
        <div className={styles.barChart}>
            <div className={styles.barChartLabel}>{label}</div>
            {data.map((d) => (
                <div key={d.key} className={styles.barRow}>
                    <span className={styles.barKey}>{d.key}</span>
                    <div className={styles.barTrack}>
                        <div className={styles.barFill}
                            style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }} />
                        {d.secondary !== undefined && d.secondary > 0 && (
                            <div className={styles.barFillSecondary}
                                style={{ width: `${maxVal > 0 ? (d.secondary / maxVal) * 100 : 0}%` }} />
                        )}
                    </div>
                    <span className={styles.barValue}>{formatCurrency(d.value)}</span>
                </div>
            ))}
        </div>
    );
}

function HeatCell({ value, max }: { value: number; max: number }) {
    const intensity = max > 0 ? Math.min(1, value / max) : 0;
    const bg = value === 0
        ? 'var(--color-bg-tertiary)'
        : `rgba(99, 102, 241, ${0.15 + intensity * 0.6})`;
    return (
        <td className={styles.heatCell} style={{ background: bg }}>
            {value > 0 ? value.toFixed(1) : ''}
        </td>
    );
}

export default function ReportsPage() {
    const [tab, setTab] = useState<Tab>('revenue');
    const [revData, setRevData] = useState<RevData | null>(null);
    const [utilData, setUtilData] = useState<UtilData | null>(null);
    const [profitData, setProfitData] = useState<ProfitData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (t: Tab) => {
        setLoading(true);
        const endpoints: Record<Tab, string> = {
            revenue: '/api/v1/reports/revenue',
            utilization: '/api/v1/reports/utilization',
            profitability: '/api/v1/reports/profitability',
        };
        const res = await fetch(endpoints[t]);
        const json = await res.json();
        if (t === 'revenue') setRevData(json.data);
        if (t === 'utilization') setUtilData(json.data);
        if (t === 'profitability') setProfitData(json.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(tab); }, [tab, fetchData]);

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Reports & Analytics</h1>
                        <p className="page-subtitle">Revenue, utilization, and profitability insights</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Tabs */}
                <div className={styles.tabs}>
                    {(['revenue', 'utilization', 'profitability'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t === 'revenue' && '💰'} {t === 'utilization' && '⏱️'} {t === 'profitability' && '📊'}
                            {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 400 }} /></div>
                ) : (
                    <>
                        {/* Revenue */}
                        {tab === 'revenue' && revData && (
                            <div className={styles.reportContent}>
                                <div className={styles.kpiRow}>
                                    <div className={styles.kpi}>
                                        <span className={styles.kpiValue}>{formatCurrency(revData.totals.invoiced)}</span>
                                        <span className={styles.kpiLabel}>Total Invoiced</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={`${styles.kpiValue} ${styles.success}`}>{formatCurrency(revData.totals.paid)}</span>
                                        <span className={styles.kpiLabel}>Collected</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={`${styles.kpiValue} ${styles.warning}`}>{formatCurrency(revData.totals.pending)}</span>
                                        <span className={styles.kpiLabel}>Outstanding</span>
                                    </div>
                                </div>

                                {revData.monthly.length > 0 && (
                                    <div className="card" style={{ padding: 'var(--space-5)' }}>
                                        <h3 className={styles.sectionTitle}>Monthly Revenue</h3>
                                        <BarChart
                                            label=""
                                            data={revData.monthly.map(m => ({ key: m.month, value: m.invoiced, secondary: m.paid }))}
                                            maxVal={Math.max(...revData.monthly.map(m => m.invoiced), 1)}
                                        />
                                    </div>
                                )}

                                <div className={styles.twoCol}>
                                    <div className="card" style={{ padding: 'var(--space-5)' }}>
                                        <h3 className={styles.sectionTitle}>By Client</h3>
                                        {revData.byClient.length === 0 ? (
                                            <p className={styles.empty}>No data</p>
                                        ) : (
                                            <BarChart
                                                label=""
                                                data={revData.byClient.map(c => ({ key: c.name, value: c.invoiced, secondary: c.paid }))}
                                                maxVal={Math.max(...revData.byClient.map(c => c.invoiced), 1)}
                                            />
                                        )}
                                    </div>
                                    <div className="card" style={{ padding: 'var(--space-5)' }}>
                                        <h3 className={styles.sectionTitle}>By Project</h3>
                                        {revData.byProject.length === 0 ? (
                                            <p className={styles.empty}>No data</p>
                                        ) : (
                                            <BarChart
                                                label=""
                                                data={revData.byProject.slice(0, 8).map(p => ({ key: p.name, value: p.invoiced, secondary: p.paid }))}
                                                maxVal={Math.max(...revData.byProject.map(p => p.invoiced), 1)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Utilization */}
                        {tab === 'utilization' && utilData && (
                            <div className={styles.reportContent}>
                                <div className={styles.kpiRow}>
                                    <div className={styles.kpi}>
                                        <span className={styles.kpiValue}>{utilData.totalHours.toFixed(0)}h</span>
                                        <span className={styles.kpiLabel}>Total Hours</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={styles.kpiValue}>{utilData.teamSize}</span>
                                        <span className={styles.kpiLabel}>Team Members</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={`${styles.kpiValue} ${utilData.avgUtilization >= 80 ? styles.success : utilData.avgUtilization >= 50 ? styles.warning : ''}`}>
                                            {utilData.avgUtilization}%
                                        </span>
                                        <span className={styles.kpiLabel}>Avg Utilization</span>
                                    </div>
                                </div>

                                {utilData.byUser.length > 0 && (
                                    <div className="card" style={{ padding: 'var(--space-4)' }}>
                                        <h3 className={styles.sectionTitle}>Utilization Heatmap</h3>
                                        <div className="table-wrapper">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Team Member</th>
                                                        {utilData.weekKeys.map(wk => (
                                                            <th key={wk} className={styles.weekTh}>
                                                                {new Date(wk + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </th>
                                                        ))}
                                                        <th style={{ textAlign: 'right' }}>Total</th>
                                                        <th style={{ textAlign: 'right' }}>Avg/wk</th>
                                                        <th style={{ textAlign: 'right' }}>Util %</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {utilData.byUser.map((u) => (
                                                        <tr key={u.userId}>
                                                            <td className={styles.userName}>{u.name}</td>
                                                            {u.weeklyHours.map((wh) => (
                                                                <HeatCell key={wh.week} value={wh.hours} max={40} />
                                                            ))}
                                                            <td className={styles.numCell}>{u.totalHours.toFixed(1)}</td>
                                                            <td className={styles.numCell}>{u.avgHoursPerWeek}</td>
                                                            <td className={styles.numCell}>
                                                                <span className={`${styles.utilBadge} ${u.utilization >= 80 ? styles.utilHigh : u.utilization >= 50 ? styles.utilMid : styles.utilLow}`}>
                                                                    {u.utilization}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Profitability */}
                        {tab === 'profitability' && profitData && (
                            <div className={styles.reportContent}>
                                <div className={styles.kpiRow}>
                                    <div className={styles.kpi}>
                                        <span className={styles.kpiValue}>{formatCurrency(profitData.totals.invoiced)}</span>
                                        <span className={styles.kpiLabel}>Revenue</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={styles.kpiValue}>{profitData.totals.estimatedHours.toFixed(0)}h</span>
                                        <span className={styles.kpiLabel}>Estimated</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={styles.kpiValue}>{profitData.totals.actualHours.toFixed(0)}h</span>
                                        <span className={styles.kpiLabel}>Actual</span>
                                    </div>
                                    <div className={styles.kpi}>
                                        <span className={`${styles.kpiValue} ${profitData.totals.actualHours <= profitData.totals.estimatedHours ? styles.success : styles.warning}`}>
                                            {profitData.totals.estimatedHours > 0
                                                ? `${Math.round(((profitData.totals.actualHours - profitData.totals.estimatedHours) / profitData.totals.estimatedHours) * 100)}%`
                                                : '—'}
                                        </span>
                                        <span className={styles.kpiLabel}>Hours Variance</span>
                                    </div>
                                </div>

                                {profitData.projects.length > 0 && (
                                    <div className="card" style={{ padding: 'var(--space-4)' }}>
                                        <h3 className={styles.sectionTitle}>Project Profitability</h3>
                                        <div className="table-wrapper">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Project</th>
                                                        <th>Client</th>
                                                        <th>Status</th>
                                                        <th style={{ textAlign: 'right' }}>Revenue</th>
                                                        <th style={{ textAlign: 'right' }}>Est. Hours</th>
                                                        <th style={{ textAlign: 'right' }}>Act. Hours</th>
                                                        <th style={{ textAlign: 'right' }}>Variance</th>
                                                        <th style={{ textAlign: 'right' }}>Eff. Rate</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {profitData.projects.map((p) => (
                                                        <tr key={p.id}>
                                                            <td className={styles.projectName}>{p.name}</td>
                                                            <td>{p.client}</td>
                                                            <td><span className={`badge badge-${p.status === 'ACTIVE' ? 'active' : p.status === 'COMPLETED' ? 'completed' : 'draft'}`}>{p.status}</span></td>
                                                            <td className={styles.numCell}>{formatCurrency(p.totalInvoiced)}</td>
                                                            <td className={styles.numCell}>{p.totalEstimatedHours.toFixed(0)}h</td>
                                                            <td className={styles.numCell}>{p.totalActualHours.toFixed(1)}h</td>
                                                            <td className={styles.numCell}>
                                                                <span className={p.hoursVariance <= 0 ? styles.success : styles.warning}>
                                                                    {p.hoursVariance > 0 ? '+' : ''}{p.hoursVariance}%
                                                                </span>
                                                            </td>
                                                            <td className={styles.numCell}>
                                                                {p.effectiveRate > 0 ? `$${p.effectiveRate.toFixed(0)}/h` : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
