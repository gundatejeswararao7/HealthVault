import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/requireRole';

const decisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  amount_approved: z.number().optional(),
  decision_reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'approved') {
    if (data.amount_approved === undefined || data.amount_approved <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "amount_approved is required and must be > 0 when approved" });
    }
  } else if (data.status === 'rejected') {
    if (!data.decision_reason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "decision_reason is required when rejected" });
    }
  }
});

export default async function claimsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (req, reply) => {
    return requireRole(['admin', 'insurer'])(req, reply);
  });

  fastify.get('/claims', async (request: FastifyRequest<{ Querystring: { status?: string, patient_id?: string, hospital_id?: string, page?: string, limit?: string } }>, reply) => {
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '20');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('claims')
      .select(`
        *,
        patients ( id, full_name ),
        billing_cases!inner ( id, title, hospital_id ),
        insurance_policies ( id, policy_number, plan_id, insurance_plans(name) )
      `, { count: 'exact' });

    if (request.query.status) query = query.eq('status', request.query.status);
    if (request.query.patient_id) query = query.eq('patient_id', request.query.patient_id);
    if (request.query.hospital_id) query = query.eq('billing_cases.hospital_id', request.query.hospital_id);

    const { data, count, error } = await query.order('submitted_at', { ascending: false }).range(from, to);
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    return { success: true, data, count, page, limit };
  });

  fastify.get('/claims/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select(`
        *,
        billing_cases ( *, billing_items (*), hospitals (*) ),
        patients (*),
        insurance_policies ( *, insurance_plans (*) )
      `)
      .eq('id', request.params.id)
      .single();

    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }
    return { success: true, data };
  });

  fastify.patch('/claims/:id/decision', async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply) => {
    const profileId = (request as any).user?.id;
    try {
      const parsed = decisionSchema.parse(request.body);
      
      const { data: claim, error: fetchError } = await supabaseAdmin.from('claims').select('*').eq('id', request.params.id).single();
      if (fetchError) throw fetchError;

      if (parsed.status === 'approved' && parsed.amount_approved! > claim.amount_claimed) {
        return reply.status(400).send({ success: false, error: 'Approved amount cannot exceed claimed amount' });
      }

      const { data: updatedClaim, error: updateError } = await supabaseAdmin
        .from('claims')
        .update({
          status: parsed.status,
          amount_approved: parsed.amount_approved,
          decision_reason: parsed.decision_reason,
          reviewer_id: profileId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.params.id)
        .select()
        .single();
      if (updateError) throw updateError;

      if (parsed.status === 'approved') {
        const { data: billingCase } = await supabaseAdmin.from('billing_cases').select('insurer_paid').eq('id', claim.billing_case_id).single();
        const currentPaid = billingCase?.insurer_paid || 0;
        await supabaseAdmin.from('billing_cases').update({
          insurer_paid: currentPaid + parsed.amount_approved!,
          status: 'settled'
        }).eq('id', claim.billing_case_id);
      } else {
        await supabaseAdmin.from('billing_cases').update({ status: 'rejected' }).eq('id', claim.billing_case_id);
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: profileId,
        action: `claim_${parsed.status}`,
        entity_type: 'claims',
        entity_id: claim.id,
        details: parsed
      });

      await supabaseAdmin.from('notifications').insert({
        profile_id: claim.patient_id,
        title: `Claim ${parsed.status === 'approved' ? 'Approved' : 'Rejected'}`,
        body: parsed.status === 'approved' ? `Your claim has been approved for ${parsed.amount_approved}.` : `Your claim was rejected. Reason: ${parsed.decision_reason}`
      });

      return { success: true, data: updatedClaim };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.patch('/claims/:id/mark-paid', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { data: claim, error: fetchError } = await supabaseAdmin.from('claims').select('status, patient_id').eq('id', request.params.id).single();
    if (fetchError || !claim) {
      return reply.status(500).send({ success: false, error: fetchError?.message || 'Not found' });
    }
    
    if (claim.status !== 'approved') {
      return reply.status(400).send({ success: false, error: 'Only approved claims can be marked as paid' });
    }

    const { data, error } = await supabaseAdmin.from('claims').update({ status: 'paid' }).eq('id', request.params.id).select().single();
    if (error) return reply.status(500).send({ success: false, error: error.message });

    await supabaseAdmin.from('notifications').insert({
      profile_id: claim.patient_id,
      title: 'Claim Paid',
      body: 'The approved amount for your claim has been paid.'
    });

    return { success: true, data };
  });
}
