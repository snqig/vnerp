'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export interface RowSelection<T> {
  /** The full Set of selected keys (may include keys no longer in the current view). */
  selected: Set<string>;
  /** Number of selected keys that are currently visible in `rows`. */
  selectedCount: number;
  isSelected: (key: string) => boolean;
  /** True when every visible row is selected. */
  allSelected: boolean;
  /** True when some (but not all) visible rows are selected. */
  someSelected: boolean;
  toggle: (key: string) => void;
  toggleAll: () => void;
  clear: () => void;
  selectAllRef: RefObject<HTMLInputElement | null>;
}

/**
 * Generic client-side table row selection backed by a Set of string keys.
 *
 * Mirrors the selection pattern used on /production/workorder:
 *   - a header "select all" checkbox with indeterminate state
 *   - per-row checkboxes
 *   - batch operations over the current selection
 *
 * @param rows   The array rendered in the table body.
 * @param keyOf  Maps a row to its stable string key (e.g. `(r) => String(r.id)`).
 */
export function useRowSelection<T>(rows: T[], keyOf: (row: T) => string): RowSelection<T> {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const keys = rows.map(keyOf);
  const selectedInView = keys.filter((k) => selected.has(k));
  const allSelected = keys.length > 0 && selectedInView.length === keys.length;
  const someSelected = selectedInView.length > 0 && !allSelected;

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const current = new Set(prev);
      if (allSelected) {
        keys.forEach((k) => current.delete(k));
      } else {
        keys.forEach((k) => current.add(k));
      }
      return current;
    });
  };

  const clear = () => setSelected(new Set());

  return {
    selected,
    selectedCount: selectedInView.length,
    isSelected: (key: string) => selected.has(key),
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    clear,
    selectAllRef,
  };
}
