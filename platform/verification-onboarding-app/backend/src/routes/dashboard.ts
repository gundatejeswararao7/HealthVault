import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/requireRole';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (req, reply) => {
    return requireRole(['admin', 'insurer'])(req, reply);
  });

  fastify.get('/stats', async () => {
    const { count: pending_branch_applications } = await supabaseAdmin.from('hospital_branch_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: pending_claims } = await supabaseAdmin.from('claims').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'under_review']);
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: claimsData } = await supabaseAdmin.from('claims').select('amount_approved').in('status', ['approved', 'paid']).gte('reviewed_at', startOfMonth.toISOString());
    const approved_claims_this_month = claimsData?.reduce((acc, curr) => acc + (curr.amount_approved || 0), 0) || 0;

    const { count: active_hospitals } = await supabaseAdmin.from('hospitals').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: registered_patients } = await supabaseAdmin.from('patients').select('*', { count: 'exact', head: true });
    const { count: active_plans } = await supabaseAdmin.from('insurance_plans').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: total_policies } = await supabaseAdmin.from('insurance_policies').select('*', { count: 'exact', head: true }).eq('is_active', true);

    return {
      success: true,
      data: {
        pending_branch_applications: pending_branch_applications || 0,
        pending_claims: pending_claims || 0,
        approved_claims_this_month,
        active_hospitals: active_hospitals || 0,
        registered_patients: registered_patients || 0,
        active_plans: active_plans || 0,
        total_policies: total_policies || 0,
      }
    };
  });
};
