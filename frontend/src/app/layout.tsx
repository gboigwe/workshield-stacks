import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WorkShield - Secure Milestone Payments on Bitcoin',
  description: 'WorkShield enables trustless milestone-based payment contracts between clients and freelancers. Built on Stacks with Bitcoin-level security.',
  keywords: ['bitcoin', 'stacks', 'escrow', 'freelance', 'payments', 'milestone', 'smart contracts'],
  authors: [{ name: 'WorkShield Team' }],
  openGraph: {
    title: 'WorkShield - Secure Milestone Payments on Bitcoin',
    description: 'Trustless milestone-based payment contracts with Bitcoin-level security',
    type: 'website',
    // url: 'https://workshield.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkShield - Secure Milestone Payments on Bitcoin',
    description: 'Trustless milestone-based payment contracts with Bitcoin-level security',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#ea580c" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
