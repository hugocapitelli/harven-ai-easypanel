
import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  classNameImage?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  fallback, 
  size = 'md', 
  className,
  classNameImage
}) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  };

  return (
    <div className={cn("relative flex shrink-0 overflow-hidden rounded-full", sizeClasses[size], className)}>
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className={cn("aspect-square h-full w-full object-cover", classNameImage)} 
          onError={(e) => e.currentTarget.style.display = 'none'}
        />
      ) : null}
      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-bold uppercase">
        {fallback.slice(0, 2)}
      </div>
    </div>
  );
};
