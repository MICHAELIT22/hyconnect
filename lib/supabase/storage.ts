import { createAdminClient } from './admin'

// Ensures the 'uploads' bucket exists and is public.
// Call this once on first use (idempotent).
export async function ensureUploadsBucket() {
  const sb = createAdminClient()
  const { data: buckets } = await sb.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'uploads')
  if (!exists) {
    await sb.storage.createBucket('uploads', { public: true, fileSizeLimit: 5242880 })
  }
}
