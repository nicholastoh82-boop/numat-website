/* lib/portal/nav.ts
   Single source of truth for the portal navigation: the items, their access
   keys, and which home group each one belongs to. Both the sidebar and the
   portal home read from this, so the two never drift. Item order here is the
   order the sidebar shows, so keep it stable. */

export type PortalGroupKey =
  | 'overview'
  | 'people'
  | 'sales'
  | 'finance'
  | 'production'
  | 'team'
  | 'admin'

export type PortalNavItem = {
  href: string
  label: string
  // 'baseline' shows for everyone, 'admin' shows for admins only,
  // anything else is a feature key checked against the user's access.
  feature: string
  // Home group. Items with no group do not show as a home tile.
  group?: PortalGroupKey
  // Optional shorter label for the home tile.
  homeLabel?: string
}

// Order the groups appear on the home page.
export const PORTAL_GROUPS: { key: PortalGroupKey; title: string }[] = [
  { key: 'overview', title: 'My day' },
  { key: 'people', title: 'People' },
  { key: 'sales', title: 'Sales' },
  { key: 'finance', title: 'Finance' },
  { key: 'production', title: 'Production' },
  { key: 'team', title: 'Team' },
  { key: 'admin', title: 'Admin' },
]

// Kept in the original sidebar order. The home groups by the group field, so
// reordering is not needed here.
export const PORTAL_NAV: PortalNavItem[] = [
  { href: '/portal', label: 'Home', feature: 'baseline' },
  { href: '/portal/announcements', label: 'Announcements', feature: 'announcements', group: 'overview' },
  { href: '/portal/leave', label: 'Leave', feature: 'leave', group: 'people' },
  { href: '/portal/chat', label: 'Team Chat', feature: 'chat', group: 'team' },
  { href: '/portal/mentions', label: 'Notifications', feature: 'chat', group: 'team' },
  { href: '/portal/scoreboard', label: 'NuBam Hybrid', feature: 'scoreboard', group: 'overview' },
  { href: '/portal/ceo', label: 'CEO View', feature: 'ceo', group: 'overview' },
  { href: '/crm/dashboard', label: 'CRM', feature: 'crm', group: 'sales' },
  { href: '/portal/lead-timeline', label: 'Lead Status', feature: 'lead_timeline', group: 'sales' },
  { href: '/crm/search', label: 'KB Search', feature: 'crm', group: 'sales' },
  { href: '/crm/outreach', label: 'Outreach', feature: 'crm', group: 'sales' },
  { href: '/crm/signals', label: 'Buying Signals', feature: 'crm', group: 'sales' },
  { href: '/portal/productivity', label: 'Email Counter', feature: 'productivity', group: 'sales' },
  { href: '/finance', label: 'Financials', feature: 'financials', group: 'finance' },
  { href: '/finance/new', label: 'Receipts', feature: 'receipts', group: 'finance' },
  { href: '/portal/verify', label: 'Verify', feature: 'verify', group: 'finance' },
  { href: '/portal/production', label: 'Production', feature: 'production', group: 'production' },
  { href: '/crm/production/qc', label: '↳ QC Check', feature: 'production', group: 'production', homeLabel: 'QC Check' },
  { href: '/crm/production/forecast', label: '↳ Forecast', feature: 'production', group: 'production', homeLabel: 'Forecast' },
  { href: '/finance/reports', label: 'Reports', feature: 'reports', group: 'finance' },
  { href: '/portal/access', label: 'Access', feature: 'admin', group: 'admin' },
  { href: '/portal/settings', label: 'Settings', feature: 'admin', group: 'admin' },
]

// Same rule the sidebar uses: baseline is for everyone, admin is admins only,
// otherwise the person needs the feature (admins always pass).
export function canSee(
  item: { feature: string },
  access: { isAdmin: boolean; features: string[] },
): boolean {
  if (item.feature === 'baseline') return true
  if (item.feature === 'admin') return access.isAdmin
  return access.isAdmin || access.features.includes(item.feature)
}
