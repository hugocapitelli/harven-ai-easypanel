
import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  className, 
  containerClassName,
  label,
  children,
  id,
  ...props 
}) => {
  return (
    <div className={cn("space-y-1.5 w-full", containerClassName)}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        <select 
          id={id}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none text-foreground font-medium",
            className
          )}
          {...props} 
        >
          {children}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px] pointer-events-none">
          expand_more
        </span>
      </div>
    </div>
  );
};
