import React from 'react';

interface EditingToolbarProps {
  isSaving: boolean;
  onBold: () => void;
  onItalic: () => void;
  onHighlight: () => void;
  onAddLink: () => void;
  onAddImage: () => void;
  onRewriteWithAI: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const EditingToolbar: React.FC<EditingToolbarProps> = ({
  isSaving,
  onBold,
  onItalic,
  onHighlight,
  onAddLink,
  onAddImage,
  onRewriteWithAI,
  onCancel,
  onSave,
}) => {
  return (
    <div className="sticky top-4 left-0 right-0 z-50 flex justify-center animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
      <div className="bg-harven-dark/90 backdrop-blur-md text-white p-2 rounded-xl shadow-2xl flex items-center gap-1 pointer-events-auto border border-white/10">
        <button onClick={onBold} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Negrito (Ctrl+B)">
          <span className="material-symbols-outlined text-[20px]">format_bold</span>
        </button>
        <button onClick={onItalic} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Itálico (Ctrl+I)">
          <span className="material-symbols-outlined text-[20px]">format_italic</span>
        </button>
        <button onClick={onHighlight} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-yellow-400" title="Grifar/Destacar">
          <span className="material-symbols-outlined text-[20px]">border_color</span>
        </button>
        <button onClick={onAddLink} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Adicionar Link">
          <span className="material-symbols-outlined text-[20px]">link</span>
        </button>
        <div className="w-px h-6 bg-white/20 mx-1"></div>
        <button onClick={onRewriteWithAI} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-primary" title="Reescrever com IA">
          <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
        </button>
        <button onClick={onAddImage} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Adicionar Imagem">
          <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
        </button>
        <div className="w-px h-6 bg-white/20 mx-1"></div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-600 text-white font-bold rounded-lg text-xs uppercase tracking-wide hover:bg-gray-500 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-1.5 bg-primary text-harven-dark font-bold rounded-lg text-xs uppercase tracking-wide hover:bg-primary-dark transition-colors ml-1 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </button>
      </div>
    </div>
  );
};

export default EditingToolbar;
