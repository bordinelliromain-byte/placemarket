// clean-storage.js
// Supprime tous les fichiers storage liés aux comptes test avant de delete les users
//
// USAGE :
//   npm install @supabase/supabase-js --save-dev  (si pas déjà installé)
//   node clean-storage.js
//
// ⚠️ Utilise la SERVICE_ROLE_KEY (pas l'anon key) pour avoir les droits admin storage

const { createClient } = require('@supabase/supabase-js')

// ⚠️ Remplace par tes vraies valeurs (ou charge depuis .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans l\'env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const USER_IDS = [
  '1b9cc620-62a3-499c-95e4-c1bac56b0e41',
  '2f32fa88-83a3-49d7-9cfb-25e37fa089a4',
  '67d8561a-caba-489e-8ec2-f56a63b2c299',
  'bef99b05-37b3-4031-ac8b-8c8f78086693',
  'f88cc925-18e7-4101-abe5-af4640c449a3',
]

// ⚠️ Chemins connus (issus du SELECT sur storage.objects) — on les liste
// explicitement plutôt que de deviner, car les 3 buckets ont 3 structures différentes :
//   - images  : events/{userId}/xxx.ext  ET  avatars/{userId}  (pas d'extension sur avatars !)
//   - documents : justificatifs/{autre-uuid}/justificatif.pdf (uuid ≠ owner, donc pas prédictible)
//   - boost-photos : fichiers à la racine, nom aléatoire (pas de préfixe userId)
//
// On récupère donc TOUT le contenu de chaque bucket et on filtre par "owner"
// via une requête préalable — pas de recherche par nom de dossier.

const BUCKETS = ['images', 'documents', 'boost-photos']

async function listAllRecursive(bucketName, prefix = '') {
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 })
  if (error || !data) return []

  let results = []
  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    // Un "dossier" dans Supabase Storage a id === null
    if (item.id === null) {
      const nested = await listAllRecursive(bucketName, fullPath)
      results = results.concat(nested)
    } else {
      results.push(fullPath)
    }
  }
  return results
}

async function cleanBucket(bucketName) {
  console.log(`\n🔍 Scan récursif du bucket "${bucketName}"...`)

  const allPaths = await listAllRecursive(bucketName)
  console.log(`  📁 ${allPaths.length} fichier(s) au total dans ce bucket`)

  // On ne peut pas filtrer par owner directement via l'API storage list(),
  // donc on garde tout ce qui contient un des userId dans son chemin
  // (couvre events/{id}/..., avatars/{id})
  const filesToDelete = allPaths.filter(path =>
    USER_IDS.some(id => path.includes(id))
  )

  if (filesToDelete.length === 0) {
    console.log(`  ℹ️ Aucun fichier avec userId dans le chemin pour "${bucketName}"`)
    if (allPaths.length > 0) {
      console.log(`  💡 Fichiers présents (vérifie manuellement s'ils appartiennent aux comptes test) :`)
      allPaths.forEach(p => console.log(`     - ${p}`))
    }
    return
  }

  console.log(`  🗑 Suppression de ${filesToDelete.length} fichier(s)...`)
  filesToDelete.forEach(p => console.log(`     - ${p}`))

  const { data, error } = await supabase.storage.from(bucketName).remove(filesToDelete)

  if (error) {
    console.error(`  ❌ Erreur suppression ${bucketName}:`, error.message)
  } else {
    console.log(`  ✅ ${filesToDelete.length} fichier(s) supprimé(s) dans "${bucketName}"`)
  }
}

async function main() {
  console.log('🧹 Nettoyage storage pour les comptes test PulseMarket\n')
  console.log('Comptes ciblés:', USER_IDS.join(', '))

  for (const bucket of BUCKETS) {
    await cleanBucket(bucket)
  }

  console.log('\n✅ Terminé ! Vérifie les fichiers restants listés ci-dessus (ex: documents/justificatifs, boost-photos)')
  console.log('   puis supprime les comptes dans Authentication → Users')
}

main().catch(console.error)