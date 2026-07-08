type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'

const VARIANTS: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary-container text-on-surface',
  success: 'bg-success-container text-success',
  warning: 'bg-warning-container text-warning',
  error: 'bg-error-container text-error',
  outline: 'border border-outline-variant text-on-surface-variant',
}

export default function Badge({
  children,
  variant = 'secondary',
  className = '',
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  )
}
