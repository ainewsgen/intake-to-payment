'use client';

import { useState, useEffect } from 'react';

export default function OrganizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        logoUrl: '',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter'
    });

    useEffect(() => {
        fetch('/api/v1/settings/organization')
            .then(res => res.json())
            .then(json => {
                if (json.data) setForm(json.data);
                setLoading(false);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await fetch('/api/v1/settings/organization', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        setSaving(false);
        // Bonus: Force a reload or update global context if implemented
        window.location.reload();
    };

    if (loading) return <div className="skeleton" style={{ height: 400 }} />;

    return (
        <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Organization Settings</h1>
                <p className="page-subtitle">Configure your organization branding and identity</p>
            </div>

            <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Organization Name</label>
                        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Logo URL</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {form.logoUrl && <img src={form.logoUrl} alt="Logo" style={{ height: 40, width: 40, objectFit: 'contain', border: '1px solid #e5e7eb', padding: 2 }} />}
                            <input className="input" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Primary Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="color" className="input" style={{ width: 50, padding: 2 }} value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} />
                            <input className="input" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Secondary Color</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="color" className="input" style={{ width: 50, padding: 2 }} value={form.secondaryColor} onChange={e => setForm({ ...form, secondaryColor: e.target.value })} />
                            <input className="input" value={form.secondaryColor} onChange={e => setForm({ ...form, secondaryColor: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Preferred Font</label>
                        <select className="select" value={form.fontFamily} onChange={e => setForm({ ...form, fontFamily: e.target.value })}>
                            <option value="Inter">Inter (Modern)</option>
                            <option value="Roboto">Roboto (Clean)</option>
                            <option value="Outfit">Outfit (Premium)</option>
                            <option value="system-ui">System Default</option>
                        </select>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Branding'}
                    </button>
                </div>
            </form>

            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
                <h3 style={{ color: '#991b1b', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Danger Zone</h3>
                <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginBottom: '1rem' }}>Deleting this organization will permanently remove all data, users, and projects.</p>
                <button className="btn" style={{ backgroundColor: '#dc2626', color: 'white' }}>Delete Organization</button>
            </div>
        </div>
    );
}
