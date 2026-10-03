import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin, createUserClient } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireRole('patient', 'family_member'));

  // GET /documents - list documents
  fastify.get('/', async (request, reply) => {
    const { profile, token } = request.user!;
    const query = request.query as { document_type?: string; case_id?: string };

    const supabase = createUserClient(token);
    let q = supabase
      .from('documents')
      .select('*')
      .eq('owner_id', profile.id)
      .order('uploaded_at', { ascending: false });

    if (query.document_type) {
      q = q.eq('document_type', query.document_type);
    }
    if (query.case_id) {
      q = q.eq('case_id', query.case_id);
    }

    const { data, error } = await q;
    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { data };
  });

  // POST /documents - multipart file upload
  fastify.post('/', async (request, reply) => {
    const { profile, token } = request.user!;
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMime.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Only PDF, JPEG, and PNG files are allowed' });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > 10 * 1024 * 1024) {
      return reply.status(400).send({ error: 'File size exceeds 10MB limit' });
    }

    const fields = data.fields as Record<string, { value: string }>;
    const document_type = fields.document_type?.value || 'lab_report';
    const case_id = fields.case_id?.value || null;
    const appointment_id = fields.appointment_id?.value || null;

    const timestamp = Date.now();
    const safeFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${document_type}/${profile.id}/${timestamp}_${safeFilename}`;

    // Upload to Supabase Storage
    const bucket = document_type === 'lab_report' ? 'lab-reports' :
                   document_type === 'invoice' ? 'invoices' :
                   document_type === 'license' ? 'licenses' : 'case-documents';

    const { error: storageError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: data.mimetype,
        upsert: false,
      });

    if (storageError) {
      return reply.status(500).send({ error: `Storage upload failed: ${storageError.message}` });
    }

    // Insert database record
    const supabase = createUserClient(token);
    const { data: docRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        owner_id: profile.id,
        case_id: case_id || null,
        appointment_id: appointment_id || null,
        document_type,
        file_name: data.filename,
        storage_path: `${bucket}/${storagePath}`,
        mime_type: data.mimetype,
        size_bytes: buffer.length,
      })
      .select()
      .single();

    if (dbError) {
      return reply.status(500).send({ error: dbError.message });
    }

    return reply.status(201).send({ data: docRecord });
  });

  // GET /documents/:id/download-url
  fastify.get('/:id/download-url', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { profile } = request.user!;

    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('owner_id', profile.id)
      .single();

    if (error || !doc) {
      return reply.status(404).send({ error: 'Document not found or access denied' });
    }

    const parts = doc.storage_path.split('/');
    const bucket = parts[0];
    const filePath = parts.slice(1).join('/');

    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour

    if (signError || !signedData) {
      return reply.status(500).send({ error: 'Could not generate signed download URL' });
    }

    return { downloadUrl: signedData.signedUrl };
  });

  // DELETE /documents/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { profile, token } = request.user!;

    const supabase = createUserClient(token);
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('owner_id', profile.id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { message: 'Document deleted successfully' };
  });
};
