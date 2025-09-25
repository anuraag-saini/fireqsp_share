// components/features/StatsCard.tsx
interface StatsCardProps {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}

export function StatsCard({ label, value, change, trend }: StatsCardProps) {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  }

  const trendIcon = {
    up: '↗',
    down: '↘',
    neutral: '→',
  }

  return (
    <div className="card animate-fade-in">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className={`text-sm ${trendColor[trend]} flex items-center gap-1`}>
        <span>{trendIcon[trend]}</span>
        <span>{change}</span>
      </p>
    </div>
  )
}
