import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#FAF9F7',
};

export const metadata: Metadata = {
  title: 'Get My Moment — AI Event Photo Delivery for Photographers',
  description: 'A warm, photo-focused Business OS for Indian wedding photographers with AI face-matching and client galleries.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GetMyMoment',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F] antialiased flex flex-col font-sans selection:bg-[#E86A5B]/20 selection:text-[#E86A5B]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
