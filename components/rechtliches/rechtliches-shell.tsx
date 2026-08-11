import type { ReactNode } from 'react'

type RechtlichesShellProps = {
  children: ReactNode
  /** Hub uses centered layout; subpages use top-aligned scroll */
  variant?: 'hub' | 'document'
}

export function RechtlichesShell({ children, variant = 'hub' }: RechtlichesShellProps) {
  return (
    <div
      className={`min-h-[100dvh] bg-gradient-to-b from-sage-100 to-sage-50 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] ${
        variant === 'hub' ? 'flex flex-col items-center justify-center' : ''
      }`}
    >
      <div className={`w-full max-w-md md:max-w-2xl lg:max-w-3xl ${variant === 'document' ? 'mx-auto' : ''}`}>{children}</div>
    </div>
  )
}
