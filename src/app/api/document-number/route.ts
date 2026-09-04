import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { validateDocumentNo, generateDocumentNo, DocumentType } from '@/lib/document-numbering';

import { withPermission } from '@/lib/api-permissions';
export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const docType = searchParams.get('docType') as DocumentType;
  const docNo = searchParams.get('docNo') || '';
  const excludeId = searchParams.get('excludeId')
    ? Number(searchParams.get('excludeId'))
    : undefined;

  if (!docType) {
    return errorResponse(ts('k_1liswrc'), 400, 400);
  }

  if (docNo) {
    const result = await validateDocumentNo(docNo, docType, excludeId);
    return successResponse(result);
  }

  const newNo = await generateDocumentNo(docType);
  return successResponse({ docNo: newNo });
});
