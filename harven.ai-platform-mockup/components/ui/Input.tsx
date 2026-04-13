
import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  label?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ 
  className, 
  containerClassName,
  icon, 
  label,
  id,
  ...props 
}) => {
  return (
    <div className={cn("space-y-1.5 w-full", containerClassName)}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] group-focus-within:text-primary transition-colors">
            {icon}
          </span>
        )}
        <input 
          id={id}
          className={cn(
            "w-full bg-harven-bg border-none rounded-lg text-sm text-harven-dark placeholder-gray-400 focus:ring-1 focus:ring-primary transition-all",
            icon ? "pl-10 pr-4 py-2" : "px-4 py-2",
            className
          )}
          {...props} 
        />
      </div>
    </div>
  );
};
