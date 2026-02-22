import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Intake to Payment',
  description: 'Multi-tenant operations platform — intake, proposals, delivery, billing, and payroll',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
