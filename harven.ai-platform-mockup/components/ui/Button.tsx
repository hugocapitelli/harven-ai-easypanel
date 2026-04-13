
import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  className, 
  variant = 'primary', 
  size = 'default', 
  fullWidth = false,
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-harven-dark hover:bg-primary-dark shadow-lg shadow-primary/20",
    outline: "border border-harven-border text-harven-dark hover:bg-gray-50",
    ghost: "text-gray-400 hover:text-harven-dark hover:bg-harven-bg",
    destructive: "text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100",
  };

  const sizes = {
    default: "px-5 py-2.5 text-xs uppercase tracking-widest",
    sm: "px-3 py-1.5 text-[10px] uppercase tracking-wide",
    icon: "size-10 p-0",
  };

  return (
    <button 
      className={cn(
        baseStyles, 
        variants[variant], 
        sizes[size], 
        fullWidth ? 'w-full' : '',
        className
      )} 
      {...props}
    >
      {children}
    </button>
  );
};
