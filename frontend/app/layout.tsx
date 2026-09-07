import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sentinel | Network Compliance Auditor',
  description: 'Multi-vendor network security auditing and remediation platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090D16] text-[#94A3B8] antialiased">
        {children}
      </body>
    </html>
  );
}
