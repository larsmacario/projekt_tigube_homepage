export type LegalPdfBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Flacht HTML zu lesbarem Text (Links → Linktext). */
export function htmlFragmentToPlain(html: string): string {
  const withLinks = html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  const stripped = withLinks.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
  return decodeHtmlEntities(stripped.replace(/\s+/g, ' ').trim())
}

function parseListItems(ulInner: string): string[] {
  const items: string[] = []
  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi
  let m: RegExpExecArray | null
  while ((m = liRe.exec(ulInner)) !== null) {
    items.push(htmlFragmentToPlain(m[1]))
  }
  return items
}

/**
 * Parst AGB-/Legal-HTML in Reihenfolge (h2, p, ul, blockquote, hr).
 * Läuft in Node (Tests) und im Browser (PDF).
 */
export function parseLegalHtmlToBlocks(html: string): LegalPdfBlock[] {
  const blocks: LegalPdfBlock[] = []
  const re =
    /<h2\b[^>]*>([\s\S]*?)<\/h2>|<ul\b[^>]*>([\s\S]*?)<\/ul>|<p\b[^>]*>([\s\S]*?)<\/p>|<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>|<hr\s*\/?>/gi

  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    if (match[1] !== undefined) {
      blocks.push({ type: 'heading', text: htmlFragmentToPlain(match[1]) })
    } else if (match[2] !== undefined) {
      blocks.push({ type: 'list', items: parseListItems(match[2]) })
    } else if (match[3] !== undefined) {
      blocks.push({ type: 'paragraph', text: htmlFragmentToPlain(match[3]) })
    } else if (match[4] !== undefined) {
      blocks.push({ type: 'blockquote', text: htmlFragmentToPlain(match[4]) })
    } else {
      blocks.push({ type: 'hr' })
    }
  }

  return blocks
}

export function extractLegalSectionHeadings(html: string): string[] {
  return parseLegalHtmlToBlocks(html)
    .filter((b): b is LegalPdfBlock & { type: 'heading' } => b.type === 'heading')
    .map((b) => b.text)
}
