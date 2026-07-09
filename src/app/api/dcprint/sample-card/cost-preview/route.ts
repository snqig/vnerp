import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleProcessCardService } from '@/application/services/SampleProcessCardService';

const service = new SampleProcessCardService();

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    try {
      const cost = await service.previewCost({
        items: body.items || [],
        steps: body.steps || [],
        material_loss_rate: body.material_loss_rate || 5,
        die_tool_id: body.die_tool_id,
        screen_plate_id: body.screen_plate_id,
      });
      return successResponse(cost);
    } catch (e: any) {
      return errorResponse(e.message, 400, 400);
    }
  },
  { logTitle: '打样工艺卡成本预览' }
);
