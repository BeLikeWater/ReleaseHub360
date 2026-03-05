import prisma from './prisma';

export interface EffectiveService {
  id: string;
  name: string;
  productId: string;
  moduleId: string | null;
}

/**
 * Returns the effective list of services for a CustomerProductMapping (CPM).
 * Logic:
 *   FULL         → all active services of the product
 *   MODULE_GROUP → services whose module belongs to subscribed module groups
 *   MODULE       → services whose moduleId is in subscribedModuleIds
 *   SERVICE      → services directly listed in subscribedServiceIds
 *   (default)    → all active services (same as FULL)
 */
export async function getEffectiveServices(cpmId: string): Promise<EffectiveService[]> {
  const cpm = await prisma.customerProductMapping.findUnique({
    where: { id: cpmId },
  });

  if (!cpm) return [];

  const productId = cpm.productId;
  const level = (cpm.subscriptionLevel ?? 'FULL').toUpperCase();

  if (level === 'FULL') {
    return prisma.service.findMany({
      where: { productId, isActive: true },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  if (level === 'MODULE_GROUP') {
    // Get module IDs belonging to the subscribed module groups
    const modules = await prisma.module.findMany({
      where: { moduleGroupId: { in: cpm.subscribedModuleGroupIds } },
      select: { id: true },
    });
    const moduleIds = modules.map((m) => m.id);
    return prisma.service.findMany({
      where: { productId, isActive: true, moduleId: { in: moduleIds } },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  if (level === 'MODULE') {
    return prisma.service.findMany({
      where: { productId, isActive: true, moduleId: { in: cpm.subscribedModuleIds } },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  if (level === 'SERVICE') {
    return prisma.service.findMany({
      where: { id: { in: cpm.subscribedServiceIds }, isActive: true },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  // Fallback: all services
  return prisma.service.findMany({
    where: { productId, isActive: true },
    select: { id: true, name: true, productId: true, moduleId: true },
  });
}
