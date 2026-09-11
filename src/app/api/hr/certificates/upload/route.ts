import { getTranslations } from 'next-intl/server';
import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { validateUploadContent } from '@/lib/file-upload-security';

// 证书附件上传配置（支持 PDF 与常见图片）
const UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  uploadDir: 'public/uploads/certificates',
};

// 生成唯一文件名
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'pdf';
  return `${timestamp}-${random}.${extension}`;
}

function validateFileType(file: File): boolean {
  return UPLOAD_CONFIG.allowedTypes.includes(file.type);
}

function validateFileExtension(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return UPLOAD_CONFIG.allowedExtensions.includes(extension);
}

function validateFileSize(file: File): boolean {
  return file.size <= UPLOAD_CONFIG.maxSize;
}

// POST - 上传证书附件（PDF / 图片）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const ts = await getTranslations('Common');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return commonErrors.badRequest(ts('k_j0pe42'));
    }

    if (!validateFileType(file)) {
      return errorResponse(
        `只能上传 PDF 或图片文件 (${UPLOAD_CONFIG.allowedExtensions.join(', ')})`,
        400,
        400
      );
    }

    if (!validateFileExtension(file.name)) {
      return errorResponse(
        `不支持的文件格式，请使用: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`,
        400,
        400
      );
    }

    if (!validateFileSize(file)) {
      return errorResponse(`文件大小不能超过 ${UPLOAD_CONFIG.maxSize / 1024 / 1024}MB`, 400, 400);
    }

    const filename = generateUniqueFilename(file.name);
    const uploadDir = join(process.cwd(), UPLOAD_CONFIG.uploadDir);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 安全：按魔数校验真实内容，拒绝伪装扩展名与 HTML/SVG 脚本内容
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const contentCheck = validateUploadContent(buffer, extension);
    if (!contentCheck.ok) {
      return errorResponse(contentCheck.message, 400, 400);
    }

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/certificates/${filename}`;
    const isPdf = extension === 'pdf';

    return successResponse(
      {
        url: fileUrl,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        isPdf,
      },
      ts('k_wip5q')
    );
  },
  { logTitle: '上传证书附件' }
);
