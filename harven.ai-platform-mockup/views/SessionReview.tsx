import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { sessionReviewsApi } from '../services/api';
import { safeJsonParse } from '../lib/utils';
import type { SessionReviewDetail } from '../types';

const SessionReview: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [data, setData] = useState<SessionReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  const currentUser = safeJsonParse<{ id: string; role: string; name: string } | null>('user-data', null);
  const isInstructor = currentUser?.role === 'INSTRUCTOR' || currentUser?.role === 'ADMIN';
  const isStudent = currentUser?.role === 'STUDENT';

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await sessionReviewsApi.getReview(sessionId);
        setData(result);
        if (result.review) {
          setRating(result.review.rating);
        }
      } catch (e: any) {
        if (e.response?.status === 404) {
          toast.error('Sessão não encontrada');
          navigate(-1);
        } else {
          console.error('Error loading review', e);
          toast.error('Erro ao carregar avaliação');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSubmitReview = async () => {
    if (!sessionId || rating === 0 || !reviewComment.trim()) return;
    setSending(true);
    try {
      await sessionReviewsApi.submitReview(sessionId, { rating, comment: reviewComment.trim() });
      const result = await sessionReviewsApi.getReview(sessionId);
      setData(result);
      setShowReviewForm(false);
      setReviewComment('');
      toast.success('Avaliação enviada com sucesso!');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao enviar avaliação');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !messageText.trim()) return;
    setSending(true);
    try {
      if (isStudent) {
        await sessionReviewsApi.replyToReview(sessionId, messageText.trim());
      } else {
        await sessionReviewsApi.sendInstructorMessage(sessionId, messageText.trim());
      }
      const result = await sessionReviewsApi.getReview(sessionId);
      setData(result);
      setMessageText('');
      toast.success('Mensagem enviada!');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateRating = async (newRating: number) => {
    if (!sessionId || !data?.review) return;
    setRating(newRating);
    try {
      await sessionReviewsApi.updateReview(sessionId, { rating: newRating });
      toast.success('Nota atualizada');
    } catch {
      toast.error('Erro ao atualizar nota');
    }
  };

  const handleCloseReview = async () => {
    if (!sessionId) return;
    try {
      await sessionReviewsApi.updateReview(sessionId, { status: 'closed' });
      const result = await sessionReviewsApi.getReview(sessionId);
      setData(result);
      toast.success('Avaliação encerrada');
    } catch {
      toast.error('Erro ao encerrar avaliação');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-gray-400">Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const aiMessages = data.messages.filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system');
  const feedbackMessages = data.messages.filter(m => m.role === 'instructor' || m.role === 'student_reply');
  const reviewStatus = data.review?.status;
  const canSendMessage = data.review && reviewStatus !== 'closed' && (
    (isStudent && reviewStatus === 'pending_student') ||
    (isInstructor && (reviewStatus === 'replied' || reviewStatus === 'pending_student'))
  );
  const hasReview = !!data.review;

  return (
    <div className="flex flex-col flex-1 h-full animate-in fade-in duration-500 bg-harven-bg">
      {/* Header */}
      <div className="bg-white border-b border-harven-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-harven-bg rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-500">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-harven-dark">Avaliação da Conversa</h1>
            <p className="text-xs text-gray-400">
              {data.student_name} {data.session.content_title ? `— ${data.session.content_title}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasReview && (
            <div className="flex items-center gap-1.5 bg-harven-bg px-3 py-1.5 rounded-lg">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nota:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`material-symbols-outlined text-[18px] ${star <= rating ? 'text-harven-gold fill-1' : 'text-gray-200'}`}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
          )}
          {hasReview && isInstructor && reviewStatus !== 'closed' && (
            <button
              onClick={handleCloseReview}
              className="px-3 py-1.5 border border-harven-border rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-50 uppercase tracking-wider"
            >
              Encerrar
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: AI Conversation (read-only) */}
        <div className="flex-1 flex flex-col border-r border-harven-border">
          <div className="px-6 py-3 bg-white/50 border-b border-harven-border flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary-dark">smart_toy</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversa Socrática Original</span>
            <span className="text-[10px] text-gray-300 ml-auto">{aiMessages.length} mensagens</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-harven-dark text-white rounded-br-md'
                    : msg.role === 'system'
                      ? 'bg-gray-100 text-gray-500 text-xs italic'
                      : 'bg-white border border-harven-border text-harven-dark rounded-bl-md'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/40' : 'text-gray-300'}`}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
            {aiMessages.length === 0 && (
              <div className="text-center py-10 text-gray-300 text-sm">Nenhuma mensagem na conversa.</div>
            )}
          </div>
        </div>

        {/* Right: Review & Feedback */}
        <div className="w-[420px] flex flex-col bg-white">
          <div className="px-6 py-3 border-b border-harven-border flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-harven-gold">rate_review</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avaliação e Feedback</span>
          </div>

          {/* No review yet - show create form for instructor */}
          {!hasReview && isInstructor && !showReviewForm && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <span className="material-symbols-outlined text-[48px] text-gray-200 mb-4">rate_review</span>
                <p className="text-sm text-gray-400 mb-4">Esta conversa ainda não foi avaliada.</p>
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="px-5 py-2.5 bg-primary text-harven-dark font-bold rounded-lg text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2 mx-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  Avaliar Conversa
                </button>
              </div>
            </div>
          )}

          {/* Review creation form */}
          {!hasReview && isInstructor && showReviewForm && (
            <div className="flex-1 p-6 flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Nota</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <span className={`material-symbols-outlined text-[28px] ${
                        star <= (hoverRating || rating) ? 'text-harven-gold fill-1' : 'text-gray-200'
                      }`}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comentário para o aluno</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="flex-1 w-full bg-harven-bg border-none rounded-lg px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-primary placeholder-gray-400 text-harven-dark resize-none"
                  placeholder="Escreva seu feedback sobre a conversa do aluno..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReviewForm(false); setRating(0); setReviewComment(''); }}
                  className="flex-1 py-2.5 border border-harven-border rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={rating === 0 || !reviewComment.trim() || sending}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark rounded-lg text-xs font-bold text-harven-dark transition-all uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    'Enviar Avaliação'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* No review - student view */}
          {!hasReview && isStudent && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <span className="material-symbols-outlined text-[48px] text-gray-200 mb-4">hourglass_empty</span>
                <p className="text-sm text-gray-400">Esta conversa ainda não foi avaliada pelo professor.</p>
              </div>
            </div>
          )}

          {/* Review exists - show feedback thread */}
          {hasReview && (
            <>
              {/* Rating (editable for instructor) */}
              <div className="px-6 py-4 border-b border-harven-border">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Nota do Professor</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      disabled={!isInstructor || reviewStatus === 'closed'}
                      onMouseEnter={() => isInstructor && reviewStatus !== 'closed' && setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => isInstructor && reviewStatus !== 'closed' && handleUpdateRating(star)}
                      className={`p-0.5 transition-transform ${isInstructor && reviewStatus !== 'closed' ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`material-symbols-outlined text-[24px] ${
                        star <= (hoverRating || rating) ? 'text-harven-gold fill-1' : 'text-gray-200'
                      }`}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
                {reviewStatus === 'closed' && (
                  <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase mt-2 inline-block">Encerrada</span>
                )}
              </div>

              {/* Feedback messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {feedbackMessages.map((msg) => {
                  const isInstructorMsg = msg.role === 'instructor';
                  return (
                    <div key={msg.id} className={`flex ${isInstructorMsg ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                        isInstructorMsg
                          ? 'bg-indigo-50 border border-indigo-100 text-harven-dark rounded-bl-md'
                          : 'bg-emerald-50 border border-emerald-100 text-harven-dark rounded-br-md'
                      }`}>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${
                          isInstructorMsg ? 'text-indigo-400' : 'text-emerald-400'
                        }`}>
                          {isInstructorMsg ? 'Professor' : 'Aluno'}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[10px] text-gray-300 mt-1.5">
                          {msg.created_at ? new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {feedbackMessages.length === 0 && (
                  <div className="text-center py-6 text-gray-300 text-sm">Nenhuma mensagem de feedback ainda.</div>
                )}
                <div ref={feedbackEndRef} />
              </div>

              {/* Message input */}
              {canSendMessage && (
                <div className="p-4 border-t border-harven-border">
                  <div className="flex gap-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 bg-harven-bg border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary placeholder-gray-400 text-harven-dark resize-none"
                      placeholder={isInstructor ? 'Enviar mensagem para o aluno...' : 'Responder ao professor...'}
                      rows={2}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="px-4 bg-primary hover:bg-primary-dark rounded-lg text-harven-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {sending ? (
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionReview;
