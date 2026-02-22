'use client';

import './portal.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

function PortalShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <div className="portal-loading">
                <div className="spinner" />
            </div>
        );
    }

    if (!session || session.user.userType !== 'CLIENT') {
        redirect('/login');
    }

    const navItems = [
        { label: 'Dashboard', href: '/portal', icon: '📊' },
        { label: 'Proposals', href: '/portal/proposals', icon: '📝' },
        { label: 'Projects', href: '/portal/projects', icon: '📁' },
        { label: 'Invoices', href: '/portal/invoices', icon: '🧾' },
    ];

    return (
        <div className="portal-layout">
            <header className="portal-header">
                <div className="portal-brand">
                    <span className="portal-logo">I→P</span>
                    <span className="portal-brand-name">Client Portal</span>
                </div>
                <nav className="portal-nav">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/portal' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`portal-nav-link ${isActive ? 'active' : ''}`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="portal-user">
                    <span className="portal-user-name">
                        {session.user.firstName} {session.user.lastName}
                    </span>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        Sign out
                    </button>
                </div>
            </header>
            <main className="portal-main">{children}</main>
        </div>
    );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <PortalShell>{children}</PortalShell>
        </SessionProvider>
    );
}
