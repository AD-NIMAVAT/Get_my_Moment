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
        <footer className="border-t border-[#E8E5E2] bg-white py-8 text-center text-xs text-[#6B6B6B]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[#6B6B6B]">
              <p className="flex items-center gap-1.5">
                © {new Date().getFullYear()} <span className="font-bold text-[#1F1F1F]">Get My Moment</span>. All rights reserved.
              </p>
              <span className="hidden sm:inline text-[#D4D0C7]">•</span>
              <p className="text-[11px] text-[#8C8C8C]">
                Enterprise Studio Business OS & AI Photo Delivery
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#6B6B6B]">
              <a href="/about" className="hover:text-[#E86A5B] transition-colors">
                About Us
              </a>
              <span className="text-[#D4D0C7]">•</span>
              <a href="/contact" className="hover:text-[#E86A5B] transition-colors">
                Contact Us
              </a>
              <span className="text-[#D4D0C7]">•</span>
              <a href="/#pricing" className="hover:text-[#E86A5B] transition-colors">
                Pricing Plans
              </a>
              <span className="text-[#D4D0C7]">•</span>
              <a href="/login" className="hover:text-[#E86A5B] transition-colors">
                Studio Portal
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
