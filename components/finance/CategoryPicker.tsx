'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Classification, CostCenter, Category } from '@/lib/finance';

export type PickerOption = {
  category_id: number;
  category_code: string;
  category_name: string;
  cost_center_id: number;
  cost_center_name: string;
  classification_id: number;
  classification_name: string;
  pl_account_code: string | null;
};

export function buildPickerOptions(
  classifications: Classification[],
  costCenters: CostCenter[],
  categories: Category[],
): PickerOption[] {
  const clsById = new Map<number, Classification>(classifications.map((c) => [c.id, c]));
  const ccById = new Map<number, CostCenter>(costCenters.map((c) => [c.id, c]));

  const options: PickerOption[] = [];
  for (const cat of categories) {
    if (cat.is_active === false) continue;
    if (cat.cost_center_id == null) continue;
    const cc = ccById.get(cat.cost_center_id);
    if (!cc) continue;
    const clsId = cc.classification_id ?? cat.classification_id;
    if (clsId == null) continue;
    const cls = clsById.get(clsId);
    if (!cls) continue;
    options.push({
      category_id: cat.id,
      category_code: cat.code,
      category_name: cat.name,
      cost_center_id: cc.id,
      cost_center_name: cc.name,
      classification_id: cls.id,
      classification_name: cls.name,
      pl_account_code: cat.pl_account_code ?? null,
    });
  }
  return options;
}

function optionMatches(opt: PickerOption, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = [
    opt.category_name,
    opt.category_code,
    opt.classification_name,
    opt.cost_center_name,
    opt.pl_account_code ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

function rankOption(opt: PickerOption, q: string): number {
  const name = opt.category_name.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  const cls = opt.classification_name.toLowerCase();
  const cc = opt.cost_center_name.toLowerCase();
  if (cls.includes(q) || cc.includes(q)) return 3;
  return 4;
}

type Props = {
  options: PickerOption[];
  value: PickerOption | null;
  onChange: (opt: PickerOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function CategoryPicker({
  options,
  value,
  onChange,
  placeholder = 'Search by name, code, classification, or cost center.',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const filtered = useMemo(() => {
    const matched = options.filter((o) => optionMatches(o, tokens));
    const q = query.trim().toLowerCase();
    if (!q) {
      return matched
        .slice()
        .sort((a, b) => a.category_name.localeCompare(b.category_name));
    }
    return matched.slice().sort((a, b) => {
      const ra = rankOption(a, q);
      const rb = rankOption(b, q);
      if (ra !== rb) return ra - rb;
      return a.category_name.localeCompare(b.category_name);
    });
  }, [options, tokens, query]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        onChange(filtered[highlight]);
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const inputValue = open ? query : value ? value.category_name : '';
  const effectivePlaceholder = value && !open ? '' : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={effectivePlaceholder}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded px-3 py-2 pr-8 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
        />
        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear category"
            onClick={() => {
              onChange(null);
              setQuery('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 text-sm"
          >
            x
          </button>
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500">No matching categories.</div>
          ) : (
            filtered.map((opt, idx) => {
              const active = idx === highlight;
              const breadcrumbTail = opt.pl_account_code || opt.category_code;
              return (
                <button
                  type="button"
                  key={opt.category_id}
                  data-idx={idx}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onChange(opt);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 ${
                    active ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm text-gray-900">{opt.category_name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {opt.classification_name} {'>'} {opt.cost_center_name} {'>'} {breadcrumbTail}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
