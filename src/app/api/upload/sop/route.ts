import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

const UPLOAD_CONFIG = {
  maxSize: 50 * 1024 * 1024,
  allowedTypes: ['application/pdf'],
  allowedExtensions: ['pdf'],
  uploadDir: 'public/uploads/sop',
};

function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'pdf';
  return `${timestamp}-${random}.${extension}`;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return errorResponse('未找到上传的文件', 400, 400);
  }

  if (!UPLOAD_CONFIG.allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
    return errorResponse('只能上传PDF文件', 400, 400);
  }

  if (file.size > UPLOAD_CONFIG.maxSize) {
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

  const fileUrl = `/uploads/sop/${filename}`;

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
