import { NextRequest, NextResponse } from 'next/server';
import { initializeApplication, getInitializationStatus } from '@/application/AppInitializer';
import { getEventBus } from '@/infrastructure/event-bus/EventBus';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (_request: NextRequest, _userInfo) => {
    try {
      initializeApplication();

      const eventBus = getEventBus();

      return NextResponse.json({
        success: true,
        message: 'Application initialized',
        initialized: getInitializationStatus(),
        eventHandlers: {
          'sales.approved': eventBus.getHandlerCount('sales.approved'),
          'sales.shipped': eventBus.getHandlerCount('sales.shipped'),
          'workorder.completed': eventBus.getHandlerCount('workorder.completed'),
          'workorder.material_issued': eventBus.getHandlerCount('workorder.material_issued'),
          'inbound.approved': eventBus.getHandlerCount('inbound.approved'),
        },
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: 'Initialization failed: ' + error.message,
        },
        { status: 500 }
      );
    }
  },
  { logTitle: '系统初始化', logType: 'system' }
);
