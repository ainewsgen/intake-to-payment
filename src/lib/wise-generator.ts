/**
 * Wise Batch File Generator
 * Generates CSV/XLSX files in Wise batch payment template format.
 */

interface WisePaymentLine {
    recipientName: string;
    recipientEmail?: string;
    sourceCurrency: string;
    targetCurrency: string;
    amountCurrency: string;
    amount: number;
    reference: string;
    recipientAccountNumber?: string;
    recipientBankCode?: string;
    recipientType?: string;
}

/**
 * Generate a Wise batch CSV string from payment lines.
 * Uses the Wise "bank account" template format.
 */
export function generateWiseBatchCSV(lines: WisePaymentLine[]): string {
    const headers = [
        'recipientName',
        'recipientEmail',
        'sourceCurrency',
        'targetCurrency',
        'amountCurrency',
        'amount',
        'reference',
        'recipientAccountNumber',
        'recipientBankCode',
        'recipientType',
    ];

    const rows = lines.map((line) =>
        [
            escapeCSV(line.recipientName),
            escapeCSV(line.recipientEmail || ''),
            line.sourceCurrency,
            line.targetCurrency,
            line.amountCurrency,
            line.amount.toFixed(2),
            escapeCSV(line.reference),
            escapeCSV(line.recipientAccountNumber || ''),
            escapeCSV(line.recipientBankCode || ''),
            escapeCSV(line.recipientType || 'PERSON'),
        ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Build Wise payment lines from a pay run's contractor pay lines.
 */
export function buildWisePaymentLines(
    payLines: {
        user: {
            firstName: string;
            lastName: string;
            email: string;
        };
        currency: string;
        totalAmount: number;
        payRunId: string;
    }[],
    sourceCurrency: string = 'USD'
): WisePaymentLine[] {
    return payLines.map((line) => ({
        recipientName: `${line.user.firstName} ${line.user.lastName}`,
        recipientEmail: line.user.email,
        sourceCurrency,
        targetCurrency: line.currency,
        amountCurrency: line.currency,
        amount: Number(line.totalAmount),
        reference: `PAY-${line.payRunId.slice(-8)}`,
        recipientType: 'PERSON',
    }));
}
