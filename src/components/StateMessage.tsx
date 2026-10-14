import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Centered icon + title + description + optional action. Used for empty, error and not-found states. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = 'default',
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  tone?: 'default' | 'error'
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)} role={tone === 'error' ? 'alert' : undefined}>
      <span
        className={cn(
          'mb-4 grid size-11 place-items-center rounded-full',
          tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="text-base font-medium">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}
