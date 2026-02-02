'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

interface CarrotLoadingProps {
  size?: 'small' | 'default' | 'card' | 'cardLarge'
  text?: string
  noLabel?: boolean
}

const sizeDimensions = {
  small: { width: 60, height: 35 },
  default: { width: 240, height: 138 },
  card: { width: 120, height: 120 },
  cardLarge: { width: 200, height: 200 },
}

export default function CarrotLoading({ size = 'default', text = 'Loading...', noLabel = false }: CarrotLoadingProps) {
  const [animationData, setAnimationData] = useState<object | null>(null)

  useEffect(() => {
    fetch('/animations/Cooking.json')
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null))
  }, [])

  const dimensions = sizeDimensions[size]

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {animationData ? (
        <div style={{ width: dimensions.width, height: dimensions.height }}>
          <Lottie
            animationData={animationData}
            loop
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <div
          className="bg-forest-green/10 rounded animate-pulse"
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      )}
      {size === 'default' && !noLabel && (
        <span className="text-forest-green text-sm font-medium loading-text">{text}</span>
      )}
    </div>
  )
}
