'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Material {
  id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  purchase_price: number;
  sale_price: number;
  material_type: string;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
}

interface MaterialCategoryOption {
  id: number;
  category_code: string;
  category_name: string;
}

interface MaterialPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (material: Material) => void;
}

export function MaterialPicker({ open, onClose, onSelect }: MaterialPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [categories, setCategories] = useState<MaterialCategoryOption[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [_page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hint, setHint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMaterials = useCallback(async (kw: string, pg: number, catCode: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({
        keyword: kw,
        page: String(pg),
        pageSize: '50',
      });
      // 分类编码是业务侧主查询键
      if (catCode) params.set('categoryCode', catCode);

      const res = await fetch(`/api/materials?${params.toString()}`);
      const result = await res.json();

      if (!result.success) {
        // 后端已给出明确原因（编码不存在/已停用/格式非法），照实提示，
        // 不能吞掉后静默展示全量数据
        setErrorMsg(result.message || '物料查询失败');
        setMaterials([]);
        setTotal(0);
        setHint('');
        return;
      }

      const data = result.data ?? {};
      const list: Material[] = Array.isArray(data) ? data : (data.list ?? []);
      setMaterials(list);
      setTotal(Array.isArray(data) ? list.length : (data.total ?? list.length));
      setHint(Array.isArray(data) ? '' : (data.categoryHint ?? ''));
    } catch {
      setMaterials([]);
      setTotal(0);
      setErrorMsg('物料查询失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/base-data/material-category?page=1&pageSize=500');
      const result = await res.json();
      if (result.success) {
        const list = result.data?.list ?? (Array.isArray(result.data) ? result.data : []);
        setCategories(
          (list as MaterialCategoryOption[]).filter((c) => c.category_code && c.category_name)
        );
      }
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setKeyword('');
      setCategoryCode('');
      setPage(1);
      setHighlightIdx(-1);
      setErrorMsg('');
      setHint('');
      fetchMaterials('', 1, '');
      fetchCategories();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, fetchMaterials, fetchCategories]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchMaterials(keyword, 1, categoryCode);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, categoryCode, open, fetchMaterials]);

  const handleSelect = (mat: Material) => {
    onSelect(mat);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, materials.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '720px',
          maxHeight: '80vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Search style={{ width: '18px', height: '18px', color: '#6b7280', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索物料编码或名称..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: '#1f2937',
              background: 'transparent',
            }}
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            ESC 关闭
          </button>
        </div>

        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <label style={{ fontSize: '13px', color: '#6b7280', flexShrink: 0 }}>物料分类</label>
          <select
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value)}
            style={{
              flex: 1,
              fontSize: '13px',
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#1f2937',
              background: 'white',
            }}
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.category_code}>
                {c.category_code} · {c.category_name}
              </option>
            ))}
          </select>
          {categoryCode && (
            <button
              onClick={() => setCategoryCode('')}
              style={{
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '5px 10px',
                fontSize: '12px',
                color: '#6b7280',
              }}
            >
              清除
            </button>
          )}
        </div>

        {(errorMsg || hint) && (
          <div
            style={{
              padding: '8px 20px',
              fontSize: '12px',
              color: errorMsg ? '#b91c1c' : '#b45309',
              background: errorMsg ? '#fef2f2' : '#fffbeb',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            {errorMsg || hint}
          </div>
        )}

        <div style={{ padding: '0 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 110px 110px 56px 84px',
              gap: '8px',
              padding: '8px 0',
              fontSize: '12px',
              fontWeight: 700,
              color: '#6b7280',
            }}
          >
            <span>物料编码</span>
            <span>物料名称</span>
            <span>物料分类</span>
            <span>规格</span>
            <span>单位</span>
            <span>参考单价</span>
          </div>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {loading ? (
            <div
              style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}
            >
              加载中...
            </div>
          ) : materials.length === 0 ? (
            <div
              style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}
            >
              {errorMsg
                ? '请调整筛选条件后重试'
                : categoryCode
                  ? `分类「${categoryCode}」下未找到${keyword ? `与"${keyword}"匹配的` : ''}物料`
                  : keyword
                    ? `未找到与"${keyword}"匹配的物料`
                    : '暂无物料数据，请先在物料主档中录入'}
            </div>
          ) : (
            materials.map((mat, idx) => (
              <div
                key={mat.id}
                data-row-idx={idx}
                onClick={() => handleSelect(mat)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 110px 110px 56px 84px',
                  gap: '8px',
                  padding: '10px 0',
                  borderBottom: '1px solid #f9fafb',
                  cursor: 'pointer',
                  background: idx === highlightIdx ? '#eff6ff' : 'transparent',
                  borderRadius: '6px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                onMouseLeave={() => setHighlightIdx(-1)}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#2563eb',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                  }}
                >
                  {mat.material_code}
                </span>
                <span style={{ fontSize: '13px', color: '#1f2937', fontWeight: 500 }}>
                  {mat.material_name}
                </span>
                {mat.category_name ? (
                  <span
                    style={{ fontSize: '12px', color: '#475569' }}
                    title={`${mat.category_code} · ${mat.category_name}`}
                  >
                    {mat.category_name}
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    未归类
                  </span>
                )}
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  {mat.specification || '-'}
                </span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{mat.unit || '-'}</span>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                  {mat.purchase_price ? `¥${Number(mat.purchase_price).toFixed(2)}` : '-'}
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          <span>
            共{total}
            {'种物料'}
          </span>
          <span>↑↓ 选择 · Enter 确认 · Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
