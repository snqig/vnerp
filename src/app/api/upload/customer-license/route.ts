import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { validateUploadContent } from '@/lib/file-upload-security';

const UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['pdf'],
  uploadDir: 'public/uploads/customers',
};

function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'pdf';
  return `${timestamp}-${random}.${extension}`;
}

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return commonErrors.badRequest('未找到上传的文件');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
      return errorResponse(
        `不支持的文件格式，请使用: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`,
        400,
        400
      );
    }

    if (file.size > UPLOAD_CONFIG.maxSize) {
      return errorResponse(`文件大小不能超过 ${UPLOAD_CONFIG.maxSize / 1024 / 1024}MB`, 400, 400);
    }

    // 安全：按魔数校验真实类型
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentCheck = validateUploadContent(buffer, extension);
    if (!contentCheck.ok) {
      return errorResponse(contentCheck.message, 400, 400);
    }

    const filename = generateUniqueFilename(file.name);
    const uploadDir = join(process.cwd(), UPLOAD_CONFIG.uploadDir);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/customers/${filename}`;

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
  { logTitle: '上传营业执照' }
);
