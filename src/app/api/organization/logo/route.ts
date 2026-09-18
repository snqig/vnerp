/**
 * 公司 LOGO 上传 / 移除接口。
 *
 * 设计要点：
 *   1. 存储位置 `sys_company.logo`（单例行 id=1）—— 即 `settings/organization`
 *      「公司全称」所在的同一条记录，保证「一套公司档案」只有一个真相源。
 *   2. 文件落在 `public/uploads/company/`，与既有 5 个上传接口保持同一约定
 *      （复用 `validateUploadContent` 做魔数校验，拒绝伪装扩展名 / SVG 脚本内容）。
 *   3. 上传成功后失效公司档案缓存，使标题、侧边栏等位置及时生效。
 */

import { getTranslations } from 'next-intl/server';
import { NextRequest } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, relative, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { validateUploadContent } from '@/lib/file-upload-security';
import { execute, queryOne } from '@/lib/db';
import { invalidateCompanyProfileCache } from '@/lib/company-profile';

const LOGO_CONFIG = {
  maxSize: 1024 * 1024, // 1MB —— LOGO 属于小尺寸素材，收紧体积上限
  allowedTypes: ['image/png', 'image/jpeg'],
  // 与 validateUploadContent 的魔数白名单一致（该模块明确拒绝 SVG，避免存储型 XSS）
  allowedExtensions: ['png', 'jpg', 'jpeg'],
  uploadDir: 'public/uploads/company',
  /** 对外可访问的 URL 前缀 */
  urlPrefix: '/uploads/company',
};

/** 生成唯一文件名，避免同名覆盖与缓存串扰 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
  return `logo-${timestamp}-${random}.${extension}`;
}

/**
 * 把 `sys_company.logo` 中存的 URL 还原为磁盘绝对路径。
 *
 * 仅接受 `public/uploads/company/` 前缀，并再次校验解析后仍位于该目录内，
 * 防止历史脏数据（或人为构造的路径）导致越界删除。
 */
function resolveStoredFile(logoUrl: string): string | null {
  const prefix = `${LOGO_CONFIG.urlPrefix}/`;
  if (!logoUrl.startsWith(prefix)) return null;

  const baseDir = join(process.cwd(), LOGO_CONFIG.uploadDir);
  const abs = join(process.cwd(), 'public', logoUrl.replace(/^\//, ''));
  const rel = relative(baseDir, abs);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return abs;
}

/** 尽力删除旧文件；失败不影响主流程（残留文件不构成功能问题） */
async function removeQuietly(logoUrl: string | null | undefined): Promise<void> {
  if (!logoUrl) return;
  const abs = resolveStoredFile(logoUrl);
  if (!abs || !existsSync(abs)) return;
  try {
    await unlink(abs);
  } catch {
    /* 忽略：旧文件删除失败不应阻断新 LOGO 的保存 */
  }
}

// POST - 上传并立即生效
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return commonErrors.badRequest(ts('logoEmptyFile'));
    }

    if (!LOGO_CONFIG.allowedTypes.includes(file.type)) {
      return commonErrors.badRequest(ts('logoInvalidType'));
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!LOGO_CONFIG.allowedExtensions.includes(extension)) {
      return commonErrors.badRequest(ts('logoInvalidType'));
    }

    if (file.size > LOGO_CONFIG.maxSize) {
      return commonErrors.badRequest(ts('logoTooLarge'));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // 按魔数校验真实内容，拒绝「改名成 .png 的 HTML/SVG」
    const contentCheck = validateUploadContent(buffer, extension);
    if (!contentCheck.ok) {
      return commonErrors.badRequest(ts('logoInvalidType'));
    }

    const filename = generateFilename(file.name);
    const uploadDir = join(process.cwd(), LOGO_CONFIG.uploadDir);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    await writeFile(join(uploadDir, filename), buffer);

    const url = `${LOGO_CONFIG.urlPrefix}/${filename}`;

    // 覆盖前先取旧值，写入成功后清理，避免「换 LOGO 留垃圾文件」
    const previous = await queryOne<{ logo: string | null }>(
      `SELECT logo FROM sys_company WHERE id = 1`
    );

    const result = await execute(`UPDATE sys_company SET logo = ? WHERE id = 1`, [url]);
    if (result.affectedRows === 0) {
      await removeQuietly(url);
      return commonErrors.notFound(ts('logoCompanyMissing'));
    }

    await removeQuietly(previous?.logo);
    invalidateCompanyProfileCache();

    return successResponse({ url, filename }, ts('logoUploadSuccess'));
  },
  { logTitle: '上传公司LOGO' }
);

// DELETE - 移除 LOGO（清空字段并删除文件）
export const DELETE = withPermission(
  async (_request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');

    const previous = await queryOne<{ logo: string | null }>(
      `SELECT logo FROM sys_company WHERE id = 1`
    );

    const result = await execute(`UPDATE sys_company SET logo = NULL WHERE id = 1`, []);
    if (result.affectedRows === 0) {
      return commonErrors.notFound(ts('logoCompanyMissing'));
    }

    await removeQuietly(previous?.logo);
    invalidateCompanyProfileCache();

    return successResponse(null, ts('logoRemoveSuccess'));
  },
  { logTitle: '移除公司LOGO' }
);
