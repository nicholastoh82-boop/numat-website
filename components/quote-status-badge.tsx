'use client'

import { cn } from '@/lib/utils'
import { Check, Clock, AlertCircle, Hourglass, XCircle, Zap } from 'lucide-react'

interface QuoteStatusBadgeProps {
  status: 'pending' | 'draft' | 'processing' | 'completed' | 'cancelled' | 'expired'
  size?: 'sm' | 'md' | 'lg'
}

export function QuoteStatusBadge({ status, size = 'md' }: QuoteStatusBadgeProps) {
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: Clock,
          label: 'Pending'
        }
      case 'draft':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: Hourglass,
          label: 'Draft'
        }
      case 'processing':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: Zap,
          label: 'Processing'
        }
      case 'completed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: Check,
          label: 'Completed'
        }
      case 'cancelled':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: XCircle,
          label: 'Cancelled'
        }
      case 'expired':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          icon: AlertCircle,
          label: 'Expired'
        }
      default:
        return {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          icon: AlertCircle,
          label: 'Unknown'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  const padding = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      config.bg,
      config.text,
      padding
    )}>
      <Icon className={iconSize} />
      <span>{config.label}</span>
    </div>
  )
}
