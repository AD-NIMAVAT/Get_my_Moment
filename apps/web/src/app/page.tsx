'use client';

import React, { useState } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustStrip } from '@/components/home/TrustStrip';
import { HowItWorks } from '@/components/home/HowItWorks';
import { AIShowcase } from '@/components/home/AIShowcase';
import { ComparisonSection } from '@/components/home/ComparisonSection';
import { QRCodeStory } from '@/components/home/QRCodeStory';
import { BusinessOS } from '@/components/home/BusinessOS';
import { Testimonials } from '@/components/home/Testimonials';
import { PricingSection } from '@/components/home/PricingSection';
import { SecuritySection } from '@/components/home/SecuritySection';
import { FAQSection } from '@/components/home/FAQSection';
import { FinalCTA } from '@/components/home/FinalCTA';
import { LiveDemoModal } from '@/components/home/LiveDemoModal';

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleOpenDemo = () => {
    setIsDemoModalOpen(true);
  };

  const handleCloseDemo = () => {
    setIsDemoModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FAF8F5] text-[#181818] selection:bg-[#E86A5B] selection:text-white">
      {/* 1. Hero Section (with 4-Step Interactive Phone Simulation) */}
      <HeroSection onOpenDemo={handleOpenDemo} />

      {/* 2. Trust & Product Proof Strip */}
      <TrustStrip />

      {/* 3. The 5-Step Continuous Journey */}
      <HowItWorks />

      {/* 4. AI Face-Matching WOW Experience (Dark Showcase Canvas) */}
      <AIShowcase />

      {/* 5. Traditional Delivery vs. Get My Moment Side-by-Side Comparison */}
      <ComparisonSection />

      {/* 6. One QR. Every Memory. (Wedding Environment Storytelling) */}
      <QRCodeStory onOpenDemo={handleOpenDemo} />

      {/* 7. Photographer Business OS (Asymmetric Bento Grid) */}
      <BusinessOS />

      {/* 8. Real Social Proof & Studio Stories */}
      <Testimonials />

      {/* 9. Simple, Transparent Pricing */}
      <PricingSection />

      {/* 10. Enterprise Security & Biometric Privacy */}
      <SecuritySection />

      {/* 11. Frequently Asked Questions Accordion */}
      <FAQSection />

      {/* 12. Final High-Conversion CTA */}
      <FinalCTA onOpenDemo={handleOpenDemo} />

      {/* Interactive Live Demo Modal */}
      <LiveDemoModal
        isOpen={isDemoModalOpen}
        onClose={handleCloseDemo}
      />
    </div>
  );
}
