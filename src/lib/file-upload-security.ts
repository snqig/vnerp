/**
 * @module file-upload-security
 * @description 上传文件内容安全校验（P1-10 安全修复）
 *
 * 仅校验文件扩展名或客户端上报的 MIME 类型是不可靠的——攻击者可把 HTML/SVG/脚本
 * 改名为 `.pdf` / `.jpg` 后上传，文件被静态托管时可能触发存储型 XSS。
 * 本模块按文件「魔数（magic number）」识别真实内容类型，并显式拒绝网页/脚本类内容，
 * 既防止伪装扩展名，也防止损坏文件绕过校验。
 */

/** 按内容识别出的真实文件类型 */
export type ContentKind = 'pdf' | 'jpg' | 'png' | 'zip' | 'ole' | 'unknown';

/** 常见文档/图片的魔数签名 */
const SIGNATURES: { kind: ContentKind; bytes: number[] }[] = [
  { kind: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { kind: 'jpg', bytes: [0xff, 0xd8, 0xff] }, // JPEG (FF D8 FF)
  { kind: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] }, // PNG (89 50 4E 47)
  { kind: 'zip', bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP (PK..) → docx/xlsx
  { kind: 'ole', bytes: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE2 → doc/xls
];

/** 危险内容签名：HTML / SVG / 脚本，无论扩展名如何一律拒绝 */
const DANGEROUS_SIGNATURES: number[][] = [
  [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50], // <!DOCTYP
  [0x3c, 0x68, 0x74, 0x6d, 0x6c], // <html
  [0x3c, 0x73, 0x76, 0x67], // <svg
  [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml
  [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script
];

/** 各扩展名允许的内容类型（防止把图片伪装成文档，或反之） */
const ALLOWED_CONTENT_FOR_EXT: Record<string, ContentKind[]> = {
  pdf: ['pdf'],
  jpg: ['jpg'],
  jpeg: ['jpg'],
  png: ['png'],
  doc: ['ole'],
  xls: ['ole'],
  docx: ['zip'],
  xlsx: ['zip'],
};

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
}

function detectKind(buffer: Buffer): ContentKind {
  for (const sig of SIGNATURES) {
    if (startsWith(buffer, sig.bytes)) return sig.kind;
  }
  return 'unknown';
}

/**
 * 校验上传文件的真实内容是否安全且与声称扩展名一致。
 *
 * @param buffer - 文件二进制内容
 * @param extension - 用户提供的扩展名（不含点，已小写）
 * @returns 成功时返回真实内容类型；失败时返回错误信息
 */
export function validateUploadContent(
  buffer: Buffer,
  extension: string
): { ok: true; kind: ContentKind } | { ok: false; message: string } {
  // 1. 先拒绝危险内容（HTML/SVG/脚本）—— 即便扩展名合法也拦截
  for (const sig of DANGEROUS_SIGNATURES) {
    if (startsWith(buffer, sig)) {
      return { ok: false, message: '文件内容疑似网页/脚本（HTML/SVG），出于安全考虑禁止上传' };
    }
  }

  // 2. 按魔数识别真实类型
  const kind = detectKind(buffer);
  if (kind === 'unknown') {
    return { ok: false, message: '无法识别的文件内容或文件已损坏，请上传合法文件' };
  }

  // 3. 扩展名与内容类型必须一致，防止伪装
  const allowed = ALLOWED_CONTENT_FOR_EXT[extension.toLowerCase()];
  if (!allowed || !allowed.includes(kind)) {
    return {
      ok: false,
      message: `文件实际内容(${kind})与扩展名(.${extension})不匹配，疑似伪装文件`,
    };
  }

  return { ok: true, kind };
}
