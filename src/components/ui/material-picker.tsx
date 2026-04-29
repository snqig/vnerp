'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  purchase_price: number;
  sale_price: number;
  material_type: string;
}

interface MaterialPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (material: Material) => void;
}

export function MaterialPicker({ open, onClose, onSelect }: MaterialPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMaterials = useCallback(async (kw: string, pg: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/materials?keyword=${encodeURIComponent(kw)}&page=${pg}&pageSize=50`);
      const result = await res.json();
      if (result.success && result.data?.data) {
        setMaterials(result.data.data);
        setTotal(result.data.pagination?.total || 0);
      } else if (result.success && Array.isArray(result.data)) {
        setMaterials(result.data);
        setTotal(result.data.length);
      }
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setKeyword('');
      setPage(1);
      setHighlightIdx(-1);
      fetchMaterials('', 1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, fetchMaterials]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchMaterials(keyword, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, open, fetchMaterials]);

  const handleSelect = (mat: Material) => {
    onSelect(mat);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, materials.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && highlightIdx < materials.length) {
      e.preventDefault();
      handleSelect(materials[highlightIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const rows = listRef.current.querySelectorAll('[data-row-idx]');
      rows[highlightIdx]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '12px', width: '720px', maxHeight: '80vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <Search style={{ width: '18px', height: '18px', color: '#6b7280', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索物料编码或名称..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '15px',
              color: '#1f2937', background: 'transparent'
            }}
          />
          {keyword && (
            <button onClick={() => setKeyword('')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px'
            }}>
              <X style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            fontSize: '13px', color: '#6b7280'
          }}>ESC 关闭</button>
        </div>

        <div style={{ padding: '0 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px 60px 90px', gap: '8px', padding: '8px 0', fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>
            <span>物料编码</span>
            <span>物料名称</span>
            <span>规格</span>
            <span>单位</span>
            <span>参考单价</span>
          </div>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              加载中...
            </div>
          ) : materials.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              {keyword ? `未找到与"${keyword}"匹配的物料` : '暂无物料数据，请先在物料主档中录入'}
            </div>
          ) : (
            materials.map((mat, idx) => (
              <div
                key={mat.id}
                data-row-idx={idx}
                onClick={() => handleSelect(mat)}
                style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 120px 60px 90px', gap: '8px',
                  padding: '10px 0', borderBottom: '1px solid #f9fafb', cursor: 'pointer',
                  background: idx === highlightIdx ? '#eff6ff' : 'transparent',
                  borderRadius: '6px', paddingLeft: '8px', paddingRight: '8px',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                onMouseLeave={() => setHighlightIdx(-1)}
              >
                <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }}>
                  {mat.material_code}
                </span>
                <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 500 }}>
                  {mat.material_name}
                </span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mat.specification || '-'}
                </span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mat.unit || '-'}
                </span>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                  {mat.purchase_price ? `¥${Number(mat.purchase_price).toFixed(2)}` : '-'}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '12px', color: '#9ca3af'
        }}>
          <span>共 {total} 条物料</span>
          <span>↑↓ 选择 · Enter 确认 · Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
