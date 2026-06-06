// components/crm/GmailConnectPanel.tsx
// Per rep Gmail OAuth status and connect button.
// Reads /api/gmail/connect-status which returns the canonical rep list
// (active reps + admins from crm_users) merged with token status.
// New hires automatically appear here; no code change needed.

'use client';

import { useEffect, useState } from 'react';

type RepStatus = {
  rep_email: string;
  rep_name: string | null;
  connected_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
};

type ConnectStatusResponse = {
  reps: RepStatus[];
  error?: string;
};

type Banner = {
  kind: 'success' | 'error';
  message: string;
};

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never';
  const t = Date.parse(value);
  if (Number.isNaN(t)) return 'Never';
  const d = new Date(t);
  return d.toLocaleString();
}

function displayName(rep: RepStatus): string {
  if (rep.rep_name && rep.rep_name.trim().length > 0) return rep.rep_name;
  // Fallback: humanize the local part of the email
  const local = rep.rep_email.split('@')[0] ?? rep.rep_email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function GmailConnectPanel() {
  const [reps, setReps] = useState<RepStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/gmail/connect-status', {
          cache: 'no-store',
        });
        const json = (await res.json()) as ConnectStatusResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? `Status ${res.status}`);
          setReps([]);
          return;
        }
        setReps(json.reps ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('gmail_connect');
    if (!flag) return;

    if (flag === 'success') {
      const rep = params.get('rep') ?? '';
      setBanner({
        kind: 'success',
        message: rep
          ? `Connected ${rep} successfully.`
          : 'Gmail connected successfully.',
      });
    } else if (flag === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      setBanner({
        kind: 'error',
        message: `Gmail connect failed: ${reason}`,
      });
    }

    params.delete('gmail_connect');
    params.delete('rep');
    params.delete('reason');
    const newQuery = params.toString();
    const newUrl =
      window.location.pathname + (newQuery ? `?${newQuery}` : '');
    window.history.replaceState(null, '', newUrl);

    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  function handleConnect(repEmail: string): void {
    window.location.href = `/api/gmail/auth?rep_email=${encodeURIComponent(
      repEmail
    )}`;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {banner && (
        <div
          className={`px-4 py-2 text-sm border-b ${
            banner.kind === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="px-5 py-4">
        <div className="text-sm text-gray-600 mb-3">
          Each rep authorizes their own numat.ph Gmail. Sent and received mail
          is logged into the CRM automatically once connected.
        </div>

        {loading && (
          <div className="text-sm text-gray-500">Loading connection status.</div>
        )}

        {error && !loading && (
          <div className="text-sm text-red-700">
            Could not load status: {error}
          </div>
        )}

        {!loading && !error && reps.length === 0 && (
          <div className="text-sm text-gray-500">No active reps to display.</div>
        )}

        {!loading && !error && reps.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">Rep</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Connected at</th>
                  <th className="py-2 pr-4 font-medium">Last used</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((rep) => {
                  const connected = Boolean(rep.is_active);
                  return (
                    <tr key={rep.rep_email} className="border-b border-gray-100">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-800">
                          {displayName(rep)}
                        </div>
                        <div className="text-xs text-gray-500">{rep.rep_email}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            connected
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {connected ? 'Connected' : 'Not connected'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {formatTimestamp(rep.connected_at)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {formatTimestamp(rep.last_used_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => handleConnect(rep.rep_email)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            connected
                              ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              : 'bg-green-700 hover:bg-green-800 text-white'
                          }`}
                        >
                          {connected ? 'Reconnect' : 'Connect Gmail'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
