import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VectorNet | Network Security Compliance Auditor',
  description: 'VectorNet — Multi-vendor network security auditing and remediation platform (Team Vector | SIH 2026).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-[#334155] antialiased">
        {children}
      </body>
    </html>
  );
}
