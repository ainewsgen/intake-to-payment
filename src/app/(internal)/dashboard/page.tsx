import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import styles from './dashboard.module.css';
import DashboardCharts from '@/components/dashboard-charts';
import ActivityTimeline from '@/components/activity-timeline';

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user) return null;

    const { tenantId } = session.user;

    // Fetch stats
    const [
        requestCount,
        activeProposalCount,
        activeProjectCount,
        pendingInvoiceCount,
    ] = await Promise.all([
        prisma.request.count({ where: { tenantId, status: 'NEW' } }),
        prisma.proposal.count({
            where: { tenantId, status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL'] } },
        }),
        prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
        prisma.invoice.count({
            where: {
                project: { tenantId },
                status: { in: ['PENDING', 'SENT'] },
            },
        }),
    ]);

    // Recent requests
    const recentRequests = await prisma.request.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { createdBy: { select: { firstName: true, lastName: true } } },
    });

    // Active projects
    const activeProjects = await prisma.project.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
            clientAccount: { select: { name: true } },
            pmUser: { select: { firstName: true, lastName: true } },
        },
    });

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">
                            Welcome back, {session.user.firstName}
                        </p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">New Requests</div>
                        <div className="stat-value">{requestCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Active Proposals</div>
                        <div className="stat-value">{activeProposalCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Active Projects</div>
                        <div className="stat-value">{activeProjectCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending Invoices</div>
                        <div className="stat-value">{pendingInvoiceCount}</div>
                    </div>
                </div>

                {/* Charts */}
                <DashboardCharts />

                {/* Two-column layout */}
                <div className={styles.dashGrid}>
                    {/* Recent Requests */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Requests</h3>
                            <a href="/requests" className="btn btn-ghost btn-sm">View all</a>
                        </div>
                        {recentRequests.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📥</div>
                                <div className="empty-state-title">No requests yet</div>
                                <div className="empty-state-text">
                                    Create your first request to get started
                                </div>
                                <a href="/requests/new" className="btn btn-primary">
                                    New Request
                                </a>
                            </div>
                        ) : (
                            <div className={styles.itemList}>
                                {recentRequests.map((req) => (
                                    <a
                                        key={req.id}
                                        href={`/requests/${req.id}`}
                                        className={styles.item}
                                    >
                                        <div className={styles.itemMain}>
                                            <div className={styles.itemTitle}>{req.title}</div>
                                            <div className={styles.itemMeta}>
                                                {req.clientName || 'No client'} •{' '}
                                                {req.createdBy.firstName} {req.createdBy.lastName}
                                            </div>
                                        </div>
                                        <span className={`badge badge-${req.status === 'NEW' ? 'new' : 'active'}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Projects */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Active Projects</h3>
                            <a href="/projects" className="btn btn-ghost btn-sm">View all</a>
                        </div>
                        {activeProjects.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📁</div>
                                <div className="empty-state-title">No active projects</div>
                                <div className="empty-state-text">
                                    Projects are created when proposals are approved
                                </div>
                            </div>
                        ) : (
                            <div className={styles.itemList}>
                                {activeProjects.map((proj) => (
                                    <a
                                        key={proj.id}
                                        href={`/projects/${proj.id}`}
                                        className={styles.item}
                                    >
                                        <div className={styles.itemMain}>
                                            <div className={styles.itemTitle}>{proj.name}</div>
                                            <div className={styles.itemMeta}>
                                                {proj.clientAccount.name} •{' '}
                                                PM: {proj.pmUser.firstName} {proj.pmUser.lastName}
                                            </div>
                                        </div>
                                        <span className="badge badge-active">Active</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <div className="card-header">
                        <h3 className="card-title">Recent Activity</h3>
                        <a href="/audit" className="btn btn-ghost btn-sm">View all</a>
                    </div>
                    <ActivityTimeline limit={10} />
                </div>
            </div>
        </>
    );
}
