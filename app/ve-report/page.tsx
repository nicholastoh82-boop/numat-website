import VEReportClient from './VEReportClient';

// Static page — no server function, no cold starts, instant load
// URL params are read client-side by VEReportClient
export default function VEReportPage() {
  return <VEReportClient />;
}