interface CarrotLoadingProps {
  size?: 'small' | 'default'
  text?: string
}

export default function CarrotLoading({ size = 'default', text = 'Loading...' }: CarrotLoadingProps) {
  const dimensions = size === 'small' ? { width: 20, height: 25 } : { width: 64, height: 80 }
  const strokeWidth = size === 'small' ? 2 : 2.5

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 -20 64 100"
        className="stroke-forest-green"
        style={{ fill: 'none', strokeWidth }}
      >
        {/* Carrot body - left side (more organic curve inspired by provided SVG, meets at bottom point) */}
        <path
          d="M 32 14 Q 24 28 22 42 Q 20 56 22 70 Q 24 76 32 78"
          strokeDasharray="200"
          strokeDashoffset="200"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0s' }}
        />
        {/* Carrot body - right side (more organic curve, meets at bottom point) */}
        <path
          d="M 32 14 Q 40 28 42 42 Q 44 56 42 70 Q 40 76 32 78"
          strokeDasharray="200"
          strokeDashoffset="200"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.15s' }}
        />
        {/* Top leafy stems - left side (much longer and more prominent, slower animation) */}
        <path
          d="M 32 14 Q 28 10 22 -8"
          strokeDasharray="55"
          strokeDashoffset="55"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.3s' }}
        />
        <path
          d="M 32 14 Q 30 12 24 -12"
          strokeDasharray="60"
          strokeDashoffset="60"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.35s' }}
        />
        <path
          d="M 32 14 Q 29 11 26 -6"
          strokeDasharray="52"
          strokeDashoffset="52"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.4s' }}
        />
        {/* Top leafy stems - right side (much longer and more prominent, slower animation) */}
        <path
          d="M 32 14 Q 36 10 42 -8"
          strokeDasharray="55"
          strokeDashoffset="55"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.45s' }}
        />
        <path
          d="M 32 14 Q 34 12 40 -12"
          strokeDasharray="60"
          strokeDashoffset="60"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.5s' }}
        />
        <path
          d="M 32 14 Q 35 11 38 -6"
          strokeDasharray="52"
          strokeDashoffset="52"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.55s' }}
        />
        {/* Center stem (much longer, slower animation) */}
        <path
          d="M 32 14 L 32 -10"
          strokeDasharray="48"
          strokeDashoffset="48"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="carrot-path-slow"
          style={{ animationDelay: '0.6s' }}
        />
      </svg>
      {size === 'default' && (
        <span className="text-forest-green text-sm font-medium loading-text">{text}</span>
      )}
    </div>
  )
}
