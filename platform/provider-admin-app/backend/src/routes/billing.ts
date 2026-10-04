import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';

const createCaseSchema = z.object({
  patient_id: z.string().uuid(),
  title: z.string().min(1),
  diagnosis: z.string(),
  treatment_summary: z.string(),
  policy_id: z.string().uuid().optional()
});

const updateCaseSchema = z.object({
  diagnosis: z.string().optional(),
  treatment_summary: z.string().optional(),
  policy_id: z.string().uuid().optional()
});

const addItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_cost: z.number().positive()
});

export default async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/billing', async (request: FastifyRequest, reply) => {
    const user = request.user as any;
    const hospitalId = user.hospitalId;
    const { status, page = 1, limit = 10 } = request.query as { status?: string, page?: number, limit?: number };

    let query = supabaseAdmin
      .from('billing_cases')
      .select('*, profiles!billing_cases_patient_id_fkey(full_name), insurance_policies(policy_number)', { count: 'exact' })
      .eq('hospital_id', hospitalId);

    if (status) query = query.eq('status', status);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return reply.send({ data, count, page, limit });
  });

  fastify.post('/billing', async (request: FastifyRequest, reply) => {
    const user = request.user as any;
    const hospitalId = user.hospitalId;
    const body = createCaseSchema.parse(request.body);

    const { data: link, error: linkError } = await supabaseAdmin
      .from('patient_hospital_links')
      .select('id')
      .eq('patient_id', body.patient_id)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      return reply.status(403).send({ error: 'Patient is not linked or active' });
    }

    const { data, error } = await supabaseAdmin
      .from('billing_cases')
      .insert({
        ...body,
        hospital_id: hospitalId,
        status: 'open',
        total_amount: 0
      })
      .select()
      .single();

    if (error) throw error;
    return reply.status(201).send(data);
  });

  fastify.get<{ Params: { id: string } }>('/billing/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const { data, error } = await supabaseAdmin
      .from('billing_cases')
      .select('*, billing_items(*), profiles!billing_cases_patient_id_fkey(*), insurance_policies(*)')
      .eq('id', id)
      .eq('hospital_id', user.hospitalId)
      .single();

    if (error || !data) return reply.status(404).send({ error: 'Case not found' });
    return reply.send(data);
  });

  fastify.put<{ Params: { id: string } }>('/billing/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;
    const body = updateCaseSchema.parse(request.body);

    const { data: existing, error: findError } = await supabaseAdmin
      .from('billing_cases')
      .select('status')
      .eq('id', id)
      .eq('hospital_id', user.hospitalId)
      .single();

    if (findError || !existing) return reply.status(404).send({ error: 'Case not found' });
    if (existing.status !== 'open') return reply.status(400).send({ error: 'Case is not open' });

    const { data, error } = await supabaseAdmin
      .from('billing_cases')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return reply.send(data);
  });

  fastify.get<{ Params: { id: string } }>('/billing/:id/items', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const { data: caseExists } = await supabaseAdmin
      .from('billing_cases')
      .select('id')
      .eq('id', id)
      .eq('hospital_id', user.hospitalId)
      .single();
    if (!caseExists) return reply.status(404).send({ error: 'Case not found' });

    const { data, error } = await supabaseAdmin
      .from('billing_items')
      .select('*')
      .eq('billing_case_id', id);

    if (error) throw error;
    return reply.send(data);
  });

  fastify.post<{ Params: { id: string } }>('/billing/:id/items', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;
    const body = addItemSchema.parse(request.body);

    const { data: caseExists } = await supabaseAdmin
      .from('billing_cases')
      .select('id, status, total_amount')
      .eq('id', id)
      .eq('hospital_id', user.hospitalId)
      .single();
    if (!caseExists) return reply.status(404).send({ error: 'Case not found' });
    if (caseExists.status !== 'open') return reply.status(400).send({ error: 'Case not open' });

    const total_cost = body.quantity * body.unit_cost;

    const { data: item, error: itemError } = await supabaseAdmin
      .from('billing_items')
      .insert({
        billing_case_id: id,
        ...body,
        total_cost
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // Recalculate
    const { data: items } = await supabaseAdmin.from('billing_items').select('total_cost').eq('billing_case_id', id);
    const newTotal = (items || []).reduce((sum, i) => sum + i.total_cost, 0);

    await supabaseAdmin.from('billing_cases').update({ total_amount: newTotal }).eq('id', id);

    return reply.status(201).send(item);
  });

  fastify.delete<{ Params: { id: string, itemId: string } }>('/billing/:id/items/:itemId', async (request, reply) => {
    const user = request.user as any;
    const { id, itemId } = request.params;

    const { data: caseExists } = await supabaseAdmin
      .from('billing_cases')
      .select('id, status')
      .eq('id', id)
      .eq('hospital_id', user.hospitalId)
      .single();
    if (!caseExists) return reply.status(404).send({ error: 'Case not found' });
    if (caseExists.status !== 'open') return reply.status(400).send({ error: 'Case not open' });

    const { error: deleteError } = await supabaseAdmin
      .from('billing_items')
      .delete()
      .eq('id', itemId)
      .eq('billing_case_id', id);

    if (deleteError) throw deleteError;

    const { data: items } = await supabaseAdmin.from('billing_items').select('total_cost').eq('billing_case_id', id);
    const newTotal = (items || []).reduce((sum, i) => sum + i.total_cost, 0);
    await supabaseAdmin.from('billing_cases').update({ total_amount: newTotal }).eq('id', id);

    return reply.send({ success: true });
  });
}
