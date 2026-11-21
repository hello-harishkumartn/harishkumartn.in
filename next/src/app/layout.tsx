import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://harishkumartn.in'),
  title: { default: 'Harish Kumar T N', template: '%s | Harish Kumar T N' },
  description: "Harish Kumar T N: what I'm building, learning about markets, badminton and trips.",
  robots: process.env.VERCEL_ENV === 'production' ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
