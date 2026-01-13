import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-button font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-laranja-energia text-white hover:bg-laranja-hover focus:ring-laranja-energia': variant === 'primary',
            'bg-navy-confianca text-white hover:bg-navy-light focus:ring-navy-confianca': variant === 'secondary',
            'border-2 border-laranja-energia text-laranja-energia hover:bg-laranja-energia hover:text-white': variant === 'outline',
            'text-texto-principal hover:bg-cinza-claro': variant === 'ghost',
          },
          {
            'px-3 py-2 text-sm': size === 'sm',
            'px-4 py-3 text-base': size === 'md',
            'px-6 py-4 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
