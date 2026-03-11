import prisma from './prisma';

export interface EffectiveService {
  id: string;
  name: string;
  productId: string;
  moduleId: string | null;
}

/**
 * Returns the effective list of services for a CustomerProductMapping (CPM).
 * License model (new):
 *   - If licensedServiceIds is populated → return only those services
 *   - Else if licensedModuleIds is populated → services in those modules
 *   - Else if licensedModuleGroupIds is populated → services in those module groups
 *   - Else → all active services of the product (full license)
 */
export async function getEffectiveServices(cpmId: string): Promise<EffectiveService[]> {
  const cpm = await prisma.customerProductMapping.findUnique({
    where: { id: cpmId },
  });

  if (!cpm) return [];

  const productId = cpm.productId;

  // Service-level license
  if (cpm.licensedServiceIds.length > 0) {
    return prisma.service.findMany({
      where: { id: { in: cpm.licensedServiceIds }, isActive: true },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  // Module-level license
  if (cpm.licensedModuleIds.length > 0) {
    return prisma.service.findMany({
      where: { productId, isActive: true, moduleId: { in: cpm.licensedModuleIds } },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  // ModuleGroup-level license
  if (cpm.licensedModuleGroupIds.length > 0) {
    const modules = await prisma.module.findMany({
      where: { moduleGroupId: { in: cpm.licensedModuleGroupIds } },
      select: { id: true },
    });
    const moduleIds = modules.map((m) => m.id);
    return prisma.service.findMany({
      where: { productId, isActive: true, moduleId: { in: moduleIds } },
      select: { id: true, name: true, productId: true, moduleId: true },
    });
  }

  // Full license: all active services
  return prisma.service.findMany({
    where: { productId, isActive: true },
    select: { id: true, name: true, productId: true, moduleId: true },
  });
}
