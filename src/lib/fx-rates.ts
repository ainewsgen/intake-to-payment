import prisma from './prisma';

/**
 * Fetch current FX rates from the free ExchangeRate API.
 * Logs every fetch to the audit trail.
 */
export async function fetchFxRates(
    tenantId: string,
    baseCurrency: string = 'USD'
): Promise<Record<string, number>> {
    const apiUrl = process.env.FX_API_URL || 'https://open.er-api.com/v6/latest';
    const url = `${apiUrl}/${baseCurrency}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch FX rates: ${response.statusText}`);
    }

    const data = await response.json();
    const rates = data.rates as Record<string, number>;

    // Log the rate fetch for audit trail
    await prisma.fxRateLog.create({
        data: {
            tenantId,
            source: 'ExchangeRate-API',
            baseCurrency,
            rates: rates as object,
            fetchedAt: new Date(),
        },
    });

    return rates;
}

/**
 * Get the latest cached FX rate from the DB.
 * Falls back to fetching if no recent rate exists (within maxAgeMinutes).
 */
export async function getFxRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string,
    maxAgeMinutes: number = 60
): Promise<{ rate: number; source: string; fetchedAt: Date }> {
    if (fromCurrency === toCurrency) {
        return { rate: 1, source: 'identity', fetchedAt: new Date() };
    }

    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - maxAgeMinutes);

    // Check for recent cached rate
    const cached = await prisma.fxRateLog.findFirst({
        where: {
            tenantId,
            baseCurrency: fromCurrency,
            fetchedAt: { gte: cutoff },
        },
        orderBy: { fetchedAt: 'desc' },
    });

    if (cached) {
        const rates = cached.rates as Record<string, number>;
        if (rates[toCurrency]) {
            return {
                rate: rates[toCurrency],
                source: 'ExchangeRate-API (cached)',
                fetchedAt: cached.fetchedAt,
            };
        }
    }

    // Fetch fresh rates
    const rates = await fetchFxRates(tenantId, fromCurrency);
    const rate = rates[toCurrency];

    if (!rate) {
        throw new Error(`FX rate not available for ${fromCurrency} → ${toCurrency}`);
    }

    return {
        rate,
        source: 'ExchangeRate-API',
        fetchedAt: new Date(),
    };
}
