'use client';
export default function PrintButton() {
    return (
        <button
            style={{
                position: 'fixed', top: 16, right: 16, padding: '8px 20px',
                background: '#6366f1', color: 'white', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 13, fontWeight: 600, zIndex: 100,
            }}
            onClick={() => window.print()}
            className="no-print"
        >
            🖨 Print / Download PDF
        </button>
    );
}
