import React from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  tocItems: TocItem[];
  showToc: boolean;
  activeTocItem: string | null;
  onToggle: (show: boolean) => void;
  onScrollToSection: (id: string) => void;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  tocItems,
  showToc,
  activeTocItem,
  onToggle,
  onScrollToSection,
}) => {
  if (tocItems.length === 0) return null;

  // Desktop: floating button when collapsed
  // Mobile: FAB at bottom-right
  if (!showToc) {
    return (
      <>
        {/* Desktop toggle */}
        <button
          onClick={() => onToggle(true)}
          className="hidden lg:block fixed right-4 top-1/2 -translate-y-1/2 z-40 bg-white shadow-lg border border-harven-border p-3 rounded-xl hover:shadow-xl transition-all group"
          title="Mostrar índice"
        >
          <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">toc</span>
        </button>

        {/* Mobile FAB */}
        <button
          onClick={() => onToggle(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 bg-primary text-harven-dark p-3 rounded-full shadow-lg hover:shadow-xl transition-all"
          aria-label="Índice"
        >
          <span className="material-symbols-outlined">toc</span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Mobile/Tablet overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => onToggle(false)}
        aria-hidden="true"
      />

      {/* TOC panel - fixed on mobile/tablet, fixed on desktop */}
      <div className={`
        fixed z-50 transition-all duration-300 opacity-100
        lg:right-4 lg:top-1/2 lg:-translate-y-1/2
        inset-y-0 right-0 lg:inset-y-auto
      `}>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-none lg:rounded-xl shadow-lg border-l lg:border border-harven-border p-4 w-72 lg:w-[240px] h-full lg:h-auto lg:max-h-[70vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-harven-border">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">toc</span>
              <span className="text-xs font-bold text-harven-dark dark:text-white uppercase tracking-wider">Índice</span>
            </div>
            <button
              onClick={() => onToggle(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
              title="Fechar índice"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <nav className="overflow-y-auto custom-scrollbar flex-1 pr-1">
            <ul className="space-y-1">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onScrollToSection(item.id);
                      // Close on mobile after selection
                      if (window.innerWidth < 1024) onToggle(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all duration-200 line-clamp-2 ${
                      activeTocItem === item.id
                        ? 'bg-primary/10 text-primary-dark font-bold border-l-2 border-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-harven-dark dark:hover:text-white'
                    } ${
                      item.level === 1 ? 'font-semibold' :
                      item.level === 2 ? 'pl-4' :
                      'pl-6 text-[11px]'
                    }`}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-3 pt-2 border-t border-harven-border">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>{tocItems.length} seções</span>
              <span className="hidden lg:flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">keyboard_arrow_up</span>
                <span className="material-symbols-outlined text-[12px]">keyboard_arrow_down</span>
                navegar
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TableOfContents;
