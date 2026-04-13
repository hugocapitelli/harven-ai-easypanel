
import React from 'react';
import { cn } from '../../lib/utils';

interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  items: TabItem[] | string[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, activeTab, onChange, className, ariaLabel }) => {
  const normalizedItems = items.map((item) => ({
    id: typeof item === 'string' ? item : item.id,
    label: typeof item === 'string' ? item : item.label,
    icon: typeof item === 'string' ? null : item.icon,
  }));

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % normalizedItems.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + normalizedItems.length) % normalizedItems.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = normalizedItems.length - 1;
    }
    if (nextIndex >= 0) {
      e.preventDefault();
      const next = normalizedItems[nextIndex];
      onChange(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}
    >
      {normalizedItems.map((item, index) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            {item.icon && <span className={cn("material-symbols-outlined text-[16px]", isActive ? "fill-1" : "")}>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
