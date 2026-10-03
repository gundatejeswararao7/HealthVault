import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireBranchScope } from '../middleware/requireBranchScope.js';

const UpdateCaseSchema = z.object({
  diagnosis: z.string().min(3).optional(),
  treatment_plan: z.string().min(3).optional(),
});

const AddTreatmentItemSchema = z.object({
  description: z.string().min(2),
  quantity: z.number().int().positive(),
  unit_cost: z.number().positive(),
});

export const caseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRole('provider', 'admin'));

  // GET /cases - list cases for provider's hospital
  fastify.get('/', async (request, reply) => {
    const { hospitalId, role } = request.user;
    const query = request.query as { status?: 'open' | 'closed'; search?: string };

    let q = supabaseAdmin
      .from('cases')
      .select('*, patients(id, full_name, phone, email), appointments(scheduled_at, reason)')
      .order('opened_at', { ascending: false });

    if (role === 'provider' && hospitalId) {
      q = q.eq('hospital_id', hospitalId);
    }

    if (query.status === 'open') {
      q = q.is('closed_at', null);
    } else if (query.status === 'closed') {
      q = q.not('closed_at', 'is', null);
    }

    const { data, error } = await q;
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    let results = data;
    if (query.search && results) {
      const term = query.search.toLowerCase();
      results = results.filter((c: any) =>
        c.patients?.full_name?.toLowerCase().includes(term) ||
        c.diagnosis?.toLowerCase().includes(term)
      );
    }

    return { success: true, data: results };
  });

  // GET /cases/:id - full case details
  fastify.get(
    '/:id',
    { preHandler: [requireBranchScope({ table: 'cases' })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const { data: medicalCase, error } = await supabaseAdmin
        .from('cases')
        .select('*, patients(*), appointments(*)')
        .eq('id', id)
        .single();

      if (error || !medicalCase) {
        return reply.status(404).send({ success: false, error: 'Case not found' });
      }

      // Fetch treatment items
      const { data: treatmentItems } = await supabaseAdmin
        .from('treatment_items')
        .select('*')
        .eq('case_id', id)
        .order('billed_at', { ascending: true });

      // Fetch documents linked to this case
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('case_id', id);

      return {
        success: true,
        data: {
          ...medicalCase,
          treatment_items: treatmentItems || [],
          documents: documents || [],
        },
      };
    }
  );

  // PUT /cases/:id - update diagnosis and treatment plan
  fastify.put(
    '/:id',
    { preHandler: [requireBranchScope({ table: 'cases' })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parse = UpdateCaseSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ success: false, error: parse.error.flatten() });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('cases')
        .update(parse.data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      return { success: true, data: updated };
    }
  );

  // POST /cases/:id/treatment-items - add treatment item
  fastify.post(
    '/:id/treatment-items',
    { preHandler: [requireBranchScope({ table: 'cases' })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parse = AddTreatmentItemSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ success: false, error: parse.error.flatten() });
      }

      const { data: item, error } = await supabaseAdmin
        .from('treatment_items')
        .insert({
          case_id: id,
          description: parse.data.description,
          quantity: parse.data.quantity,
          unit_cost: parse.data.unit_cost,
        })
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      return reply.status(201).send({ success: true, data: item });
    }
  );

  // DELETE /cases/:id/treatment-items/:itemId - remove treatment item
  fastify.delete(
    '/:id/treatment-items/:itemId',
    { preHandler: [requireBranchScope({ table: 'cases' })] },
    async (request, reply) => {
      const { id, itemId } = request.params as { id: string; itemId: string };

      const { error } = await supabaseAdmin
        .from('treatment_items')
        .delete()
        .eq('id', itemId)
        .eq('case_id', id);

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      return { success: true, message: 'Treatment item removed' };
    }
  );

  // PATCH /cases/:id/close - close case
  fastify.patch(
    '/:id/close',
    { preHandler: [requireBranchScope({ table: 'cases' })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const { data: updated, error } = await supabaseAdmin
        .from('cases')
        .update({ closed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      return { success: true, data: updated, message: 'Case closed successfully' };
    }
  );
};
