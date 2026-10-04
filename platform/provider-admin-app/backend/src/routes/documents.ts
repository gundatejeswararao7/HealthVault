import { FastifyInstance, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { z } from 'zod';

export default async function documentsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/documents', async (request: FastifyRequest, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file provided' });

    const user = request.user as any;
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type' });
    }

    const fields = data.fields as any;
    const document_type = fields.document_type?.value;
    const billing_case_id = fields.billing_case_id?.value;

    if (!document_type) return reply.status(400).send({ error: 'document_type required' });

    const timestamp = Date.now();
    const storagePath = `${document_type}/${user.hospitalId}/${timestamp}_${data.filename}`;

    const buffer = await data.toBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: data.mimetype });

    if (uploadError) throw uploadError;

    const { data: doc, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        owner_id: user.profileId,
        billing_case_id: billing_case_id || null,
        document_type,
        file_name: data.filename,
        storage_path: storagePath,
        mime_type: data.mimetype,
        size_bytes: buffer.length
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return reply.status(201).send(doc);
  });

  fastify.get('/documents', async (request: FastifyRequest, reply) => {
    const user = request.user as any;
    const { billing_case_id } = request.query as { billing_case_id?: string };

    let query = supabaseAdmin
      .from('documents')
      .select('*, billing_cases!inner(hospital_id)')
      .eq('billing_cases.hospital_id', user.hospitalId);

    if (billing_case_id) {
      query = query.eq('billing_case_id', billing_case_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return reply.send(data);
  });

  fastify.get<{ Params: { id: string } }>('/documents/:id/download-url', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('storage_path, billing_cases!inner(hospital_id)')
      .eq('id', id)
      .eq('billing_cases.hospital_id', user.hospitalId)
      .single();

    if (docError || !doc) return reply.status(404).send({ error: 'Document not found' });

    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600);

    if (urlError) throw urlError;
    return reply.send({ url: urlData.signedUrl });
  });
}
