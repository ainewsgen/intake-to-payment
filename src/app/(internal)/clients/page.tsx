import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Link from 'next/link';

export default async function ClientsIndexPage() {
    const session = await auth();
    if (!session?.user) return null;

    const clients = await prisma.clientAccount.findMany({
        where: { tenantId: session.user.tenantId },
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { projects: true, requests: true } }
        }
    });

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Client Directory</h1>
                        <p className="page-subtitle">Manage client relationships and 360 views</p>
                    </div>
                    <div>
                        <button className="btn btn-primary" disabled>+ Add Client</button>
                    </div>
                </div>
            </div>

            <div className="page-body">
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Client Name</th>
                                <th>Active Projects</th>
                                <th>Total Requests</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.id}>
                                    <td><strong>{client.name}</strong></td>
                                    <td>{client._count.projects}</td>
                                    <td>{client._count.requests}</td>
                                    <td>
                                        <Link href={`/clients/${client.id}`} className="btn btn-ghost btn-sm">
                                            View 360 →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                        No clients found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
