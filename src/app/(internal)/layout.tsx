import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Sidebar from '@/components/sidebar';
import Providers from '@/components/providers';
import NotificationBell from '@/components/notification-bell';
import GlobalSearch from '@/components/global-search';
import ThemeToggle from '@/components/theme-toggle';

export default async function InternalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    if (session.user.userType === 'CLIENT') {
        redirect('/portal');
    }

    return (
        <Providers>
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', justifyContent: 'flex-end', padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
                        <GlobalSearch />
                        <NotificationBell />
                        <ThemeToggle />
                    </div>
                    {children}
                </main>
            </div>
        </Providers>
    );
}
