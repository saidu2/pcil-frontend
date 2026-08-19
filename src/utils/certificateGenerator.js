// ── Investment Certificate PDF Generator ─────────────────────────────────────
// Uses browser Canvas API — no external dependencies needed

const G = '#B8860B'
const G_LIGHT = '#D4A017'
const DARK = '#0a0a0a'

export function generateCertificatePDF(cert) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1240   // A4 landscape at 150dpi approx
    canvas.height = 877
    const ctx = canvas.getContext('2d')

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // ── Gold border ─────────────────────────────────────────────────────────
    ctx.strokeStyle = G
    ctx.lineWidth = 6
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)

    // ── Inner border ────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(184,134,11,0.3)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64)

    // ── Corner ornaments ────────────────────────────────────────────────────
    const corners = [[50, 50], [canvas.width - 50, 50], [50, canvas.height - 50], [canvas.width - 50, canvas.height - 50]]
    corners.forEach(([x, y]) => {
      ctx.strokeStyle = G
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = G
      ctx.fill()
    })

    // ── Header background ───────────────────────────────────────────────────
    const headerGrad = ctx.createLinearGradient(0, 0, canvas.width, 0)
    headerGrad.addColorStop(0, 'rgba(184,134,11,0.05)')
    headerGrad.addColorStop(0.5, 'rgba(184,134,11,0.08)')
    headerGrad.addColorStop(1, 'rgba(184,134,11,0.05)')
    ctx.fillStyle = headerGrad
    ctx.fillRect(40, 40, canvas.width - 80, 160)

    // ── Logo area (left) ────────────────────────────────────────────────────
    // Load logo image
    const logo = new Image()
    logo.crossOrigin = 'anonymous'
    logo.src = '/pci-logo.png'

    const drawContent = () => {
      // Try to draw logo, fallback to text if not loaded
      try {
        if (logo.complete && logo.naturalWidth > 0) {
          ctx.drawImage(logo, 60, 55, 120, 120)
        } else {
          // Fallback: gold circle with P
          ctx.beginPath()
          ctx.arc(120, 115, 50, 0, Math.PI * 2)
          const logoGrad = ctx.createRadialGradient(120, 115, 0, 120, 115, 50)
          logoGrad.addColorStop(0, G_LIGHT)
          logoGrad.addColorStop(1, G)
          ctx.fillStyle = logoGrad
          ctx.fill()
          ctx.fillStyle = '#000'
          ctx.font = 'bold 42px Georgia, serif'
          ctx.textAlign = 'center'
          ctx.fillText('P', 120, 130)
        }
      } catch (e) {
        // Fallback
        ctx.beginPath()
        ctx.arc(120, 115, 50, 0, Math.PI * 2)
        ctx.fillStyle = G
        ctx.fill()
        ctx.fillStyle = '#000'
        ctx.font = 'bold 42px Georgia, serif'
        ctx.textAlign = 'center'
        ctx.fillText('P', 120, 130)
      }

      // ── Company name (header center) ──────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.fillStyle = G
      ctx.font = 'bold 32px Georgia, serif'
      ctx.fillText('PRIME CAPITAL & INVESTMENT LTD', canvas.width / 2, 95)

      ctx.fillStyle = 'rgba(184,134,11,0.6)'
      ctx.font = '14px Georgia, serif'
      ctx.fillText('Securities & Exchange Commission (SEC) Nigeria · Regulated Investment Manager', canvas.width / 2, 125)

      // ── Certificate title ─────────────────────────────────────────────────
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 26px Georgia, serif'
      ctx.fillText('INVESTMENT CERTIFICATE', canvas.width / 2, 165)

      // ── Gold divider ──────────────────────────────────────────────────────
      const divGrad = ctx.createLinearGradient(80, 0, canvas.width - 80, 0)
      divGrad.addColorStop(0, 'transparent')
      divGrad.addColorStop(0.3, G)
      divGrad.addColorStop(0.7, G)
      divGrad.addColorStop(1, 'transparent')
      ctx.strokeStyle = divGrad
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(80, 185)
      ctx.lineTo(canvas.width - 80, 185)
      ctx.stroke()

      // ── Reference number ──────────────────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(184,134,11,0.7)'
      ctx.font = '13px "Courier New", monospace'
      ctx.fillText(`REF: ${cert.reference}`, canvas.width / 2, 210)

      // ── Main content ──────────────────────────────────────────────────────
      // This certifies that
      ctx.fillStyle = '#888'
      ctx.font = 'italic 16px Georgia, serif'
      ctx.fillText('This is to certify that', canvas.width / 2, 260)

      // Client name
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 36px Georgia, serif'
      ctx.fillText(cert.clientName?.toUpperCase() || 'CLIENT NAME', canvas.width / 2, 310)

      // Account type
      ctx.fillStyle = 'rgba(184,134,11,0.8)'
      ctx.font = '14px Georgia, serif'
      ctx.fillText(`(${cert.accountType || 'Individual'} Account)`, canvas.width / 2, 338)

      ctx.fillStyle = '#888'
      ctx.font = 'italic 15px Georgia, serif'
      ctx.fillText('has successfully invested in', canvas.width / 2, 375)

      // Product name
      ctx.fillStyle = G
      ctx.font = 'bold 24px Georgia, serif'
      ctx.fillText(cert.productName || 'Investment Product', canvas.width / 2, 415)

      // ── Details grid ──────────────────────────────────────────────────────
      const boxY = 450
      const boxH = 120
      const boxPad = 60
      const totalW = canvas.width - (boxPad * 2)
      const cols = 4
      const colW = totalW / cols

      // Box background
      ctx.fillStyle = 'rgba(184,134,11,0.06)'
      ctx.strokeStyle = 'rgba(184,134,11,0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(boxPad, boxY, totalW, boxH, 8)
      ctx.fill()
      ctx.stroke()

      // Vertical dividers
      for (let i = 1; i < cols; i++) {
        ctx.strokeStyle = 'rgba(184,134,11,0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(boxPad + (colW * i), boxY + 15)
        ctx.lineTo(boxPad + (colW * i), boxY + boxH - 15)
        ctx.stroke()
      }

      const details = [
        { label: 'Investment Amount', value: cert.amount || '—' },
        { label: 'Expected ROI', value: cert.roi || '—' },
        { label: 'Issue Date', value: cert.issueDate || '—' },
        { label: 'Maturity Date', value: cert.maturityDate || '—' },
      ]

      details.forEach((d, i) => {
        const cx = boxPad + (colW * i) + (colW / 2)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#555'
        ctx.font = '12px "Segoe UI", sans-serif'
        ctx.fillText(d.label, cx, boxY + 35)
        ctx.fillStyle = G
        ctx.font = 'bold 16px Georgia, serif'
        ctx.fillText(d.value, cx, boxY + 62)
      })

      // ── Terms summary ─────────────────────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.fillStyle = '#444'
      ctx.font = '12px "Segoe UI", sans-serif'
      const termsText = 'A minimum notice of 5 working days is required for liquidation. Premature liquidation attracts a 20% penalty on accrued profit.'
      ctx.fillText(termsText, canvas.width / 2, 600)

      // ── Signature area (MD/CEO + Company Secretary only) ────────────────
      const sigY = 650
      const sigPositions = [canvas.width / 2 - 240, canvas.width / 2 + 240]
      const sigLabels = ['Managing Director / CEO', 'Company Secretary']

      sigPositions.forEach((x, i) => {
        ctx.strokeStyle = 'rgba(184,134,11,0.5)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x - 110, sigY)
        ctx.lineTo(x + 110, sigY)
        ctx.stroke()
        ctx.textAlign = 'center'
        ctx.fillStyle = '#555'
        ctx.font = '12px "Segoe UI", sans-serif'
        ctx.fillText(sigLabels[i], x, sigY + 20)
        // Small FOR label above line
        ctx.fillStyle = 'rgba(184,134,11,0.5)'
        ctx.font = 'italic 10px "Segoe UI", sans-serif'
        ctx.fillText('Prime Capital & Investment Ltd', x, sigY - 10)
      })

      // ── Seal / Watermark (center) ─────────────────────────────────────────
      // Uses the actual company logo (already loaded above for the header)
      // rather than generic "PRIME CAPITAL" text — falls back to the text
      // version only if the logo genuinely failed to load, same fallback
      // philosophy as the header logo above.
      ctx.globalAlpha = 0.05
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, 160, 0, Math.PI * 2)
      ctx.strokeStyle = G
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, 148, 0, Math.PI * 2)
      ctx.stroke()

      if (logo.complete && logo.naturalWidth > 0) {
        const maxDim = 220
        const scale = Math.min(maxDim / logo.naturalWidth, maxDim / logo.naturalHeight)
        const w = logo.naturalWidth * scale
        const h = logo.naturalHeight * scale
        ctx.drawImage(logo, canvas.width / 2 - w / 2, canvas.height / 2 - h / 2, w, h)
      } else {
        ctx.font = 'bold 36px Georgia, serif'
        ctx.fillStyle = G
        ctx.textAlign = 'center'
        ctx.fillText('PRIME CAPITAL', canvas.width / 2, canvas.height / 2 + 12)
      }
      ctx.globalAlpha = 1

      // ── Footer ────────────────────────────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.fillStyle = '#333'
      ctx.font = '11px "Segoe UI", sans-serif'
      ctx.fillText(
        'No. 3 Sankuru Close, Off Rima Street, Maitama, Abuja, Nigeria  ·  info@primecapital.ng  ·  www.primecapital.ng',
        canvas.width / 2, canvas.height - 50
      )
      ctx.fillStyle = 'rgba(184,134,11,0.4)'
      ctx.font = 'italic 11px Georgia, serif'
      ctx.fillText('This certificate is computer-generated and valid without a physical signature unless otherwise stated.', canvas.width / 2, canvas.height - 32)

      // ── Convert to blob and resolve ───────────────────────────────────────
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png', 1.0)
    }

    logo.onload = drawContent
    logo.onerror = drawContent
    // Timeout fallback
    setTimeout(() => {
      if (!logo.complete) drawContent()
    }, 1000)
  })
}

export async function downloadCertificate(cert) {
  const blob = await generateCertificatePDF(cert)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `PCIL-Certificate-${cert.reference || cert.clientName?.replace(/\s/g, '-')}.png`
  a.click()
  URL.revokeObjectURL(url)
}

export async function previewCertificate(cert) {
  const blob = await generateCertificatePDF(cert)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
