type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  neutral: 'bg-gray-100 text-gray-700',
};

const sizeStyles: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
};

// Helper untuk mapping status string ke variant
export function getStatusVariant(status: string): BadgeVariant {
  const statusLower = status.toLowerCase();

  if (['approved', 'active', 'verified', 'success', 'completed', 'done'].includes(statusLower)) {
    return 'success';
  }
  if (['pending', 'waiting', 'process', 'processing'].includes(statusLower)) {
    return 'warning';
  }
  if (['rejected', 'failed', 'error', 'inactive', 'cancelled'].includes(statusLower)) {
    return 'error';
  }
  if (['info', 'new'].includes(statusLower)) {
    return 'info';
  }

  return 'neutral';
}

export function Badge({ variant = 'neutral', children, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </span>
  );
}

// Convenience component untuk status badge
export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  return <Badge variant={getStatusVariant(status)} size={size}>{status}</Badge>;
}
