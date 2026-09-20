import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.R2_BUCKET_NAME;

// DELETE /api/r2/delete-patient
// Body JSON: { patientId }
export async function DELETE(req: NextRequest) {
  try {
    // R2 not configured — skip silently so patient deletion still succeeds
    if (!BUCKET || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
      return NextResponse.json({ success: true, message: 'R2 not configured, skipping cleanup' });
    }

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const { patientId } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
    }

    const prefix = `patients/patient-${patientId}/`;

    // 1. List all objects for this patient
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    });
    const listedObjects = await r2.send(listCmd);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return NextResponse.json({ success: true, message: 'No objects found to delete' });
    }

    // 2. Delete all found objects
    await r2.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
      },
    }));

    // Note: pagination not handled here (unlikely to exceed 1000 objects per patient)
    return NextResponse.json({ success: true, count: listedObjects.Contents.length });
  } catch (err) {
    console.error('[R2 Delete Patient Error]', err);
    return NextResponse.json({ error: 'R2 cleanup failed' }, { status: 500 });
  }
}
