// lib/sendBoostEmail.ts
// Template email "Votre pub est en ligne" — identité Whatmarket (Inter + bleu #0EA5E9)

export function generateBoostEmailHTML(data: {
  nom: string
  offre: string
  eventTitle: string
  eventId: string
  prenom?: string
}): string {
  const prenom = data.prenom || data.nom.split(' ')[0]

  // 🔧 FIX — l'ancien lien pointait vers /market/{id}, une page qui
  // n'existe pas sur le site (404 garanti pour le commerçant qui clique).
  // On renvoie vers la vraie page d'accueil Whatmarket. Si un jour une
  // fiche marché a sa propre URL dédiée, remplacer ce lien à cet endroit.
  const marketUrl = `https://whatmarket.fr/whatmarket`
  const shareText = encodeURIComponent(`Je suis en tête d'affiche au ${data.eventTitle} aujourd'hui ! Venez me retrouver ${marketUrl}`)
  const whatsappUrl = `https://wa.me/?text=${shareText}`
  const instagramUrl = `https://www.instagram.com/`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre pub est en ligne — Whatmarket</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FA;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <div style="max-width:560px;margin:40px auto;padding:0 16px;">

    <!-- Header Whatmarket -->
    <div style="text-align:center;padding:32px 0 24px;">
      <table role="presentation" style="margin:0 auto;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;padding-right:9px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:26px;height:26px;background:#0EA5E9;border-radius:50%;">
              <tr><td style="text-align:center;color:white;font-weight:800;font-size:12px;">W</td></tr>
            </table>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:19px;font-weight:800;color:#12151A;letter-spacing:-0.02em;">Whatmarket</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Card principale -->
    <div style="background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">

      <!-- Hero -->
      <div style="background:linear-gradient(135deg,#0EA5E9 0%,#0284C7 100%);padding:36px 32px;text-align:center;">
        <div style="display:inline-block;background:rgba(255,255,255,0.16);border-radius:100px;padding:6px 16px;margin-bottom:18px;">
          <span style="color:rgba(255,255,255,0.92);font-size:11px;font-weight:600;letter-spacing:0.08em;">PUBLICATION ACTIVE</span>
        </div>
        <p style="font-family:'Inter',sans-serif;font-size:24px;font-weight:800;color:white;line-height:1.3;margin:0 0 8px;letter-spacing:-0.01em;">
          ${prenom}, vous êtes en tête d'affiche !
        </p>
        <p style="font-size:14px;color:rgba(255,255,255,0.85);margin:0;">
          ${data.eventTitle}
        </p>
      </div>

      <!-- Aperçu de la pub -->
      <div style="padding:26px 28px;">

        <p style="font-size:12px;font-weight:600;color:#5B6270;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 14px;">
          Votre pub en direct
        </p>

        <div style="background:#F8F9FA;border-radius:16px;padding:16px 18px;margin-bottom:24px;">
          <p style="font-size:14px;font-weight:700;color:#12151A;margin:0 0 4px;">${data.nom}</p>
          <p style="font-size:12.5px;color:#5B6270;margin:0;">${data.offre}</p>
        </div>

        <!-- Magic Link CTA -->
        <a href="${marketUrl}"
          style="display:block;background:#0EA5E9;color:white;text-decoration:none;text-align:center;border-radius:100px;padding:17px;font-size:15px;font-weight:700;letter-spacing:-0.01em;margin-bottom:16px;">
          Voir Whatmarket →
        </a>

        <!-- Partage social -->
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.18);border-radius:16px;padding:18px 20px;margin-bottom:8px;">
          <p style="font-size:13px;font-weight:700;color:#12151A;margin:0 0 6px;">Partagez sur vos réseaux</p>
          <p style="font-size:12px;color:#5B6270;line-height:1.6;margin:0 0 14px;">
            Montrez à vos clients que vous êtes présents aujourd'hui.
          </p>
          <div style="display:flex;gap:10px;">
            <a href="${whatsappUrl}" target="_blank"
              style="flex:1;background:#25D366;color:white;text-decoration:none;text-align:center;border-radius:100px;padding:10px;font-size:12px;font-weight:700;">
              WhatsApp
            </a>
            <a href="${instagramUrl}" target="_blank"
              style="flex:1;background:linear-gradient(135deg,#F58529,#DD2A7B,#8134AF);color:white;text-decoration:none;text-align:center;border-radius:100px;padding:10px;font-size:12px;font-weight:700;">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="font-size:11px;color:#9AA1AB;margin:0;line-height:1.6;">
        Whatmarket — La plateforme des marchés locaux, éditée par PulseMarket SAS<br>
        <a href="https://whatmarket.fr" style="color:#0EA5E9;text-decoration:none;">whatmarket.fr</a>
      </p>
    </div>
  </div>

</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────
// ⚠️ NOTE : la fonction sendBoostEmail() ci-dessous n'est appelée nulle
// part dans le projet — l'envoi réel passe par /api/send-email, qui
// importe generateBoostEmailHTML() ci-dessus et envoie avec la bonne
// adresse (noreply@pulse-market.fr). Gardée ici uniquement si besoin
// futur d'un envoi autonome, mais corrigée pour ne plus utiliser
// l'adresse de test Resend.
// ─────────────────────────────────────────────────────────────────────
export async function sendBoostEmail(params: {
  to: string
  nom: string
  offre: string
  eventTitle: string
  eventId: string
}) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const prenom = params.nom.split(' ')[0]

  const { data, error } = await resend.emails.send({
    from: 'Whatmarket <noreply@pulse-market.fr>',
    to: params.to,
    subject: `${prenom}, votre pub est en ligne sur Whatmarket !`,
    html: generateBoostEmailHTML(params),
  })

  if (error) throw error
  return data
}