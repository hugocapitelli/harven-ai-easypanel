import React from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface SocraticChatProps {
  selectedQuestion: string;
  chatMessages: ChatMessage[];
  isAiThinking: boolean;
  isCheckingAI: boolean;
  chatError: string | null;
  interactionCount: number;
  maxInteractions: number;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  onSend: () => void;
  onClose: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const SocraticChat: React.FC<SocraticChatProps> = ({
  selectedQuestion,
  chatMessages,
  isAiThinking,
  isCheckingAI,
  chatError,
  interactionCount,
  maxInteractions,
  messagesEndRef,
  chatInputRef,
  onSend,
  onClose,
  onKeyDown,
}) => {
  return (
    <section className="mt-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-harven-border shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-harven-dark p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <span className="material-symbols-outlined text-primary text-[22px]">psychology</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 rounded-full border-2 border-harven-dark"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white text-base font-bold">Diálogo Socrático</h3>
                <span className="bg-white/10 text-[9px] font-bold px-2 py-0.5 rounded text-gray-300 border border-white/5 uppercase">Beta</span>
              </div>
              <p className="text-primary/80 text-xs mt-0.5 line-clamp-1" title={selectedQuestion}>
                {selectedQuestion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 border border-white/5">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Interações</span>
              <div className="flex gap-1">
                {[...Array(maxInteractions)].map((_, i) => (
                  <div key={i} className={`size-2 rounded-full ${i < interactionCount ? 'bg-red-500' : 'bg-primary'}`}></div>
                ))}
              </div>
              <span className="text-xs font-bold text-white ml-1">{interactionCount}/{maxInteractions}</span>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all p-2 rounded-lg"
              title="Fechar Debate"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="p-6 bg-[#fafaf8] min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-5" role="log" aria-live="polite" aria-label="Mensagens do diálogo socrático">
            {chatMessages.map((msg, index) => (
              <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {msg.role === 'ai' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-harven-gold uppercase tracking-[0.15em]">Harven AI</span>
                      <span className="text-[9px] font-bold text-gray-300">
                        {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-white border border-harven-border p-5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] relative">
                      {index === 0 && (
                        <span className="absolute top-3 left-3 text-4xl font-display text-gray-100 -z-10 select-none">"</span>
                      )}
                      <p className="text-sm text-harven-dark leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-harven-dark text-white p-4 rounded-2xl rounded-tr-none shadow-md max-w-[85%]">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 mr-2 uppercase">
                      Você • {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            ))}

            {isAiThinking && (
              <div className="flex flex-col gap-2 items-start animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-harven-gold uppercase tracking-[0.15em]">Harven AI</span>
                </div>
                <div className="bg-white border border-harven-border p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs text-gray-400 ml-2">
                      {isCheckingAI ? 'Verificando resposta...' : 'Pensando...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {chatError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs text-center">
                {chatError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-5 bg-white border-t border-harven-border">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-harven-gold rounded-xl opacity-0 group-focus-within:opacity-30 transition-opacity duration-300"></div>
            <div className="relative flex items-end gap-3">
              <textarea
                ref={chatInputRef}
                onKeyDown={onKeyDown}
                disabled={interactionCount >= maxInteractions}
                className="flex-1 bg-harven-bg border border-harven-border rounded-xl p-4 text-sm text-harven-dark placeholder-gray-400 focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[60px] max-h-[120px] resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={interactionCount >= maxInteractions ? "Limite de interações atingido para este tópico." : "Digite sua resposta aqui..."}
              />
              <div className="flex flex-col gap-2 pb-1">
                {interactionCount < maxInteractions ? (
                  <button
                    onClick={onSend}
                    className="h-12 w-12 bg-primary rounded-xl text-harven-dark shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    title="Enviar"
                  >
                    <span className="material-symbols-outlined fill-1 text-[20px]">send</span>
                  </button>
                ) : (
                  <div className="h-12 w-12 bg-gray-200 rounded-xl text-gray-400 flex items-center justify-center cursor-not-allowed">
                    <span className="material-symbols-outlined text-[20px]">block</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              {interactionCount >= maxInteractions
                ? "Ciclo socrático completado"
                : "Enter para enviar • Shift+Enter para quebrar linha"}
            </p>
            <div className="flex items-center gap-1.5">
              <div className={`size-1.5 rounded-full ${interactionCount >= maxInteractions ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
              <span className="text-[9px] font-bold text-gray-500 uppercase">
                {interactionCount >= maxInteractions ? "Fechado" : "Ativo"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocraticChat;
