'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

interface NavItem {
    label: string;
    href: string;
    icon: string;
    permission?: string;
}

const navSections: { label: string; items: NavItem[] }[] = [
    {
        label: 'Overview',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: '📊' },
        ],
    },
    {
        label: 'Proposals',
        items: [
            { label: 'Requests', href: '/requests', icon: '📥' },
            { label: 'Proposals', href: '/proposals', icon: '📝' },
            { label: 'Rate Cards', href: '/rate-cards', icon: '💰' },
        ],
    },
    {
        label: 'Delivery',
        items: [
            { label: 'Projects', href: '/projects', icon: '📁' },
            { label: 'Time Tracking', href: '/time', icon: '⏱️' },
            { label: 'Review Queue', href: '/time/review', icon: '✅' },
        ],
    },
    {
        label: 'Finance',
        items: [
            { label: 'Billing', href: '/billing', icon: '🧾' },
            { label: 'Payroll', href: '/payroll', icon: '💳' },
        ],
    },
    {
        label: 'Admin',
        items: [
            { label: 'Reports', href: '/reports', icon: '📊' },
            { label: 'Audit Log', href: '/audit', icon: '📋' },
        ],
    },
    {
        label: 'Settings',
        items: [
            { label: 'Organization', href: '/settings/organization', icon: '🏢' },
            { label: 'Users', href: '/settings/users', icon: '👥' },
            { label: 'Integrations', href: '/settings/integrations', icon: '🔗' },
        ],
    },
];

const adminSection = {
    label: 'System Admin',
    items: [
        { label: 'Organizations', href: '/admin/tenants', icon: '🌐' },
        { label: 'Global Users', href: '/admin/users', icon: '👤' },
    ],
};

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const userName = session?.user
        ? `${session.user.firstName} ${session.user.lastName}`
        : '';
    const userRole = session?.user?.role || '';

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-logo">I→P</div>
                <span className="sidebar-brand-name">Intake → Pay</span>
            </div>

            <nav className="sidebar-nav">
                {session?.user?.isSystemAdmin && (
                    <div key="system-admin">
                        <div className="sidebar-section-label">{adminSection.label}</div>
                        {adminSection.items.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                >
                                    <span className="sidebar-link-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
                {navSections.map((section) => (
                    <div key={section.label}>
                        <div className="sidebar-section-label">{section.label}</div>
                        {section.items.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== '/dashboard' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                >
                                    <span className="sidebar-link-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-3)',
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-accent-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            color: 'var(--color-accent)',
                        }}
                    >
                        {userName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: 500,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {userName}
                        </div>
                        <div
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-muted)',
                                textTransform: 'capitalize',
                            }}
                        >
                            {userRole.toLowerCase()}
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => signOut({ callbackUrl: '/login' })}
                >
                    Sign out
                </button>
            </div>
        </aside>
    );
}
