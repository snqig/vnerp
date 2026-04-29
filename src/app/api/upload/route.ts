import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
} from '@/lib/api-response';

// 上传配置
const UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  uploadDir: 'public/uploads/employees',
};

// 生成唯一文件名
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}-${random}.${extension}`;
}

// 验证文件类型
function validateFileType(file: File): boolean {
  return UPLOAD_CONFIG.allowedTypes.includes(file.type);
}

// 验证文件扩展名
function validateFileExtension(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return UPLOAD_CONFIG.allowedExtensions.includes(extension);
}

// 验证文件大小
function validateFileSize(file: File): boolean {
  return file.size <= UPLOAD_CONFIG.maxSize;
}

// POST - 上传文件
export const POST = withErrorHandler(async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return commonErrors.badRequest('未找到上传的文件');
  }

  // 验证文件类型
  if (!validateFileType(file)) {
    return errorResponse(
      `只能上传图片文件 (${UPLOAD_CONFIG.allowedTypes.map((t) => t.replace('image/', '')).join(', ')})`,
      400,
      400
    );
  }

  // 验证文件扩展名
  if (!validateFileExtension(file.name)) {
    return errorResponse(
      `不支持的文件格式，请使用: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`,
      400,
      400
    );
  }

  // 验证文件大小
  if (!validateFileSize(file)) {
    return errorResponse(
      `文件大小不能超过 ${UPLOAD_CONFIG.maxSize / 1024 / 1024}MB`,
      400,
      400
    );
  }

  // 生成唯一文件名
  const filename = generateUniqueFilename(file.name);

  // 确保上传目录存在
  const uploadDir = join(process.cwd(), UPLOAD_CONFIG.uploadDir);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // 保存文件
  const filePath = join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  // 返回文件URL
  const fileUrl = `/uploads/employees/${filename}`;

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
}, '上传文件失败');
