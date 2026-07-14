type LegalContentProps = {
  html: string
  className?: string
}

export function LegalContent({ html, className = '' }: LegalContentProps) {
  return (
    <div
      className={`legal-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
