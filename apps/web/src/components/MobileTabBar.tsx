'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Camera, Calendar, Users, User, Receipt } from 'lucide-react';

export function MobileTabBar() {
  const pathname = usePathname() || '';
  const { user } = useAuth();

  // Hide on public client galleries, guest portals, and login pages
  if (
    pathname.startsWith('/e/') || 
    pathname.startsWith('/selection/') || 
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/' ||
    !user
  ) {
    return null;
  }

  const tabs = [
    {
      label: 'Events',
      href: '/dashboard',
      icon: Camera,
      active: pathname === '/dashboard' || pathname.startsWith('/dashboard/events/'),
    },
    {
      label: 'CRM',
      href: '/dashboard/crm',
      icon: Users,
      active: pathname === '/dashboard/crm',
    },
    {
      label: 'Finance',
      href: '/dashboard/finance',
      icon: Receipt,
      active: pathname === '/dashboard/finance',
    },
    {
      label: 'Calendar',
      href: '/dashboard/calendar',
      icon: Calendar,
      active: pathname === '/dashboard/calendar',
    },
    {
      label: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      active: pathname === '/dashboard/profile',
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F3F1EC]/95 backdrop-blur-xl border-t border-[#E2DDD5] pb-safe shadow-[0_-8px_24px_#D4D0C7] touch-action-manipulation"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 group relative ${
                isActive ? 'text-[#E86A5B]' : 'text-[#8C8C8C] hover:text-[#1F1F1F]'
              }`}
            >
              <div className={`p-1.5 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] scale-105' 
                  : 'group-active:scale-95'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight mt-0.5 ${
                isActive ? 'text-[#E86A5B]' : 'text-[#8C8C8C]'
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
