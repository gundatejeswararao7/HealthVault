import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRole('admin', 'insurer'));

  // GET /dashboard/stats - aggregate platform stats
  fastify.get('/stats', async (request, reply) => {
    try {
      // 1. Pending branch applications
      const { count: pendingBranchApps } = await supabaseAdmin
        .from('hospital_branch_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 2. Pending family requests
      const { count: pendingFamilyRequests } = await supabaseAdmin
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 3. Pending / under-review claims
      const { count: pendingClaims } = await supabaseAdmin
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'under_review']);

      // 4. Total active hospitals
      const { count: activeHospitals } = await supabaseAdmin
        .from('hospitals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // 5. Total registered patients
      const { count: registeredPatients } = await supabaseAdmin
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // 6. Claims total amount approved this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: approvedClaims } = await supabaseAdmin
        .from('claims')
        .select('amount_approved')
        .in('status', ['approved', 'paid'])
        .gte('reviewed_at', startOfMonth.toISOString());

      const totalApprovedThisMonth = (approvedClaims || []).reduce(
        (sum, claim) => sum + (Number(claim.amount_approved) || 0),
        0
      );

      return {
        success: true,
        data: {
          pending_branch_applications: pendingBranchApps || 0,
          pending_family_requests: pendingFamilyRequests || 0,
          pending_claims: pendingClaims || 0,
          active_hospitals: activeHospitals || 0,
          registered_patients: registeredPatients || 0,
          total_approved_amount_this_month: totalApprovedThisMonth,
        },
      };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};
