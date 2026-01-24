import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'share';
  tag?: string;
  children: ReactNode;
}

export function CyberButton({
  variant = 'primary',
  tag,
  children,
  className = '',
  ...props
}: CyberButtonProps) {
  const variantClass = `cyber-btn--${variant}`;
  const text = typeof children === 'string' ? children : '';

  return (
    <button
      type="button"
      className={`cyber-btn ${variantClass} ${className}`}
      {...props}
    >
      <span className="btn-glitch" data-text={text}>
        {children}
      </span>
      {tag && <span className="btn-tag">{tag}</span>}
    </button>
  );
}
