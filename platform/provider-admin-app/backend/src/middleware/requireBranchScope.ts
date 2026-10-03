import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';

/** Tables that carry a hospital_id column directly. */
const DIRECT_HOSPITAL_ID_TABLES = new Set([
  'appointments',
  'cases',
  'hospital_users',
]);

/** Tables that carry a hospital_id via a parent FK. */
const PARENT_TABLE_MAP: Record<string, { fk: string; parentTable: string }> = {
  treatment_items: { fk: 'case_id', parentTable: 'cases' },
};

export interface BranchScopeOptions {
  /** Database table name to look up the resource in. */
  table: string;
  /** URL param key that holds the resource UUID. Defaults to 'id'. */
  paramKey?: string;
}

/**
 * Factory that returns a Fastify preHandler hook ensuring a resource
 * (identified by `:id` or a custom param) belongs to the authenticated
 * provider's hospital.
 *
 * Usage:
 *   fastify.addHook('preHandler', requireBranchScope({ table: 'appointments' }))
 *   fastify.addHook('preHandler', requireBranchScope({ table: 'cases', paramKey: 'caseId' }))
 */
export function requireBranchScope(options: BranchScopeOptions) {
  const { table, paramKey = 'id' } = options;

  return async function branchScopeGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: 'Unauthenticated' });
    }

    const { hospitalId } = request.user;

    if (!hospitalId) {
      // Admin users without a hospital binding still pass — scope is not enforced.
      // Only provider-scoped roles require a hospitalId.
      if (request.user.role === 'provider') {
        return reply.status(403).send({
          success: false,
          error: 'Provider is not associated with any hospital',
        });
      }
      return; // admin / hospital_admin without branch scope — allow
    }

    const params = request.params as Record<string, string>;
    const resourceId = params[paramKey];

    if (!resourceId) {
      // No resource ID in path — skip scope check (e.g., list routes)
      return;
    }

    let resolvedHospitalId: string | null = null;

    if (DIRECT_HOSPITAL_ID_TABLES.has(table)) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('hospital_id')
        .eq('id', resourceId)
        .single();

      if (error || !data) {
        return reply.status(404).send({ success: false, error: `${table} not found` });
      }

      resolvedHospitalId = (data as { hospital_id: string }).hospital_id;
    } else if (PARENT_TABLE_MAP[table]) {
      // Resolve via parent
      const { fk, parentTable } = PARENT_TABLE_MAP[table]!;

      const { data: child, error: childError } = await supabaseAdmin
        .from(table)
        .select(fk)
        .eq('id', resourceId)
        .single();

      if (childError || !child) {
        return reply.status(404).send({ success: false, error: `${table} not found` });
      }

      const parentId = (child as Record<string, string>)[fk];

      const { data: parent, error: parentError } = await supabaseAdmin
        .from(parentTable)
        .select('hospital_id')
        .eq('id', parentId)
        .single();

      if (parentError || !parent) {
        return reply.status(404).send({ success: false, error: `${parentTable} not found` });
      }

      resolvedHospitalId = (parent as { hospital_id: string }).hospital_id;
    } else {
      // Unknown table — deny by default (fail-secure)
      return reply.status(403).send({
        success: false,
        error: `Hospital scope check not configured for table: ${table}`,
      });
    }

    if (resolvedHospitalId !== hospitalId) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied: resource belongs to a different hospital',
      });
    }
  };
}
