import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { validateDocumentNo, generateDocumentNo, DocumentType } from '@/lib/document-numbering';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const docType = searchParams.get('docType') as DocumentType;
  const docNo = searchParams.get('docNo') || '';
  const excludeId = searchParams.get('excludeId') ? Number(searchParams.get('excludeId')) : undefined;

  if (!docType) {
    return errorResponse('缺少docType参数', 400, 400);
  }

  if (docNo) {
    const result = await validateDocumentNo(docNo, docType, excludeId);
    return successResponse(result);
  }

  const newNo = await generateDocumentNo(docType);
  return successResponse({ docNo: newNo });
});
