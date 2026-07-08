'use client';

// app/crm/profile/page.tsx
//
// Lets each rep paste their Gmail signature once and save it.
// Whatever lives here gets appended on every Send Now from /crm/outreach.
//
// How to copy a Gmail signature out of Gmail (instructions shown inline
// at the top of the page):
//   1. In Gmail, open Settings (gear icon, top right) → See all settings.
//   2. Scroll to "Signature".
//   3. Click into your signature box, press Ctrl+A then Ctrl+C to copy
//      the rich-text content.
//   4. Paste into the box on this page using the "Paste from Gmail" button.

import { useEffect, useState } from 'react';

type Profile = {
  email: string;
  name: string | null;
  role: string;
  signature_html: string | null;
  signature_updated_at: string | null;
};

export default function CrmProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signatureHtml, setSignatureHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/profile', { credentials: 'include' });
      if (res.status === 403) {
        throw new Error('You need to sign in to a CRM account to view this page.');
      }
      if (!res.ok) {
        throw new Error(`Load failed: ${res.status}`);
      }
      const data = (await res.json()) as Profile;
      setProfile(data);
      setSignatureHtml(data.signature_html ?? '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/crm/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_html: signatureHtml }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed: ${res.status}`);
      }
      setSaved(true);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const html = await navigator.clipboard.read().then(async (items) => {
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            return await blob.text();
          }
        }
        return null;
      });
      if (html) {
        setSignatureHtml(html);
      } else {
        const text = await navigator.clipboard.readText();
        setSignatureHtml(text);
      }
    } catch (e) {
      setError(
        'Clipboard read blocked by your browser. Paste manually into the editor below using Ctrl+V.'
      );
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Profile</h1>
      <p className="text-sm text-slate-600 mb-6">
        Set your Gmail signature once here. It will be appended to every email you send through the
        CRM (the Send Now button in Outreach). It will not affect emails you send directly from
        Gmail compose; those still pick up your normal Gmail signature.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : profile ? (
        <>
          <div className="mb-6 p-4 bg-slate-50 rounded">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                <div className="font-medium text-slate-900">{profile.email}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Name</div>
                <div className="font-medium text-slate-900">{profile.name ?? '(not set)'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Role</div>
                <div className="font-medium text-slate-900">{profile.role}</div>
              </div>
            </div>
          </div>

          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
            <div className="font-semibold mb-1">How to copy your Gmail signature</div>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>In Gmail, open Settings (gear icon, top right) then See all settings.</li>
              <li>Scroll to the Signature section.</li>
              <li>Click into your signature box, press Ctrl+A then Ctrl+C to copy.</li>
              <li>
                Click <span className="font-mono">Paste from Gmail</span> below, or paste the HTML
                directly into the editor.
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={pasteFromClipboard}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Paste from Gmail
            </button>
            <button
              onClick={() => setSignatureHtml('')}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300"
            >
              Clear
            </button>
            <div className="ml-auto text-xs text-slate-500">
              {profile.signature_updated_at
                ? `Last saved ${new Date(profile.signature_updated_at).toLocaleString()}`
                : 'Not yet saved'}
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-1">
            Signature HTML
          </label>
          <textarea
            value={signatureHtml}
            onChange={(e) => setSignatureHtml(e.target.value)}
            placeholder='<div>Best,<br/>Your Name<br/>Title, NUMAT<br/>+60 12 345 6789<br/><a href="https://cal.com/you/discovery">Book a call</a></div>'
            rows={10}
            className="w-full p-3 border border-slate-300 rounded font-mono text-xs"
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Preview (how it will appear in emails)
            </label>
            <div
              className="p-4 border border-slate-300 rounded bg-white text-sm"
              dangerouslySetInnerHTML={{ __html: signatureHtml || '<em class="text-slate-400">(empty)</em>' }}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save signature'}
            </button>
            {saved && <span className="text-sm text-emerald-700">Saved.</span>}
          </div>
        </>
      ) : null}
    </div>
  );
}
