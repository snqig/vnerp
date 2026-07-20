import { getDrizzleDb } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  orgGroup, orgLegalEntity, orgFactory, orgWorkshop, orgTeam, orgPosition
} from '@/lib/db/schema';

const db = getDrizzleDb();
import { withPermission } from '@/lib/api-permissions';
import { successResponse } from '@/lib/api-response';

export const GET = withPermission(async () => {
  const [groups, legalEntities, factories, workshops, teams, positions] = await Promise.all([
    db.select().from(orgGroup).where(eq(orgGroup.deleted, 0)).orderBy(orgGroup.sortOrder),
    db.select().from(orgLegalEntity).where(eq(orgLegalEntity.deleted, 0)).orderBy(orgLegalEntity.sortOrder),
    db.select().from(orgFactory).where(eq(orgFactory.deleted, 0)).orderBy(orgFactory.sortOrder),
    db.select().from(orgWorkshop).where(eq(orgWorkshop.deleted, 0)).orderBy(orgWorkshop.sortOrder),
    db.select().from(orgTeam).where(eq(orgTeam.deleted, 0)).orderBy(orgTeam.sortOrder),
    db.select().from(orgPosition).where(eq(orgPosition.deleted, 0)).orderBy(orgPosition.sortOrder),
  ]);

  const tree = groups.map(g => ({
    id: g.id,
    code: g.code,
    name: g.name,
    type: 'group',
    children: legalEntities
      .filter(le => le.groupId === g.id)
      .map(le => ({
        id: le.id,
        code: le.code,
        name: le.name,
        type: 'legal_entity',
        children: factories
          .filter(f => f.legalEntityId === le.id)
          .map(f => ({
            id: f.id,
            code: f.code,
            name: f.name,
            type: 'factory',
            children: workshops
              .filter(w => w.factoryId === f.id)
              .map(w => ({
                id: w.id,
                code: w.code,
                name: w.name,
                type: 'workshop',
                children: teams
                  .filter(t => t.workshopId === w.id)
                  .map(t => ({
                    id: t.id,
                    code: t.code,
                    name: t.name,
                    type: 'team',
                    children: positions
                      .filter(p => p.teamId === t.id)
                      .map(p => ({
                        id: p.id, code: p.code, name: p.name, type: 'position', skillLevel: p.skillLevel,
                      })),
                  })),
              })),
          })),
      })),
  }));

  return successResponse(tree);
}, { errorMessage: '获取组织架构失败' });
