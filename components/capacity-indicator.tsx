'use client'

interface CapacityIndicatorProps {
  current: number
  max: number
  serviceType?: string | null
  className?: string
  showLabel?: boolean
}

export function CapacityIndicator({
  current,
  max,
  serviceType,
  className = '',
  showLabel = true,
}: CapacityIndicatorProps) {
  const percentage = max > 0 ? (current / max) * 100 : 0
  
  // Farbcodierung basierend auf Auslastung
  let colorClass = 'bg-green-500'
  if (percentage >= 90) {
    colorClass = 'bg-red-500'
  } else if (percentage >= 70) {
    colorClass = 'bg-yellow-500'
  }

  const getServiceLabel = () => {
    if (!serviceType) return 'Gesamt'
    switch (serviceType) {
      case 'hundepension':
        return 'Urlaubsbetreuung'
      case 'katzenbetreuung':
        return 'Katzenbetreuung'
      case 'tagesbetreuung':
        return 'Tagesbetreuung'
      default:
        return serviceType
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-sage-600">{getServiceLabel()}</span>
          <span className={`font-medium ${
            percentage >= 90 ? 'text-red-600' : 
            percentage >= 70 ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {current}/{max}
          </span>
        </div>
      )}
      <div className="w-full bg-sage-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && percentage >= 90 && (
        <p className="text-xs text-red-600">Kapazität fast erreicht</p>
      )}
    </div>
  )
}

