
import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: "bg-harven-bg text-gray-500",
    success: "bg-green-100 text-green-700 border border-green-200",
    warning: "bg-orange-50 text-orange-700 border border-orange-100",
    danger: "bg-red-50 text-red-600 border border-red-100",
    outline: "bg-transparent border border-harven-border text-gray-500",
  };

  return (
    <span 
      className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter inline-flex items-center gap-1",
        variants[variant],
        className
      )} 
      {...props}
    >
      {children}
    </span>
  );
};
