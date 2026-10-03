import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const statusUpdateSchema = z.object({
  status: z.enum(['active', 'suspended', 'rejected', 'pending']),
  reason: z.string().min(1).max(500).optional(),
});

const addUserSchema = z.object({
  profile_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default async function hospitalsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /hospitals
   * List all hospitals with status (admin only).
   */
  fastify.get(
    '/hospitals',
    { preHandler: [authenticate, requireRole(['admin'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string | undefined>;
      const status = query['status'];
      const name = query['name'];
      const page = Math.max(1, parseInt(query['page'] ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query['limit'] ?? '20', 10)));
      const offset = (page - 1) * limit;

      let q = supabaseAdmin
        .from('hospitals')
        .select('id, name, license_number, address, phone, email, status, created_at, updated_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) q = q.eq('status', status);
      if (name) q = q.ilike('name', `%${name}%`);

      const { data, error, count } = await q;
      if (error) {
        request.log.error(error, 'hospitals list error');
        return reply.status(500).send({ error: 'Failed to fetch hospitals' });
      }

      return reply.send({
        data,
        pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
      });
    },
  );

  /**
   * GET /hospitals/:id
   * Hospital details with associated users and branch applications (admin only).
   */
  fastify.get(
    '/hospitals/:id',
    { preHandler: [authenticate, requireRole(['admin'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const { data: hospital, error } = await supabaseAdmin
        .from('hospitals')
        .select(
          `
          id,
          name,
          license_number,
          address,
          phone,
          email,
          status,
          license_document_path,
          created_at,
          updated_at,
          hospital_users (
            id,
            is_active,
            created_at,
            profile:profiles!hospital_users_profile_id_fkey (
              id,
              full_name,
              email,
              role
            )
          ),
          branch_applications (
            id,
            status,
            decision_reason,
            created_at,
            reviewed_at
          )
          `,
        )
        .eq('id', id)
        .single();

      if (error || !hospital) {
        return reply.status(404).send({ error: 'Hospital not found' });
      }

      // Generate signed URL for license document if present
      let documentSignedUrl: string | null = null;
      const docPath = hospital.license_document_path as string | undefined;
      if (docPath) {
        const { data: signedData } = await supabaseAdmin.storage
          .from('documents')
          .createSignedUrl(docPath, 3600);
        documentSignedUrl = signedData?.signedUrl ?? null;
      }

      return reply.send({ data: { ...hospital, document_signed_url: documentSignedUrl } });
    },
  );

  /**
   * PATCH /hospitals/:id/status
   * Change hospital status — suspend or reactivate (admin only).
   */
  fastify.patch(
    '/hospitals/:id/status',
    { preHandler: [authenticate, requireRole(['admin'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parsed = statusUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { status: newStatus, reason } = parsed.data;

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('hospitals')
        .select('id, status, name')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ error: 'Hospital not found' });
      }

      const oldStatus = existing.status as string;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('hospitals')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, name, status, updated_at')
        .single();

      if (updateError || !updated) {
        request.log.error(updateError, 'hospital status update error');
        return reply.status(500).send({ error: 'Failed to update hospital status' });
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.profileId,
        action: 'hospital_status_change',
        resource_type: 'hospitals',
        resource_id: id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus, reason: reason ?? null },
        created_at: new Date().toISOString(),
      });

      return reply.send({
        data: updated,
        message: `Hospital status updated to ${newStatus}`,
      });
    },
  );

  /**
   * POST /hospitals/:id/users
   * Add a provider user to a hospital (admin only).
   * Validates that profile_id exists and role is 'provider'.
   */
  fastify.post(
    '/hospitals/:id/users',
    { preHandler: [authenticate, requireRole(['admin'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parsed = addUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { profile_id } = parsed.data;

      // Verify hospital exists
      const { data: hospital, error: hospitalError } = await supabaseAdmin
        .from('hospitals')
        .select('id, status')
        .eq('id', id)
        .single();

      if (hospitalError || !hospital) {
        return reply.status(404).send({ error: 'Hospital not found' });
      }

      // Validate profile exists and has role 'provider'
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', profile_id)
        .single();

      if (profileError || !profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      if (profile.role !== 'provider') {
        return reply.status(400).send({
          error: `Profile role must be 'provider'. Current role: ${profile.role}`,
        });
      }

      // Check if association already exists
      const { data: existing } = await supabaseAdmin
        .from('hospital_users')
        .select('id, is_active')
        .eq('hospital_id', id)
        .eq('profile_id', profile_id)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          return reply.status(409).send({ error: 'This provider is already associated with this hospital' });
        }
        // Reactivate if previously deactivated
        const { data: reactivated } = await supabaseAdmin
          .from('hospital_users')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('id, is_active')
          .single();

        return reply.send({ data: reactivated, message: 'Provider reactivated for this hospital' });
      }

      // Create new hospital_users row
      const { data: created, error: createError } = await supabaseAdmin
        .from('hospital_users')
        .insert({
          hospital_id: id,
          profile_id,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select('id, hospital_id, profile_id, is_active, created_at')
        .single();

      if (createError || !created) {
        request.log.error(createError, 'hospital_users insert error');
        return reply.status(500).send({ error: 'Failed to add provider to hospital' });
      }

      return reply.status(201).send({
        data: created,
        message: `Provider ${profile.full_name} added to hospital successfully`,
      });
    },
  );

  /**
   * DELETE /hospitals/:id/users/:profileId
   * Deactivate (soft-delete) a hospital user (admin only).
   */
  fastify.delete(
    '/hospitals/:id/users/:profileId',
    { preHandler: [authenticate, requireRole(['admin'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, profileId } = request.params as { id: string; profileId: string };

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('hospital_users')
        .select('id, is_active')
        .eq('hospital_id', id)
        .eq('profile_id', profileId)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ error: 'Hospital user association not found' });
      }

      if (!existing.is_active) {
        return reply.status(409).send({ error: 'Provider is already deactivated for this hospital' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('hospital_users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        request.log.error(updateError, 'hospital_users deactivate error');
        return reply.status(500).send({ error: 'Failed to deactivate hospital user' });
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.profileId,
        action: 'hospital_user_deactivated',
        resource_type: 'hospital_users',
        resource_id: existing.id,
        old_values: { is_active: true },
        new_values: { is_active: false },
        created_at: new Date().toISOString(),
      });

      return reply.send({ message: 'Provider deactivated from hospital successfully' });
    },
  );
}
