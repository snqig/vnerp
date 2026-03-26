import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 上传文件
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: '未找到上传的文件'
      }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        message: '只能上传图片文件'
      }, { status: 400 });
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        message: '文件大小不能超过 5MB'
      }, { status: 400 });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${random}.${extension}`;

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'employees');
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

    return NextResponse.json({
      success: true,
      message: '上传成功',
      url: fileUrl,
      filename: filename
    });

  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json({
      success: false,
      message: '上传文件失败: ' + (error as Error).message
    }, { status: 500 });
  }
}
