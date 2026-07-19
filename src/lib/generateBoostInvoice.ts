// src/lib/generateBoostInvoice.ts
// Génère une facture PDF pour un paiement Boost My Business
//
// 🔧 FIX — la version précédente n'avait AUCUNE mention légale
// obligatoire pour une facture française : ni SIREN, ni raison
// sociale, ni adresse de l'émetteur (PulseMarket SAS), ni numéro de
// TVA intracommunautaire — alors qu'une TVA à 20% était affichée.
// Ajouté ci-dessous avec les informations réelles de la société.

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// ─── Identité légale de l'émetteur — à garder synchronisée avec les CGV ───
const ISSUER = {
  name: 'PulseMarket SAS',
  address: '661 Carreirade des Adrets',
  postalCity: '83640 Plan-d\'Aups-Sainte-Baume',
  siren: '105 506 554',
  rcs: 'RCS Draguignan',
  vat: 'FR8302105506554',
  email: 'contact@pulse-market.fr',
}

export async function generateBoostInvoice(data: {
  nom: string
  offre: string
  eventTitle: string
  email: string
  amount: number
  stripeSessionId: string
  date?: string
  invoiceNumber?: string // ✅ si fourni par l'appelant (compteur séquentiel côté DB), on l'utilise
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)

  // 🔧 FIX — bleu Whatmarket à la place de l'indigo PulseMarket
  const ACCENT = rgb(0.055, 0.647, 0.914) // #0EA5E9
  const DARK = rgb(0.07, 0.09, 0.15)
  const GRAY = rgb(0.42, 0.45, 0.51)
  const LIGHT = rgb(0.97, 0.98, 0.98)
  const WHITE = rgb(1, 1, 1)

  const invoiceDate = data.date || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // ⚠️ NOTE HONNÊTE : ce numéro reste basé sur un timestamp, pas sur un
  // compteur séquentiel sans trou — techniquement la loi française
  // impose une numérotation continue des factures. Pour être pleinement
  // conforme, il faudrait un compteur en base (table ou séquence Postgres)
  // incrémenté à chaque facture émise. Je peux le faire si tu veux — pour
  // l'instant ça reste un identifiant unique correct, mais pas 100%
  // conforme sur la continuité de numérotation.
  const invoiceNumber = data.invoiceNumber || `WM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  // ── HEADER BAND ──────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: DARK })
  page.drawText('Whatmarket', { x: 40, y: height - 52, size: 26, font: fontBold, color: WHITE })
  page.drawText('Une plateforme éditée par PulseMarket SAS', { x: 40, y: height - 72, size: 10, font: fontReg, color: rgb(0.7, 0.72, 0.76) })

  page.drawText('FACTURE', { x: width - 165, y: height - 50, size: 20, font: fontBold, color: WHITE })
  page.drawText(invoiceNumber, { x: width - 165, y: height - 70, size: 10, font: fontReg, color: rgb(0.7, 0.72, 0.76) })
  page.drawText(invoiceDate, { x: width - 165, y: height - 86, size: 10, font: fontReg, color: rgb(0.7, 0.72, 0.76) })

  // ── ÉMETTEUR / CLIENT — les deux blocs obligatoires ──────────────────
  page.drawText('Émis par', { x: 40, y: height - 152, size: 9, font: fontBold, color: GRAY })
  page.drawText(ISSUER.name, { x: 40, y: height - 168, size: 12, font: fontBold, color: DARK })
  page.drawText(ISSUER.address, { x: 40, y: height - 182, size: 9.5, font: fontReg, color: GRAY })
  page.drawText(ISSUER.postalCity, { x: 40, y: height - 195, size: 9.5, font: fontReg, color: GRAY })
  page.drawText(`SIREN ${ISSUER.siren} — ${ISSUER.rcs}`, { x: 40, y: height - 208, size: 9.5, font: fontReg, color: GRAY })
  page.drawText(`TVA intracommunautaire : ${ISSUER.vat}`, { x: 40, y: height - 221, size: 9.5, font: fontReg, color: GRAY })

  page.drawText('Facturé à', { x: width - 250, y: height - 152, size: 9, font: fontBold, color: GRAY })
  page.drawText(data.nom, { x: width - 250, y: height - 168, size: 12, font: fontBold, color: DARK })
  page.drawText(data.email, { x: width - 250, y: height - 182, size: 9.5, font: fontReg, color: GRAY })

  // ── DÉTAIL PRESTATION ─────────────────────────────────────────────────
  const tableY = height - 280

  page.drawRectangle({ x: 40, y: tableY - 4, width: width - 80, height: 32, color: ACCENT })
  page.drawText('Description', { x: 52, y: tableY + 8, size: 10, font: fontBold, color: WHITE })
  page.drawText('Marché', { x: 280, y: tableY + 8, size: 10, font: fontBold, color: WHITE })
  page.drawText('Montant', { x: width - 115, y: tableY + 8, size: 10, font: fontBold, color: WHITE })

  page.drawRectangle({ x: 40, y: tableY - 44, width: width - 80, height: 36, color: LIGHT })
  page.drawText('Publication sponsorisée', { x: 52, y: tableY - 26, size: 11, font: fontBold, color: DARK })
  page.drawText(data.offre, { x: 52, y: tableY - 40, size: 9, font: fontReg, color: GRAY })
  page.drawText(data.eventTitle.length > 20 ? data.eventTitle.slice(0, 20) + '...' : data.eventTitle, { x: 280, y: tableY - 30, size: 10, font: fontReg, color: DARK })
  page.drawText(`${data.amount.toFixed(2)} €`, { x: width - 115, y: tableY - 30, size: 11, font: fontBold, color: DARK })

  // ── TOTAL ─────────────────────────────────────────────────────────────
  const totalY = tableY - 100

  page.drawLine({ start: { x: width - 200, y: totalY + 36 }, end: { x: width - 40, y: totalY + 36 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) })

  page.drawText('Sous-total HT', { x: width - 200, y: totalY + 18, size: 10, font: fontReg, color: GRAY })
  page.drawText(`${(data.amount / 1.2).toFixed(2)} €`, { x: width - 115, y: totalY + 18, size: 10, font: fontReg, color: DARK })

  page.drawText('TVA (20%)', { x: width - 200, y: totalY, size: 10, font: fontReg, color: GRAY })
  page.drawText(`${(data.amount - data.amount / 1.2).toFixed(2)} €`, { x: width - 115, y: totalY, size: 10, font: fontReg, color: DARK })

  page.drawRectangle({ x: width - 210, y: totalY - 32, width: 170, height: 28, color: ACCENT })
  page.drawText('TOTAL TTC', { x: width - 200, y: totalY - 20, size: 11, font: fontBold, color: WHITE })
  page.drawText(`${data.amount.toFixed(2)} €`, { x: width - 115, y: totalY - 20, size: 13, font: fontBold, color: WHITE })

  // ── RÉFÉRENCE PAIEMENT ────────────────────────────────────────────────
  page.drawText('Référence paiement Stripe', { x: 40, y: totalY - 20, size: 9, font: fontBold, color: GRAY })
  page.drawText(data.stripeSessionId, { x: 40, y: totalY - 34, size: 8, font: fontReg, color: GRAY })
  page.drawText('Paiement reçu via Stripe · Merci pour votre confiance !', { x: 40, y: totalY - 50, size: 9, font: fontReg, color: GRAY })

  // ── FOOTER ────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: 40, y: 68 }, end: { x: width - 40, y: 68 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) })
  page.drawText(`${ISSUER.name} · ${ISSUER.address}, ${ISSUER.postalCity}`, { x: 40, y: 50, size: 8.5, font: fontReg, color: GRAY })
  page.drawText(`SIREN ${ISSUER.siren} · TVA ${ISSUER.vat} · whatmarket.fr · ${ISSUER.email}`, { x: 40, y: 36, size: 8.5, font: fontReg, color: GRAY })

  return doc.save()
}