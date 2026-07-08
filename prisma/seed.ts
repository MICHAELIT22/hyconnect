import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('Seeding database...')

  const ADMIN_USERNAME = 'admin'
  const ADMIN_PASSWORD = 'Admin@2025'
  const ADMIN_EMAIL = `${ADMIN_USERNAME}@hyconnect.local`

  // 1. Create/update in Supabase Auth
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL)

  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      user_metadata: { role: 'ADMIN', username: ADMIN_USERNAME },
    })
    console.log('✓ Supabase Auth: admin mis à jour')
  } else {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'ADMIN', username: ADMIN_USERNAME },
    })
    if (error) throw new Error(`Supabase Auth error: ${error.message}`)
    console.log('✓ Supabase Auth: admin créé')
  }

  // 2. Create/update in Prisma (Postgres)
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    create: {
      username: ADMIN_USERNAME,
      password: hashed,
      role: 'ADMIN',
      displayName: 'Administrateur',
    },
    update: { password: hashed },
  })
  console.log('✓ Prisma: admin créé')

  // 3. Default settings
  const defaults = [
    { key: 'company_name', value: 'Hyundai CO-TO AUTO' },
    { key: 'company_address', value: "Abidjan, Côte d'Ivoire" },
    { key: 'company_phone', value: '+225 00 00 00 00' },
    { key: 'company_email', value: 'rh@hyundai-cotodauto.ci' },
    { key: 'cnss_rate', value: '3.2' },
    { key: 'tax_rate', value: '15' },
    { key: 'min_wage', value: '75000' },
  ]

  for (const setting of defaults) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: setting,
      update: {},
    })
  }

  console.log(`✓ Seed terminé. Connexion: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
