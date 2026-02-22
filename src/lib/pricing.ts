import prisma from './prisma';

/**
 * Pricing engine — calculates job line totals from rate card.
 */

interface EstimateInput {
    roleName: string;
    hours: number;
    employeeId?: string;
}

interface PricedEstimate extends EstimateInput {
    hourlyRate: number;
    lineTotal: number;
}

interface PricedJob {
    name: string;
    estimates: PricedEstimate[];
    lineTotal: number;
}

/**
 * Price a set of jobs using the active rate card for the tenant.
 * Fixed-price per job: sum of (hours × rate) for each role/employee.
 */
export async function priceJobs(
    tenantId: string,
    jobs: { name: string; estimates: EstimateInput[] }[]
): Promise<{ pricedJobs: PricedJob[]; totalAmount: number; rateCardId: string }> {
    // Get active rate card
    const rateCard = await prisma.rateCard.findFirst({
        where: { tenantId, isActive: true },
        include: { lines: true },
    });

    if (!rateCard) {
        throw new Error('No active rate card found. Please create a rate card first.');
    }

    const pricedJobs: PricedJob[] = [];
    let totalAmount = 0;

    for (const job of jobs) {
        const pricedEstimates: PricedEstimate[] = [];
        let jobTotal = 0;

        for (const est of job.estimates) {
            // Find matching rate card line
            // Priority: exact employee match > role match
            let line = null;
            if (est.employeeId) {
                line = rateCard.lines.find(
                    (l) => l.employeeId === est.employeeId && l.roleName === est.roleName
                );
            }
            if (!line) {
                line = rateCard.lines.find(
                    (l) => l.roleName === est.roleName && !l.employeeId
                );
            }
            if (!line) {
                // Fall back to any matching role
                line = rateCard.lines.find((l) => l.roleName === est.roleName);
            }

            const hourlyRate = line ? Number(line.hourlyRate) : 0;
            const lineTotal = est.hours * hourlyRate;

            pricedEstimates.push({
                ...est,
                hourlyRate,
                lineTotal,
            });

            jobTotal += lineTotal;
        }

        pricedJobs.push({
            name: job.name,
            estimates: pricedEstimates,
            lineTotal: jobTotal,
        });

        totalAmount += jobTotal;
    }

    return { pricedJobs, totalAmount, rateCardId: rateCard.id };
}

/**
 * Calculate contractor pay for a given period.
 */
export async function calculateContractorPay(
    tenantId: string,
    userId: string,
    hours: number,
    asOfDate: Date = new Date()
): Promise<{ rate: number; currency: string; total: number }> {
    // Get the most recent pay rate effective on or before the given date
    const payRate = await prisma.contractorPayRate.findFirst({
        where: {
            tenantId,
            userId,
            effectiveDate: { lte: asOfDate },
        },
        orderBy: { effectiveDate: 'desc' },
    });

    if (!payRate) {
        throw new Error(`No pay rate found for contractor ${userId}`);
    }

    const rate = Number(payRate.hourlyRate);
    return {
        rate,
        currency: payRate.currency,
        total: hours * rate,
    };
}
