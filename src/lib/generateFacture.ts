// lib/generateFacture.ts
import QRCode from 'qrcode'

// 🔧 FIX CRITIQUE — cette facture (la vraie, celle de la redevance AOT)
// affichait un SIRET et un numéro de TVA à zéros ("000 000 000 00000" /
// "FR00000000000") au lieu des vraies informations légales de
// PulseMarket SAS. Toute facture générée avant ce fix contient un faux
// numéro d'immatriculation — à corriger d'urgence si des exposants ont
// déjà reçu ce document.

const ISSUER = {
  name: 'PulseMarket SAS',
  siren: '105 506 554',
  rcs: 'RCS Draguignan',
  vat: 'FR8302105506554',
  address: '661 Carreirade des Adrets',
  postalCity: '83640 Plan-d\'Aups-Sainte-Baume',
  email: 'romain@pulse-market.fr',
  site: 'pulse-market.fr',
}

export interface FactureData {
  candidatureId: string
  exposantNom: string
  exposantEmail: string
  exposantSiren?: string
  exposantAdresse?: string
  exposantBusinessName?: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  emplacement?: string
  mairieNom?: string
  redevanceAOT: number
  fraisPlateforme: number
}

async function generateQRDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 240,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    })
  } catch {
    return ''
  }
}

export async function generateFactureHTML(data: FactureData): Promise<string> {
  const now = new Date()
  const factureNum = `PM-FACT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${data.candidatureId.slice(0, 6).toUpperCase()}`
  const dateEmission = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const total = data.redevanceAOT + data.fraisPlateforme
  const tvaRate = 0.20
  const htTotal = Math.round((total / (1 + tvaRate)) * 100) / 100
  const tvaTotal = Math.round((total - htTotal) * 100) / 100

  const verifUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://pulse-market.fr'}/verif/${data.candidatureId}`
  const qrDataUrl = await generateQRDataUrl(verifUrl)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${factureNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0F172A; background: white; padding: 0; font-size: 13px; line-height: 1.6; }
    .page { max-width: 760px; margin: 0 auto; padding: 56px 56px 40px; min-height: 100vh; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #E2E8F0; }
    .logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .logo-box { width: 36px; height: 36px; background: #4F46E5; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
    .logo-text { color: white; font-size: 13px; font-weight: 800; }
    .brand-name { font-size: 20px; font-weight: 700; color: #0F172A; }
    .brand-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }
    .facture-title { text-align: right; }
    .facture-label { font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em; }
    .facture-num { font-size: 13px; color: #4F46E5; font-weight: 600; margin-top: 4px; font-family: monospace; }
    .facture-date { font-size: 12px; color: #94A3B8; margin-top: 6px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .partie-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94A3B8; margin-bottom: 10px; }
    .partie-name { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
    .partie-detail { font-size: 12px; color: #64748B; line-height: 1.7; }
    .partie-badge { display: inline-flex; align-items: center; gap: 4px; background: #EEF2FF; color: #4F46E5; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px; margin-top: 6px; }
    .event-block { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .event-item-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; margin-bottom: 5px; }
    .event-item-value { font-size: 13px; font-weight: 600; color: #0F172A; }
    .table-section { margin-bottom: 24px; }
    .table-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 2px solid #E2E8F0; }
    th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; padding: 8px 12px; text-align: left; }
    th.right { text-align: right; }
    td { padding: 13px 12px; border-bottom: 1px solid #F8FAFC; }
    td.right { text-align: right; }
    .td-desc { font-size: 13px; color: #0F172A; font-weight: 500; }
    .td-sub { font-size: 11px; color: #94A3B8; margin-top: 2px; }
    .td-amount { font-size: 13px; font-weight: 600; color: #0F172A; }
    .totals { margin-left: auto; width: 280px; margin-bottom: 40px; }
    .total-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F8FAFC; }
    .total-row.final { background: #0F172A; color: white; padding: 12px 16px; border-radius: 10px; margin-top: 8px; border: none; font-weight: 700; font-size: 15px; }
    .total-row.final span:last-child { color: #818CF8; }
    .footer { border-top: 1px solid #E2E8F0; padding-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
    .legal { flex: 1; background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 10px; padding: 14px 16px; }
    .legal-title { font-size: 11px; font-weight: 700; color: #4338CA; margin-bottom: 5px; }
    .legal-text { font-size: 11px; color: #4F46E5; line-height: 1.6; }
    .qr-section { text-align: center; flex-shrink: 0; }
    .qr-label { font-size: 10px; color: #94A3B8; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .paid-stamp { position: absolute; top: 120px; right: 56px; border: 3px solid #16A34A; color: #16A34A; font-size: 18px; font-weight: 800; letter-spacing: 0.15em; padding: 6px 18px; border-radius: 6px; transform: rotate(-15deg); opacity: 0.15; pointer-events: none; }
    .ref-bar { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 10px 56px; display: flex; justify-content: space-between; font-size: 10px; color: #CBD5E1; margin: 0 -56px -40px; }
    @media print { body { padding: 0; } .no-print { display: none !important; } .page { padding: 32px 40px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="paid-stamp">VALIDÉ</div>
    <div class="header">
      <div>
        <div class="logo-wrap">
          <div class="logo-box"><span class="logo-text">PM</span></div>
          <span class="brand-name">PulseMarket</span>
        </div>
        <div class="brand-sub">Plateforme de gestion des marchés · pulse-market.fr</div>
        ${data.mairieNom ? `<div style="margin-top: 8px; font-size: 12px; color: #475569; font-weight: 600;">Pour le compte de : ${data.mairieNom}</div>` : ''}
      </div>
      <div class="facture-title">
        <div class="facture-label">Facture</div>
        <div class="facture-num">${factureNum}</div>
        <div class="facture-date">Émise le ${dateEmission}</div>
        <div style="margin-top: 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 100px; padding: 3px 12px; display: inline-block;">
          <span style="font-size: 11px; font-weight: 700; color: #16A34A;">✓ Validée</span>
        </div>
      </div>
    </div>
    <div class="parties">
      <div>
        <div class="partie-label">Émetteur</div>
        <div class="partie-name">${ISSUER.name}</div>
        <div class="partie-detail">
          ${ISSUER.address}, ${ISSUER.postalCity}<br>
          SIREN : ${ISSUER.siren} — ${ISSUER.rcs}<br>
          TVA intracommunautaire : ${ISSUER.vat}<br>
          ${ISSUER.email} · ${ISSUER.site}
        </div>
      </div>
      <div>
        <div class="partie-label">Facturé à</div>
        <div class="partie-name">${data.exposantBusinessName || data.exposantNom}</div>
        <div class="partie-detail">
          ${data.exposantNom}<br>
          ${data.exposantSiren ? `SIREN : ${data.exposantSiren}<br>` : ''}
          ${data.exposantAdresse ? `${data.exposantAdresse}<br>` : ''}
          ${data.exposantEmail}
        </div>
        ${data.exposantSiren ? `<div class="partie-badge">✓ SIREN vérifié INSEE</div>` : ''}
      </div>
    </div>
    <div class="event-block">
      <div><div class="event-item-label">Événement</div><div class="event-item-value">${data.eventTitle}</div></div>
      <div><div class="event-item-label">Date du marché</div><div class="event-item-value">${data.eventDate}</div></div>
      <div><div class="event-item-label">Lieu · Emplacement</div><div class="event-item-value">${data.eventLocation}${data.emplacement ? ` · N° ${data.emplacement}` : ''}</div></div>
    </div>
    <div class="table-section">
      <div class="table-title">Détail de la prestation</div>
      <table>
        <thead><tr><th>Description</th><th class="right">Quantité</th><th class="right">Prix unitaire HT</th><th class="right">Montant HT</th></tr></thead>
        <tbody>
          <tr>
            <td><div class="td-desc">Redevance d'occupation du domaine public (AOT)</div><div class="td-sub">Autorisation d'installation sur voie publique · ${data.eventTitle}</div></td>
            <td class="right td-amount">1</td>
            <td class="right td-amount">${Math.round(data.redevanceAOT / 1.2 * 100) / 100} €</td>
            <td class="right td-amount">${Math.round(data.redevanceAOT / 1.2 * 100) / 100} €</td>
          </tr>
          <tr>
            <td><div class="td-desc">Frais de service plateforme PulseMarket</div><div class="td-sub">Gestion de candidature · Vérification dossier · Mise en relation</div></td>
            <td class="right td-amount">1</td>
            <td class="right td-amount">${Math.round(data.fraisPlateforme / 1.2 * 100) / 100} €</td>
            <td class="right td-amount">${Math.round(data.fraisPlateforme / 1.2 * 100) / 100} €</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="totals">
      <div class="total-row"><span>Sous-total HT</span><span>${htTotal} €</span></div>
      <div class="total-row"><span>TVA (20%)</span><span>${tvaTotal} €</span></div>
      <div class="total-row final"><span>Total TTC</span><span>${total.toFixed(2)} €</span></div>
    </div>
    <div class="footer">
      <div class="legal">
        <div class="legal-title">Mention légale de conformité</div>
        <div class="legal-text">Certifié conforme aux transactions enregistrées sur la plateforme PulseMarket. Cette facture atteste du paiement de la redevance AOT et des frais de service pour la participation au marché mentionné ci-dessus. Réf. candidature : ${data.candidatureId.slice(0, 12).toUpperCase()}</div>
      </div>
      <div class="qr-section">
        ${qrDataUrl ? `<img src="${qrDataUrl}" width="110" height="110" alt="QR Code" style="border-radius: 8px; border: 1px solid #E2E8F0;" />` : '<div style="width:110px;height:110px;background:#F8FAFC;border-radius:8px;"></div>'}
        <div class="qr-label">Vérification</div>
        <div style="font-size: 10px; color: #CBD5E1; font-family: monospace; margin-top: 3px;">${data.candidatureId.slice(0, 12).toUpperCase()}</div>
      </div>
    </div>
    <div class="ref-bar">
      <span>${ISSUER.name} · SIREN ${ISSUER.siren} · TVA ${ISSUER.vat}</span>
      <span>${factureNum} · ${dateEmission}</span>
    </div>
  </div>
  <div class="no-print" style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px; text-align: center; display: flex; gap: 12px; justify-content: center;">
    <button onclick="window.print()" style="background: #4F46E5; color: white; border: none; border-radius: 10px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer;">Imprimer / Enregistrer en PDF</button>
    <button onclick="window.close()" style="background: white; color: #64748B; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 20px; font-size: 14px; font-weight: 500; cursor: pointer;">Fermer</button>
  </div>
</body>
</html>`
}

export async function openFacturePDF(data: FactureData) {
  const html = await generateFactureHTML(data)
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}