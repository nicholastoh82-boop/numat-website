'use client';

// components/portal/LeadStatusTabs.tsx
// Tab switcher for the lead status page: Table (default) and Timeline (Gantt).
// Both child views fetch the same /api/crm/lead_status data independently.

import { useState } from 'react';
import LeadStatusTable from '@/components/portal/LeadStatusTable';
import LeadMilestoneGantt from '@/components/portal/LeadMilestoneGantt';

type Tab = 'table' | 'timeline';

export default function LeadStatusTabs() {
  const [tab, setTab] = useState<Tab>('table');

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
        <button
          onClick={() => setTab('table')}
          className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors ${tab === 'table' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Table
        </button>
        <button
          onClick={() => setTab('timeline')}
          className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors ${tab === 'timeline' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Timeline
        </button>
      </div>

      {tab === 'table' ? <LeadStatusTable /> : <LeadMilestoneGantt />}
    </div>
  );
}
