import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const submitApplicationSchema = z.object({
  hospital_name: z.string().min(2).max(200),
  license_number: z.string().min(3).max(100),
  address: z.string().min(5).max(500),
  phone: z.string().min(7).max(30),
  email: z.string().email(),
  license_document_path: z.string().min(1).max(1000),
});

const decisionSchema = z.object({
  status: z.enum(['approved', 'rejected', 'under_review']),
  decision_reason: z.string().min(1).max(2000).optional(),
}).refine(
  (d) => d.status !== 'rejected' || (d.decision_reason && d.decision_reason.length > 0),
  { message: 'decision_reason is required when rejecting', path: ['decision_reason'] },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hospitalStatusFromDecision(decisionStatus: string): string {
  switch (decisionStatus) {
    case 'approved': return 'active';
    case 'rejected': return 'rejected';
    default: return 'pending';
  }
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default async function branchApplicationRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /branch-applications
   * List all applications with optional filters (admin/insurer).
   */
  fastify.get(
    '/branch-applications',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string | undefined>;
      const status = query['status'];
      const hospitalName = query['hospital_name'];
      const dateFrom = query['date_from'];
      const dateTo = query['date_to'];
      const page = Math.max(1, parseInt(query['page'] ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query['limit'] ?? '20', 10)));
      const offset = (page - 1) * limit;

      let q = supabaseAdmin
        .from('branch_applications')
        .select(
          `
          id,
          status,
          decision_reason,
          created_at,
          updated_at,
          reviewer_id,
          hospitals (
            id,
            name,
            license_number,
            address,
            phone,
            email,
            status
          )
          `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) q = q.eq('status', status);
      if (hospitalName) q = q.ilike('hospitals.name', `%${hospitalName}%`);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo);

      const { data, error, count } = await q;
      if (error) {
        request.log.error(error, 'branch-applications list error');
        return reply.status(500).send({ error: 'Failed to fetch branch applications' });
      }

      return reply.send({
        data,
        pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
      });
    },
  );

  /**
   * GET /branch-applications/:id
   * Full application details with signed document URL (admin/insurer).
   */
  fastify.get(
    '/branch-applications/:id',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const { data: application, error } = await supabaseAdmin
        .from('branch_applications')
        .select(
          `
          id,
          status,
          decision_reason,
          created_at,
          updated_at,
          reviewer_id,
          hospitals (
            id,
            name,
            license_number,
            address,
            phone,
            email,
            status,
            created_at
          )
          `,
        )
        .eq('id', id)
        .single();

      if (error || !application) {
        return reply.status(404).send({ error: 'Branch application not found' });
      }

      // Generate signed URL for license document if available
      let documentSignedUrl: string | null = null;
      const hospital = application.hospitals as unknown as Record<string, unknown> | null;
      const docPath = hospital ? (hospital['license_document_path'] as string | undefined) : undefined;

      if (docPath) {
        const { data: signedData } = await supabaseAdmin.storage
          .from('documents')
          .createSignedUrl(docPath, 3600);
        documentSignedUrl = signedData?.signedUrl ?? null;
      }

      return reply.send({ data: { ...application, document_signed_url: documentSignedUrl } });
    },
  );

  /**
   * POST /branch-applications
   * Submit a new branch application (any authenticated user).
   */
  fastify.post(
    '/branch-applications',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = submitApplicationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { hospital_name, license_number, address, phone, email, license_document_path } =
        parsed.data;

      // Create hospital record (status=pending)
      const { data: hospital, error: hospitalError } = await supabaseAdmin
        .from('hospitals')
        .insert({
          name: hospital_name,
          license_number,
          address,
          phone,
          email,
          license_document_path,
          status: 'pending',
          created_by: request.user.profileId,
        })
        .select('id')
        .single();

      if (hospitalError || !hospital) {
        request.log.error(hospitalError, 'hospital insert error');
        return reply.status(500).send({ error: 'Failed to create hospital record' });
      }

      // Create application record linked to hospital
      const { data: application, error: appError } = await supabaseAdmin
        .from('branch_applications')
        .insert({
          hospital_id: hospital.id,
          submitted_by: request.user.profileId,
          status: 'pending',
        })
        .select('id, status, created_at')
        .single();

      if (appError || !application) {
        request.log.error(appError, 'branch_applications insert error');
        return reply.status(500).send({ error: 'Failed to create branch application' });
      }

      return reply.status(201).send({
        data: { hospital_id: hospital.id, application_id: application.id, status: application.status },
        message: 'Branch application submitted successfully',
      });
    },
  );

  /**
   * PATCH /branch-applications/:id/decision
   * Approve, reject, or mark under_review (admin/insurer only).
   */
  fastify.patch(
    '/branch-applications/:id/decision',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parsed = decisionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { status: newStatus, decision_reason } = parsed.data;

      // Fetch current application + hospital
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('branch_applications')
        .select('id, status, hospital_id')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ error: 'Branch application not found' });
      }

      const oldStatus = existing.status as string;

      // Update application
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('branch_applications')
        .update({
          status: newStatus,
          decision_reason: decision_reason ?? null,
          reviewer_id: request.user.profileId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status, decision_reason, reviewed_at')
        .single();

      if (updateError || !updated) {
        request.log.error(updateError, 'branch_applications update error');
        return reply.status(500).send({ error: 'Failed to update application status' });
      }

      // Update hospital status accordingly
      const newHospitalStatus = hospitalStatusFromDecision(newStatus);
      await supabaseAdmin
        .from('hospitals')
        .update({ status: newHospitalStatus, updated_at: new Date().toISOString() })
        .eq('id', existing.hospital_id);

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.profileId,
        action: 'branch_application_decision',
        resource_type: 'branch_applications',
        resource_id: id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus, decision_reason: decision_reason ?? null },
        created_at: new Date().toISOString(),
      });

      return reply.send({
        data: updated,
        message: `Application ${newStatus} successfully`,
      });
    },
  );
}
