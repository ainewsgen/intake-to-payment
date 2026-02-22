import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/reports/utilization
 * Team utilization — hours logged per user, per week
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'time:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const weeks = parseInt(searchParams.get('weeks') || '8', 10);

    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const entries = await prisma.timeEntry.findMany({
        where: {
            projectJob: { project: { tenantId: ctx.tenantId } },
            date: { gte: since },
        },
        select: {
            userId: true,
            hours: true,
            date: true,
            user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: 'asc' },
    });

    // Get Monday of a date
    function getWeekKey(d: Date) {
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return monday.toISOString().slice(0, 10);
    }

    // Per-user totals
    const userMap = new Map<string, { name: string; totalHours: number; weeks: Map<string, number> }>();
    for (const e of entries) {
        const uid = e.userId;
        const user = userMap.get(uid) || {
            name: `${e.user.firstName} ${e.user.lastName}`,
            totalHours: 0,
            weeks: new Map(),
        };
        const hrs = Number(e.hours);
        user.totalHours += hrs;
        const wk = getWeekKey(e.date);
        user.weeks.set(wk, (user.weeks.get(wk) || 0) + hrs);
        userMap.set(uid, user);
    }

    // Collect all week keys
    const allWeeks = new Set<string>();
    for (const u of userMap.values()) {
        for (const wk of u.weeks.keys()) allWeeks.add(wk);
    }
    const weekKeys = Array.from(allWeeks).sort();

    const byUser = Array.from(userMap.entries()).map(([id, u]) => ({
        userId: id,
        name: u.name,
        totalHours: u.totalHours,
        avgHoursPerWeek: weekKeys.length > 0 ? Math.round((u.totalHours / weekKeys.length) * 10) / 10 : 0,
        utilization: weekKeys.length > 0 ? Math.round((u.totalHours / (weekKeys.length * 40)) * 100) : 0,
        weeklyHours: weekKeys.map(wk => ({
            week: wk,
            hours: u.weeks.get(wk) || 0,
        })),
    })).sort((a, b) => b.totalHours - a.totalHours);

    // Team-level weekly totals
    const weeklyTeam = weekKeys.map(wk => {
        const total = entries
            .filter(e => getWeekKey(e.date) === wk)
            .reduce((s, e) => s + Number(e.hours), 0);
        return { week: wk, hours: total };
    });

    const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);

    return apiSuccess({
        data: {
            totalHours,
            teamSize: userMap.size,
            avgUtilization: userMap.size > 0 && weekKeys.length > 0
                ? Math.round((totalHours / (userMap.size * weekKeys.length * 40)) * 100)
                : 0,
            weekKeys,
            weeklyTeam,
            byUser,
        },
    });
}
