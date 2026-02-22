'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './rate-cards.module.css';

interface RateItem {
    roleName: string;
    hourlyRate: number;
    currency: string;
}

interface RateCard {
    id: string;
    name: string;
    effectiveDate: string;
    isActive: boolean;
    lines: RateItem[];
    createdAt: string;
}

export default function RateCardsPage() {
    const [cards, setCards] = useState<RateCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        name: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        lines: [{ roleName: '', hourlyRate: 0, currency: 'USD' }],
    });
    const [formLoading, setFormLoading] = useState(false);

    const fetchCards = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/v1/rate-cards');
        const json = await res.json();
        setCards(json.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCards(); }, [fetchCards]);

    function formatRate(cents: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
    }

    function addRateRow() {
        setForm(f => ({
            ...f,
            lines: [...f.lines, { roleName: '', hourlyRate: 0, currency: 'USD' }],
        }));
    }

    function removeRateRow(idx: number) {
        setForm(f => ({
            ...f,
            lines: f.lines.filter((_, i) => i !== idx),
        }));
    }

    function updateRate(idx: number, field: string, value: string | number) {
        setForm(f => ({
            ...f,
            lines: f.lines.map((r, i) => i === idx ? { ...r, [field]: value } : r),
        }));
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);
        await fetch('/api/v1/rate-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setShowCreate(false);
        setForm({ name: '', effectiveDate: new Date().toISOString().slice(0, 10), lines: [{ roleName: '', hourlyRate: 0, currency: 'USD' }] });
        setFormLoading(false);
        fetchCards();
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Rate Cards</h1>
                        <p className="page-subtitle">Manage pricing templates for proposals</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                        {showCreate ? 'Cancel' : '+ New Rate Card'}
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Create form */}
                {showCreate && (
                    <div className={styles.createCard}>
                        <h3 className={styles.createTitle}>New Rate Card</h3>
                        <form onSubmit={handleCreate} className={styles.createForm}>
                            <div className={styles.formRow}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Name</label>
                                    <input className="input" value={form.name}
                                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Standard 2025" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Effective From</label>
                                    <input className="input" type="date" value={form.effectiveDate}
                                        onChange={(e) => setForm(f => ({ ...f, effectiveDate: e.target.value }))} required />
                                </div>
                            </div>

                            <div className={styles.ratesSection}>
                                <div className={styles.ratesSectionHeader}>
                                    <span className={styles.ratesLabel}>Rates</span>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={addRateRow}>
                                        + Add Role
                                    </button>
                                </div>
                                {form.lines.map((rate, idx) => (
                                    <div key={idx} className={styles.rateRow}>
                                        <input
                                            className="input"
                                            placeholder="Role title (e.g. Senior Engineer)"
                                            value={rate.roleName}
                                            onChange={(e) => updateRate(idx, 'roleName', e.target.value)}
                                            required
                                        />
                                        <div className={styles.rateInput}>
                                            <span className={styles.rateCurrency}>$</span>
                                            <input
                                                className="input"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={rate.hourlyRate ? (rate.hourlyRate / 100).toFixed(2) : ''}
                                                onChange={(e) => updateRate(idx, 'hourlyRate', Math.round(parseFloat(e.target.value || '0') * 100))}
                                                required
                                            />
                                            <span className={styles.rateUnit}>/hr</span>
                                        </div>
                                        {form.lines.length > 1 && (
                                            <button type="button" className={styles.removeBtn} onClick={() => removeRateRow(idx)}>✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-primary" type="submit" disabled={formLoading}>
                                {formLoading ? 'Creating…' : 'Create Rate Card'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Card List */}
                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
                ) : cards.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">💰</div>
                            <div className="empty-state-title">No rate cards</div>
                            <div className="empty-state-text">Create your first rate card to start pricing proposals</div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.cardList}>
                        {cards.map((card) => (
                            <div key={card.id} className={styles.rateCard}>
                                <div
                                    className={styles.cardHeader}
                                    onClick={() => setExpandedId(expandedId === card.id ? null : card.id)}
                                >
                                    <div className={styles.cardInfo}>
                                        <h3>{card.name}</h3>
                                        <div className={styles.cardMeta}>
                                            Effective {new Date(card.effectiveDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className={styles.cardRight}>
                                        <span className={styles.rateCount}>{card.lines.length} roles</span>
                                        <span className={`badge badge-${card.isActive ? 'completed' : 'draft'}`}>
                                            {card.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className={styles.expand}>{expandedId === card.id ? '▼' : '▶'}</span>
                                    </div>
                                </div>

                                {expandedId === card.id && (
                                    <div className={styles.cardBody}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Role</th>
                                                    <th style={{ textAlign: 'right' }}>Rate</th>
                                                    <th>Currency</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {card.lines.map((rate, idx) => (
                                                    <tr key={idx}>
                                                        <td>{rate.roleName}</td>
                                                        <td className={styles.rateValue}>{formatRate(rate.hourlyRate)}</td>
                                                        <td>{rate.currency}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
