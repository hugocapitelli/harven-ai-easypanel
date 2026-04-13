import React from 'react';

interface SocraticQuestion {
  id: string;
  question: string;
  description: string;
  icon: string;
}

interface SocraticQuestionsGridProps {
  questions: SocraticQuestion[];
  selectedQuestion: string | null;
  lockedQuestionId: string | null;
  isEditing: boolean;
  onQuestionSelect: (questionId: string, questionText: string) => void;
  onResetConversation: () => void;
}

const SocraticQuestionsGrid: React.FC<SocraticQuestionsGridProps> = ({
  questions,
  selectedQuestion,
  lockedQuestionId,
  isEditing,
  onQuestionSelect,
  onResetConversation,
}) => {
  return (
    <section className="mt-8 pb-8 pt-10 border-t border-harven-border animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-full bg-harven-dark flex items-center justify-center text-primary shadow-lg">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-harven-dark">Desafio Socrático</h3>
            <p className="text-sm text-gray-500">
              {lockedQuestionId
                ? 'Você iniciou uma conversa. Continue ou reinicie para escolher outra pergunta.'
                : 'Selecione um tópico para debater com a IA e validar seu aprendizado.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lockedQuestionId && (
            <button
              onClick={onResetConversation}
              className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg text-xs uppercase hover:bg-red-50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span> Reiniciar Conversa
            </button>
          )}
          {isEditing && (
            <button className="px-4 py-2 border border-dashed border-primary text-primary-dark font-bold rounded-lg text-xs uppercase hover:bg-primary/5 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined">add</span> Nova Pergunta
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {questions.map((q) => {
          const isLocked = !!lockedQuestionId && lockedQuestionId !== q.id;
          const isSelected = selectedQuestion === q.question && !isEditing;
          const isActive = lockedQuestionId === q.id;

          return (
            <button
              key={q.id}
              onClick={() => onQuestionSelect(q.id, q.question)}
              disabled={isLocked}
              className={`relative p-6 rounded-xl text-left border transition-all duration-300 group overflow-hidden ${
                isSelected
                  ? 'bg-harven-dark border-harven-dark ring-2 ring-primary ring-offset-2'
                  : isLocked
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : isActive
                      ? 'bg-primary/10 border-primary'
                      : 'bg-white border-harven-border hover:border-primary hover:shadow-md'
              }`}
            >
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/60">
                  <span className="material-symbols-outlined text-gray-400 text-3xl">lock</span>
                </div>
              )}

              {isEditing && !isLocked && (
                <div className="absolute top-2 right-2 flex gap-1 z-20">
                  <div className="p-1.5 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-500"><span className="material-symbols-outlined text-[16px]">edit</span></div>
                  <div className="p-1.5 bg-red-50 rounded-md hover:bg-red-100 text-red-500"><span className="material-symbols-outlined text-[16px]">delete</span></div>
                </div>
              )}

              <div className={`absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110 ${isSelected ? 'text-white' : 'text-harven-dark'}`}>
                <span className="material-symbols-outlined text-[64px]">{q.icon}</span>
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                <span className={`material-symbols-outlined text-[28px] ${isSelected ? 'text-primary' : isActive ? 'text-primary-dark' : 'text-gray-400 group-hover:text-primary-dark'}`}>
                  {q.icon}
                </span>
                <div>
                  <h4 className={`font-bold text-sm mb-2 leading-tight ${isSelected ? 'text-white' : 'text-harven-dark'}`}>
                    {q.question}
                  </h4>
                  <p className={`text-xs leading-relaxed ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                    {q.description}
                  </p>
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-2 ${selectedQuestion === q.question && !isEditing ? 'text-primary' : 'text-gray-300 group-hover:text-primary-dark'}`}>
                  {isEditing ? 'Editar Configuração' : selectedQuestion === q.question ? 'Em Discussão' : 'Iniciar Debate'}
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SocraticQuestionsGrid;
