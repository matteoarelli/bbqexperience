// Endpoint OG Image — genera una pagina HTML stilizzata come card 1200x630
// per screenshot da tool esterni o uso come og:image dinamica per le recensioni
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get('title') || 'BBQ Experience';
  const score = url.searchParams.get('score') || '';
  const verdict = url.searchParams.get('verdict') || '';
  const locale = url.searchParams.get('locale') || 'en';

  // Etichetta localizzata per "Score"
  const scoreLabel: Record<string, string> = {
    en: 'Score',
    it: 'Punteggio',
    es: 'Puntuacion',
  };

  // Etichetta localizzata per "Verdict"
  const verdictLabel: Record<string, string> = {
    en: 'Our Verdict',
    it: 'Il Nostro Verdetto',
    es: 'Nuestro Veredicto',
  };

  // Colore badge in base al punteggio
  const scoreNum = parseFloat(score);
  let badgeColor = '#f97316'; // arancio (default)
  if (scoreNum >= 9) badgeColor = '#22c55e'; // verde
  else if (scoreNum >= 7) badgeColor = '#f97316'; // arancio
  else if (scoreNum >= 5) badgeColor = '#eab308'; // giallo
  else if (scoreNum > 0) badgeColor = '#ef4444'; // rosso

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1200" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1200px;
      height: 630px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0D0D0D 0%, #1a1a1a 50%, #0D0D0D 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      position: relative;
    }

    /* Pattern sottile di sfondo */
    body::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 20% 80%, rgba(249, 115, 22, 0.08) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.05) 0%, transparent 50%);
    }

    .card {
      position: relative;
      z-index: 1;
      width: 1100px;
      height: 530px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
    }

    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 40px;
    }

    .title {
      font-size: 48px;
      font-weight: 900;
      color: #FAFAF9;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.1;
      max-width: 700px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .score-badge {
      flex-shrink: 0;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: ${badgeColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 40px ${badgeColor}66, 0 0 80px ${badgeColor}33;
    }

    .score-number {
      font-size: 56px;
      font-weight: 900;
      color: white;
      line-height: 1;
    }

    .score-label {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .verdict-section {
      margin-top: auto;
    }

    .verdict-label {
      font-size: 14px;
      font-weight: 700;
      color: ${badgeColor};
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }

    .verdict-text {
      font-size: 22px;
      color: rgba(250, 250, 249, 0.75);
      line-height: 1.4;
      max-width: 800px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #f97316;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-icon svg {
      width: 20px;
      height: 20px;
    }

    .brand-name {
      font-size: 20px;
      font-weight: 700;
      color: rgba(250, 250, 249, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <h1 class="title">${escapeHtml(title)}</h1>
      ${score ? `
      <div class="score-badge">
        <span class="score-number">${escapeHtml(score)}</span>
        <span class="score-label">${scoreLabel[locale] || scoreLabel.en}</span>
      </div>
      ` : ''}
    </div>

    <div class="verdict-section">
      ${verdict ? `
      <div class="verdict-label">${verdictLabel[locale] || verdictLabel.en}</div>
      <p class="verdict-text">${escapeHtml(verdict)}</p>
      ` : ''}

      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="brand-name">BBQ Experience</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
};

/** Escapa caratteri pericolosi per HTML */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
