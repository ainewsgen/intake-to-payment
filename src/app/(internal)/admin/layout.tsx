'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="admin-container">
            <div className="admin-sidebar" style={{
                width: 240,
                borderRight: '1px solid #e5e7eb',
                height: 'calc(100vh - 64px)',
                padding: '1.5rem',
                backgroundColor: '#f9fafb'
            }}>
                <h2 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    System Admin
                </h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link href="/admin/tenants" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', transition: 'background-color 0.2s' }} className="admin-nav-link">
                        Organizations
                    </Link>
                    <Link href="/admin/users" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', transition: 'background-color 0.2s' }} className="admin-nav-link">
                        Global Users
                    </Link>
                </nav>
            </div>
            <div className="admin-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {children}
            </div>

            <style jsx>{`
                .admin-container {
                    display: flex;
                    min-height: calc(100vh - 64px);
                }
                .admin-nav-link:hover {
                    background-color: #f3f4f6;
                    color: #111827;
                }
            `}</style>
        </div>
    );
}
