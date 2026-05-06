// app/finance/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/finance';
import PortalSidebar from '@/components/portal/PortalSidebar';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/crm/login');
        return;
      }

      setUserEmail(user.email || null);
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        Loading.
      </div>
    );
  }

  const navItems = [
    { href: '/portal', label: 'Portal' },
    { href: '/finance', label: 'Dashboard' },
    { href: '/finance/new', label: 'New Transaction' },
    { href: '/finance/fund', label: 'Revolving Fund' },
    { href: '/finance/transactions', label: 'All Transactions' },
    { href: '/finance/reports', label: 'Reports' },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <PortalSidebar />
      <div className="flex-1 min-w-0 min-h-screen bg-white text-gray-900">
      <header className="border border-gray-200 border-t-0 border-x-0 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/finance" className="text-xl font-semibold tracking-tight">
              NUMAT Finance
            </Link>
            <nav className="flex gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/finance' && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded text-sm ${
                      active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{userEmail}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/crm/login');
              }}
              className="text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}