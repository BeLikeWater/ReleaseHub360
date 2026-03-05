import prisma from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Logs a sensitive or audit-worthy action to the AuditLog table.
 *
 * Call this for:
 *   - Role changes
 *   - User activation / deactivation
 *   - Permission grants / revocations
 *   - Customer access changes
 *
 * @param userId     Actor performing the action (or 'system' for automated jobs)
 * @param action     Verb: e.g. 'ROLE_CHANGE', 'USER_DEACTIVATE', 'ACCESS_GRANT'
 * @param resource   Entity type: e.g. 'ORGUser', 'CustomerUser', 'CustomerProductMapping'
 * @param resourceId ID of the affected entity
 * @param oldValue   Prior state (optional) — will be serialized as JSON string
 * @param newValue   New state (optional)  — will be serialized as JSON string
 */
export async function logAudit(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValue: oldValue !== undefined ? (oldValue as Prisma.InputJsonValue) : undefined,
        newValue: newValue !== undefined ? (newValue as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    // Audit failures must never break primary flows — log and swallow
    console.error('[auditLogger] Failed to write audit log:', err);
  }
}
