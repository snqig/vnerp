import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

/**
 * 判断是否应该排除
 */
function shouldExclude(name: string): boolean {
  // 排除 . 开头的文件和目录
  if (name.startsWith('.')) return true;

  // 排除特定目录
  const excludedDirs = ['node_modules', '__pycache__', '.git', '.next'];
  if (excludedDirs.includes(name)) return true;

  return false;
}

/**
 * 获取所有文件（排除 . 开头的）
 */
function getAllFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (shouldExclude(item.name)) continue;

      if (item.isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
  } catch {
    // 忽略无法访问的目录
  }

  return fileList;
}

/**
 * 获取文件信息
 */
function getFileInfo(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    return {
      path: relativePath,
      size: stat.size,
      modified: stat.mtime.toISOString().replace('T', ' ').substring(0, 19),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const files = getAllFiles(PROJECT_ROOT);
    const fileInfos = files.map(getFileInfo).filter(Boolean);

    return NextResponse.json({
      files: fileInfos,
      total: fileInfos.length,
      totalSize: fileInfos.reduce((sum, f) => sum + (f?.size || 0), 0),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get file list' }, { status: 500 });
  }
}
