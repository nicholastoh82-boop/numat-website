// app/finance/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/finance';
import PortalSidebar from '@/components/portal/PortalSidebar';

const ALWAYS_ADMIN = ['nick@numat.ph'];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [hasReceipts, setHasReceipts] = useState(false);
  const [hasReports, setHasReports] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/portal/login?redirectTo=' + encodeURIComponent(pathname || '/finance'));
        return;
      }

      const email = (user.email || '').toLowerCase();
      if (!email.endsWith('@numat.ph')) {
        router.replace('/portal/no-access');
        return;
      }

      const [{ data: adminRows }, { data: featRows }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin'),
        supabase.from('portal_access').select('feature').eq('user_id', user.id),
      ]);
      const features = new Set((featRows || []).map((r) => r.feature as string));
      const isAdmin = (adminRows && adminRows.length > 0) || ALWAYS_ADMIN.includes(email);
      const financials = features.has('financials');
      const receipts = features.has('receipts');
      const reports = features.has('reports');

      // The finance area used to need the financials feature for every page,
      // which blocked anyone granted only Receipts or only Reports. Now the
      // dashboard, fund and all transactions still need financials, but the New
      // Transaction (Receipts) page accepts the receipts feature, and the
      // Reports page accepts the reports feature.
      const path = pathname || '';
      const onReceipts = path === '/finance/new' || path.startsWith('/finance/new');
      const onReports = path === '/finance/reports' || path.startsWith('/finance/reports');
      const ok =
        isAdmin ||
        financials ||
        (receipts && onReceipts) ||
        (reports && onReports);
      if (!ok) {
        router.replace('/portal/no-access');
        return;
      }

      setCanSeeAll(isAdmin || financials);
      setHasReceipts(receipts);
      setHasReports(reports);
      setUserEmail(user.email || null);
      setReady(true);
    })();
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        Loading.
      </div>
    );
  }

  // Finance sub-navigation. Full set for financials and admins, otherwise only
  // the pages the person is allowed to open.
  const navItems = canSeeAll
    ? [
        { href: '/finance', label: 'Dashboard' },
        { href: '/finance/new', label: 'New Transaction' },
        { href: '/finance/fund', label: 'Revolving Fund' },
        { href: '/finance/transactions', label: 'All Transactions' },
        { href: '/finance/reports', label: 'Reports' },
      ]
    : [
        ...(hasReceipts ? [{ href: '/finance/new', label: 'New Transaction' }] : []),
        ...(hasReports ? [{ href: '/finance/reports', label: 'Reports' }] : []),
      ];

  return (
    <div className="flex min-h-screen bg-white">
      <PortalSidebar />
      <div className="flex-1 min-w-0 min-h-screen bg-white text-gray-900 pt-14 md:pt-0">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 space-y-2 md:space-y-3">
            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <Link href="/finance" className="text-lg md:text-xl font-semibold tracking-tight truncate">
                NUMAT Finance
              </Link>
              <div className="hidden md:flex items-center gap-3 text-sm text-gray-600 shrink-0">
                <span className="truncate max-w-[200px]" title={userEmail || ''}>{userEmail}</span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace('/portal/login');
                  }}
                  className="text-gray-500 hover:text-gray-900"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Sub-nav: horizontally scrollable on mobile */}
            <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/finance' && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded text-sm whitespace-nowrap shrink-0 ${
                      active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
