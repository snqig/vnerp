'use client';

/**
 * 公司 LOGO 上传 / 移除组件。
 *
 * 数据落点：`sys_company.logo`（与「公司全称」同一条记录），
 * 因此所有展示 LOGO 的位置（侧边栏 / 顶栏 / 登录页）都能从这一处统一加载。
 *
 * 上传成功后通过 `updateCompanyProfile()` 广播，使已挂载的其它组件即时换图，
 * 无需整页刷新。
 */

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import { DEFAULT_COMPANY_LOGO, updateCompanyProfile } from '@/hooks/useCompanyName';

interface CompanyLogoUploaderProps {
  /** 当前 LOGO 资源路径（`sys_company.logo`），未配置时为 null */
  logo: string | null;
  /** 上传 / 移除成功后回调，交由父组件同步表单状态 */
  onChange: (logo: string | null) => void;
}

/** 与后端 `/api/organization/logo` 的白名单保持一致（该接口拒绝 SVG） */
const ACCEPT = 'image/png,image/jpeg';
const MAX_SIZE = 1024 * 1024;

export function CompanyLogoUploader({ logo, onChange }: CompanyLogoUploaderProps) {
  const tc = useTranslations('Common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await authFetch('/api/organization/logo', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      const url: string | undefined = result?.data?.url;

      if (result?.success && url) {
        onChange(url);
        // 广播给侧边栏 / 顶栏 / 登录页等已挂载组件
        updateCompanyProfile({ logoUrl: url });
        toast.success(tc('logoUploadSuccess'));
      } else {
        toast.error(result?.message || tc('logoUploadFailed'));
      }
    } catch {
      toast.error(tc('logoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 复位以便再次选择同一个文件时仍能触发 change
    event.target.value = '';
    if (!file) return;

    // 前端先拦一道，省掉无谓的传输；服务端仍会独立校验
    if (file.size > MAX_SIZE) {
      toast.error(tc('logoTooLarge'));
      return;
    }
    void upload(file);
  };

  const remove = async () => {
    setUploading(true);
    try {
      const response = await authFetch('/api/organization/logo', { method: 'DELETE' });
      const result = await response.json();
      if (result?.success) {
        onChange(null);
        updateCompanyProfile({ logoUrl: null });
        toast.success(tc('logoRemoveSuccess'));
      } else {
        toast.error(result?.message || tc('logoRemoveFailed'));
      }
    } catch {
      toast.error(tc('logoRemoveFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start gap-6 pb-6 mb-6 border-b">
      <div className="w-24 h-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo || DEFAULT_COMPANY_LOGO}
          alt={tc('logoLabel')}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">{tc('logoLabel')}</div>
        <p className="text-xs text-muted-foreground">{tc('logoUploadHint')}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading
              ? tc('logoUploading')
              : logo
                ? tc('logoReplaceButton')
                : tc('logoUploadButton')}
          </Button>
          {logo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => void remove()}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {tc('logoRemoveButton')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
