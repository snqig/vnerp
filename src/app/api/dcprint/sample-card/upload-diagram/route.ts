import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

const UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  uploadDir: 'public/uploads/sample-cards',
};

function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
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

export const POST = withPermission(
  async (request: NextRequest) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return commonErrors.badRequest('未找到上传的文件');
    }

    if (!validateFileType(file)) {
      return errorResponse(
        `只能上传图片文件 (${UPLOAD_CONFIG.allowedTypes.map((t) => t.replace('image/', '')).join(', ')})`,
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
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/sample-cards/${filename}`;

    return successResponse(
      {
        url: fileUrl,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
      '上传成功'
    );
  },
  { logTitle: '上传工艺图示' }
);
