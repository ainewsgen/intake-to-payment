'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './time.module.css';

interface TimeEntry {
    id: string;
    hours: number;
    notes: string | null;
    date: string;
    source: string;
    approved: boolean;
    projectJob: {
        project: { id: string; name: string };
        job: { name: string };
        id: string;
    };
}

interface ProjectJobOption {
    id: string;
    projectName: string;
    jobName: string;
}

export default function TimeTrackingPage() {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [projectJobs, setProjectJobs] = useState<ProjectJobOption[]>([]);
    const [form, setForm] = useState({
        projectJobId: '',
        date: new Date().toISOString().slice(0, 10),
        hours: '',
        notes: '',
    });
    const [formLoading, setFormLoading] = useState(false);

    // Get week boundaries
    function getWeekRange(offset: number) {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { from: monday, to: sunday };
    }

    const { from, to } = getWeekRange(weekOffset);
    const weekLabel = `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ from: fromStr, to: toStr });
        const res = await fetch(`/api/v1/time-entries?${params}`);
        const json = await res.json();
        setEntries(json.data || []);
        setLoading(false);
    }, [fromStr, toStr]);

    // Fetch active project jobs for the form
    useEffect(() => {
        async function loadProjects() {
            const res = await fetch('/api/v1/projects?limit=50');
            const json = await res.json();
            const options: ProjectJobOption[] = [];
            for (const proj of json.data || []) {
                if (proj.projectJobs) {
                    for (const pj of proj.projectJobs) {
                        options.push({
                            id: pj.id,
                            projectName: proj.name,
                            jobName: pj.job?.name || 'General',
                        });
                    }
                }
            }
            setProjectJobs(options);
        }
        loadProjects();
    }, []);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);
        await fetch('/api/v1/time-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectJobId: form.projectJobId,
                date: form.date,
                hours: parseFloat(form.hours),
                notes: form.notes || null,
            }),
        });
        setFormLoading(false);
        setShowForm(false);
        setForm(f => ({ ...f, hours: '', notes: '' }));
        fetchEntries();
    }

    // Group entries by date
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days: { date: Date; label: string; entries: TimeEntry[] }[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(from);
        d.setDate(from.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        days.push({
            date: d,
            label: dayNames[i],
            entries: entries.filter(e => e.date.slice(0, 10) === dateStr),
        });
    }

    const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Time Tracking</h1>
                        <p className="page-subtitle">{weekLabel}</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.weekNav}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}
                                disabled={weekOffset === 0}>Today</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? 'Cancel' : '+ Log Time'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Stats bar */}
                <div className={styles.statsBar}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{totalHours.toFixed(1)}h</span>
                        <span className={styles.statLabel}>Total</span>
                    </div>
                    <div className={styles.utilBar}>
                        <div className={styles.utilFill} style={{ width: `${Math.min(100, (totalHours / 40) * 100)}%` }} />
                    </div>
                    <span className={styles.utilLabel}>{Math.round((totalHours / 40) * 100)}% of 40h</span>
                </div>

                {/* Log form */}
                {showForm && (
                    <div className={styles.formCard}>
                        <form onSubmit={handleSubmit} className={styles.entryForm}>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Project / Job</label>
                                <select className="select" value={form.projectJobId}
                                    onChange={(e) => setForm(f => ({ ...f, projectJobId: e.target.value }))} required>
                                    <option value="">Select…</option>
                                    {projectJobs.map(pj => (
                                        <option key={pj.id} value={pj.id}>
                                            {pj.projectName} → {pj.jobName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input className="input" type="date" value={form.date}
                                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hours</label>
                                <input className="input" type="number" step="0.25" min="0.25" max="24"
                                    placeholder="0.0" value={form.hours}
                                    onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))} required />
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Notes</label>
                                <input className="input" placeholder="What did you work on?"
                                    value={form.notes}
                                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">&nbsp;</label>
                                <button className="btn btn-primary" type="submit" disabled={formLoading}>
                                    {formLoading ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Weekly grid */}
                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
                ) : (
                    <div className={styles.weekGrid}>
                        {days.map((day, idx) => {
                            const dayTotal = day.entries.reduce((s, e) => s + Number(e.hours), 0);
                            const isToday = day.date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                            const isWeekend = idx >= 5;

                            return (
                                <div key={idx} className={`${styles.dayColumn} ${isToday ? styles.today : ''} ${isWeekend ? styles.weekend : ''}`}>
                                    <div className={styles.dayHeader}>
                                        <span className={styles.dayName}>{day.label}</span>
                                        <span className={styles.dayDate}>{day.date.getDate()}</span>
                                        {dayTotal > 0 && <span className={styles.dayTotal}>{dayTotal.toFixed(1)}h</span>}
                                    </div>
                                    <div className={styles.dayEntries}>
                                        {day.entries.length === 0 ? (
                                            <div className={styles.emptyDay}>—</div>
                                        ) : (
                                            day.entries.map((entry) => (
                                                <div key={entry.id} className={styles.entryBlock}>
                                                    <div className={styles.entryHours}>{Number(entry.hours).toFixed(1)}h</div>
                                                    <div className={styles.entryProject}>
                                                        {entry.projectJob.project.name}
                                                    </div>
                                                    <div className={styles.entryJob}>{entry.projectJob.job.name}</div>
                                                    {entry.notes && (
                                                        <div className={styles.entryDesc}>{entry.notes}</div>
                                                    )}
                                                    {entry.approved && (
                                                        <span className={styles.approvedTag}>✓ Approved</span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
