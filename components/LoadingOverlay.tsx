'use client'

import { createPortal } from 'react-dom'
import CarrotLoading from './CarrotLoading'

interface LoadingOverlayProps {
  title: string
  subtitle?: string
}

export default function LoadingOverlay({
  title,
  subtitle = 'This may take 20–30 seconds',
}: LoadingOverlayProps) {
  const overlay = (
    <div
      className="overlay-fade-in fixed flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        minWidth: '100vw',
        minHeight: '100dvh',
        zIndex: 2147483647,
        isolation: 'isolate',
        transform: 'translateZ(0)',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="flex flex-col items-center text-center"
        style={{
          backgroundColor: 'white',
          padding: 64,
          borderRadius: 28,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CarrotLoading size="cardLarge" noLabel />
        <h3
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-gray-500" style={{ fontSize: 16 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body)
  }
  return overlay
}
