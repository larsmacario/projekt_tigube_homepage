import { PawPrint } from 'lucide-react'
import { cn } from '@/lib/utils'

type PetAvatarProps = {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
} as const

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
} as const

export function PetAvatar({
  name,
  photoUrl,
  size = 'md',
  className,
}: PetAvatarProps) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-full border border-sage-200 bg-sage-50',
        sizeClasses[size],
        className
      )}
      aria-hidden={!photoUrl}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`Foto von ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sage-400">
          <PawPrint className={iconSizeClasses[size]} />
        </div>
      )}
    </div>
  )
}
