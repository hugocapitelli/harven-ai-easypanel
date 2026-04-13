
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { UserRole } from '../types';
import { contentsApi, questionsApi, uploadApi, aiApi, chatSessionsApi, userStatsApi, ttsApi } from '../services/api';
import { formatExtractedText, extractHeadings } from '../lib/formatExtractedText';
import TableOfContents from '../components/chapter-reader/TableOfContents';
import EditingToolbar from '../components/chapter-reader/EditingToolbar';
import SocraticQuestionsGrid from '../components/chapter-reader/SocraticQuestionsGrid';
import SocraticChat from '../components/chapter-reader/SocraticChat';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChapterReaderProps {
    userRole?: UserRole;
}

const ChapterReader: React.FC<ChapterReaderProps> = ({ userRole = 'STUDENT' }) => {
  const navigate = useNavigate();
  const { courseId, chapterId, contentId } = useParams<{ courseId: string; chapterId: string; contentId: string }>();
  // Estado para armazenar qual pergunta socrática está selecionada
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  // Estado para controlar se o chat está em tela cheia
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Estado para dados do conteúdo carregado
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Tipo de conteúdo (pode vir dos dados ou ser alterado pelo usuário se disponível)
  const [contentType, setContentType] = useState<'TEXT' | 'VIDEO' | 'AUDIO'>('TEXT');
  const [viewMode, setViewMode] = useState<'file' | 'text'>('file'); // Modo de visualização: arquivo original ou texto extraído
  const [interactionCount, setInteractionCount] = useState(0);
  const MAX_INTERACTIONS = 3;

  // Estado de Edição (Instrutor)
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estado do Chat Socrático
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lockedQuestionId, setLockedQuestionId] = useState<string | null>(null); // Pergunta bloqueada após primeira resposta
  const [isCheckingAI, setIsCheckingAI] = useState(false); // Estado de verificação de IA
  const [chatSessionId, setChatSessionId] = useState<string | null>(null); // ID da sessão persistida
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ref para o input do chat para focar automaticamente
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Refs para upload de mídia
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Ref para o conteúdo editável
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Estado para o navegador de seções (TOC)
  const [tocItems, setTocItems] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [showToc, setShowToc] = useState(true);
  const [activeTocItem, setActiveTocItem] = useState<string | null>(null);

  // Estado para tracking de tempo de estudo
  const startTimeRef = useRef<number>(Date.now());
  const lastSaveTimeRef = useRef<number>(Date.now());
  const [isContentCompleted, setIsContentCompleted] = useState(false);

  // Estado para TTS (Text-to-Speech)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsStyle, setTtsStyle] = useState<'resumo' | 'explicacao' | 'podcast'>('podcast');

  // Estado para transcrição (Speech-to-Text)
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  // Função para salvar tempo de estudo
  const saveStudyTime = useCallback(async (markAsCompleted: boolean = false) => {
    const storedUser = localStorage.getItem('user-data');
    const userId = storedUser ? JSON.parse(storedUser).id : null;

    if (!userId || !contentId || !courseId) return;

    const now = Date.now();
    const timeSpentMinutes = Math.round((now - startTimeRef.current) / 60000);

    // Só salva se passou pelo menos 1 minuto desde o último save
    if (timeSpentMinutes < 1 && !markAsCompleted) return;

    try {
      await userStatsApi.completeContent(userId, courseId, contentId, timeSpentMinutes);
      lastSaveTimeRef.current = now;

      if (markAsCompleted) {
        setIsContentCompleted(true);
      }
    } catch (error) {
      console.error('Erro ao salvar tempo de estudo:', error);
    }
  }, [contentId, courseId]);

  // Salvar tempo quando o usuário sai da página
  useEffect(() => {
    // Reset start time when content changes
    startTimeRef.current = Date.now();
    lastSaveTimeRef.current = Date.now();

    // Save time periodically (every 5 minutes)
    const intervalId = setInterval(() => {
      saveStudyTime(false);
    }, 5 * 60 * 1000);

    // Save time when user leaves the page
    const handleBeforeUnload = () => {
      saveStudyTime(false);
    };

    // Save time when visibility changes (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveStudyTime(false);
      } else {
        // Reset start time when user comes back
        startTimeRef.current = Date.now();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Save time when component unmounts
      saveStudyTime(false);
    };
  }, [contentId, saveStudyTime]);

  // Função para rolar até uma seção
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveTocItem(id);
    }
  };

  // Função para detectar tipo real do conteúdo pela URL
  const detectContentTypeFromUrl = (url: string): 'TEXT' | 'VIDEO' | 'AUDIO' => {
    if (!url) return 'TEXT';
    const urlLower = url.toLowerCase();
    if (urlLower.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i)) return 'VIDEO';
    if (urlLower.match(/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i)) return 'AUDIO';
    return 'TEXT';
  };

  // Carregar dados do conteúdo
  useEffect(() => {
    const controller = new AbortController();
    const loadContent = async () => {
      if (!contentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Carregar conteúdo real da API
        const contentResult = await contentsApi.get(contentId);
        if (controller.signal.aborted) return;
        setContent(contentResult);

        // Carregar perguntas associadas a este conteúdo
        const questionsData = contentResult.questions || await questionsApi.list(contentId);
        if (controller.signal.aborted) return;
        setQuestions(questionsData || []);

        // Definir tipo de conteúdo baseado nos dados reais OU pela URL
        let detectedType: 'TEXT' | 'VIDEO' | 'AUDIO' = 'TEXT';
        if (contentResult.type) {
          detectedType = contentResult.type.toUpperCase() as any;
        }
        // Se o tipo é TEXT mas a URL indica áudio/vídeo, usar o tipo da URL
        if (detectedType === 'TEXT' && contentResult.content_url) {
          const urlType = detectContentTypeFromUrl(contentResult.content_url);
          if (urlType !== 'TEXT') {
            detectedType = urlType;
          }
        }
        setContentType(detectedType);

        // Setar conteúdo editável
        setEditedContent(contentResult.text_content || '');

      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Erro ao carregar conteúdo:', error);
        // Fallback para dados básicos se a API falhar
        setContent({
          id: contentId,
          title: 'Conteúdo',
          type: 'TEXT',
          text_content: null,
          content_url: null
        });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadContent();
    return () => controller.abort();
  }, [contentId]);

  // Extrair cabeçalhos do texto para o TOC quando o conteúdo é carregado
  useEffect(() => {
    if (content?.text_content && viewMode === 'text') {
      const headings = extractHeadings(content.text_content);
      setTocItems(headings);
    } else {
      setTocItems([]);
    }
  }, [content?.text_content, viewMode]);

  // Observar scroll para destacar item ativo no TOC
  useEffect(() => {
    if (tocItems.length === 0) return;

    const handleScroll = () => {
      const headingElements = tocItems.map(item => document.getElementById(item.id)).filter(Boolean);

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el && el.getBoundingClientRect().top <= 150) {
          setActiveTocItem(tocItems[i].id);
          return;
        }
      }
      if (tocItems.length > 0) {
        setActiveTocItem(tocItems[0].id);
      }
    };

    const scrollContainer = document.querySelector('.scrollbar-hide');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [tocItems]);

  // Descrições genéricas para as perguntas socráticas (não mostrar expected_answer)
  const questionDescriptions = [
    'Reflita sobre este conceito e demonstre sua compreensão',
    'Analise criticamente e apresente sua perspectiva',
    'Explore diferentes ângulos desta questão',
    'Conecte este tema com situações práticas',
    'Questione suas próprias suposições sobre o tema'
  ];

  // Perguntas socráticas - carregadas da API ou fallback
  const socraticQuestions = questions.length > 0
    ? questions.map((q: any, i: number) => ({
        id: q.id || `q${i}`,
        question: q.question_text || q.question || q.text,
        description: questionDescriptions[i % questionDescriptions.length],
        difficulty: q.difficulty || 'medium',
        icon: ['analytics', 'warning', 'groups', 'psychology', 'lightbulb'][i % 5]
      }))
    : [
        {
          id: 'q1',
          question: "Explique o conceito principal",
          description: "Demonstre sua compreensão do tema",
          icon: "analytics"
        },
        {
          id: 'q2',
          question: "Quais são as aplicações práticas?",
          description: "Como isso se aplica no mundo real?",
          icon: "lightbulb"
        },
        {
          id: 'q3',
          question: "Quais são os desafios comuns?",
          description: "Identifique possíveis dificuldades",
          icon: "warning"
        }
      ];

  const handleQuestionSelect = (questionId: string, questionText: string) => {
    // Se estiver editando, não abre o chat
    if (isEditing) return;

    // Se há uma pergunta bloqueada e esta não é a pergunta bloqueada, não permitir
    if (lockedQuestionId && lockedQuestionId !== questionId) {
      return; // Não faz nada - pergunta está bloqueada
    }

    setSelectedQuestion(questionText);
    setIsFullScreen(false);
  };

  const closeChat = () => {
    setSelectedQuestion(null);
    setIsFullScreen(false);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Reiniciar conversa socrática - libera todas as perguntas
  const resetConversation = () => {
    setSelectedQuestion(null);
    setLockedQuestionId(null);
    setChatMessages([]);
    setInteractionCount(0);
    setChatError(null);
    setIsFullScreen(false);
    setChatSessionId(null); // Limpar sessão atual - uma nova será criada na próxima pergunta
  };

  // Scroll para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Iniciar chat quando uma pergunta é selecionada (com persistência)
  const initializeChat = async (question: string) => {
    setChatMessages([]);
    setInteractionCount(0);
    setChatError(null);
    setIsAiThinking(false);
    setChatSessionId(null);

    // Obter userId do localStorage
    const storedUser = localStorage.getItem('user-data');
    const userId = storedUser ? JSON.parse(storedUser).id : null;

    if (!userId || !contentId) {
      // Fallback para modo local se não houver usuário ou conteúdo
      const initialMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        content: `Vamos explorar juntos a questão:\n\n"${question}"\n\nAntes de compartilhar minha perspectiva, gostaria de ouvir a sua. O que você pensa sobre isso? Qual é seu entendimento inicial?`,
        timestamp: new Date()
      };
      setChatMessages([initialMessage]);
      return;
    }

    try {
      // Criar ou obter sessão existente
      const session = await chatSessionsApi.createOrGet({
        user_id: userId,
        content_id: contentId,
        chapter_id: chapterId || undefined,
        course_id: courseId || undefined
      });

      setChatSessionId(session.id);

      // Carregar mensagens existentes da sessão
      const existingMessages = await chatSessionsApi.getMessages(session.id);

      if (existingMessages && existingMessages.length > 0) {
        // Restaurar mensagens existentes
        const restoredMessages: ChatMessage[] = existingMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role === 'assistant' ? 'ai' : msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        setChatMessages(restoredMessages);

        // Calcular interações do usuário
        const userMsgs = existingMessages.filter((m: any) => m.role === 'user');
        setInteractionCount(userMsgs.length);

        // Se já tem mensagens, bloquear a pergunta
        if (userMsgs.length > 0) {
          const currentQ = socraticQuestions.find(q => q.question === question);
          if (currentQ) {
            setLockedQuestionId(currentQ.id);
          }
        }
      } else {
        // Nova sessão - gerar mensagem inicial via IA
        setIsAiThinking(true);
        setChatMessages([]);

        try {
          const questionData = questions.find((q: any) =>
            (q.question_text || q.question || q.text) === question
          );

          const response = await aiApi.socraticDialogue({
            student_message: '__INIT__',
            chapter_content: content?.text_content || content?.title || '',
            initial_question: {
              text: question,
              skill: questionData?.skill || 'análise crítica',
              intention: questionData?.expected_answer || 'explorar o conceito em profundidade'
            },
            conversation_history: [],
            interactions_remaining: MAX_INTERACTIONS
          });

          const aiContent = response?.response?.content || response?.follow_up || response?.message
            || `Vamos explorar juntos a questão:\n\n"${question}"\n\nO que você pensa sobre isso? Qual é seu entendimento inicial?`;

          // Salvar mensagem inicial no banco
          await chatSessionsApi.addMessage(session.id, {
            role: 'assistant',
            content: aiContent,
            agent_type: 'socrates',
            metadata: { type: 'initial_question', question }
          });

          const initialMessage: ChatMessage = {
            id: `ai_${Date.now()}`,
            role: 'ai',
            content: aiContent,
            timestamp: new Date()
          };
          setChatMessages([initialMessage]);
        } catch (initError) {
          console.warn('Erro ao gerar mensagem inicial via IA, usando fallback:', initError);
          const fallbackContent = `Vamos explorar juntos a questão:\n\n"${question}"\n\nO que você pensa sobre isso? Qual é seu entendimento inicial?`;

          await chatSessionsApi.addMessage(session.id, {
            role: 'assistant',
            content: fallbackContent,
            agent_type: 'socrates',
            metadata: { type: 'initial_question', question }
          });

          const initialMessage: ChatMessage = {
            id: `ai_${Date.now()}`,
            role: 'ai',
            content: fallbackContent,
            timestamp: new Date()
          };
          setChatMessages([initialMessage]);
        } finally {
          setIsAiThinking(false);
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar sessão de chat:', error);
      // Fallback para modo local
      const initialMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        content: `Vamos explorar juntos a questão:\n\n"${question}"\n\nAntes de compartilhar minha perspectiva, gostaria de ouvir a sua. O que você pensa sobre isso? Qual é seu entendimento inicial?`,
        timestamp: new Date()
      };
      setChatMessages([initialMessage]);
    }
  };

  // Detecta saudações/cumprimentos que não devem contar como interação
  const isGreeting = (text: string): boolean => {
    const normalized = text.toLowerCase().replace(/[!?.,;:\s]+/g, ' ').trim();
    const greetings = [
      'oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'eai', 'e ai', 'eae',
      'fala', 'salve', 'bom dia', 'boa tarde', 'boa noite', 'buenas',
      'yo', 'opa', 'tudo bem', 'tudo bom', 'como vai', 'beleza',
      'fala ai', 'oi oi', 'oie', 'oii', 'oiii', 'helo', 'hola'
    ];
    return greetings.some(g => normalized === g || normalized === `${g} `);
  };

  const handleSend = async () => {
    if (interactionCount >= MAX_INTERACTIONS) return;
    if (!chatInputRef.current || chatInputRef.current.value.trim() === '') return;

    const userMessage = chatInputRef.current.value.trim();
    chatInputRef.current.value = '';

    const isGreetingMsg = isGreeting(userMessage);

    // Bloquear a pergunta atual após primeira resposta (só se não for saudação)
    if (!isGreetingMsg && !lockedQuestionId && selectedQuestion) {
      const currentQ = socraticQuestions.find(q => q.question === selectedQuestion);
      if (currentQ) {
        setLockedQuestionId(currentQ.id);
      }
    }

    // Adicionar mensagem do usuário
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    const newInteractionCount = isGreetingMsg ? interactionCount : interactionCount + 1;
    if (!isGreetingMsg) {
      setInteractionCount(newInteractionCount);
    }
    setIsAiThinking(true);
    setIsCheckingAI(true);
    setChatError(null);

    // Persistir mensagem do usuário no banco
    if (chatSessionId) {
      try {
        await chatSessionsApi.addMessage(chatSessionId, {
          role: 'user',
          content: userMessage,
          metadata: { interaction_number: newInteractionCount, is_greeting: isGreetingMsg }
        });
      } catch (e) {
        console.warn('Erro ao persistir mensagem do usuário:', e);
      }
    }

    try {
      // 1. Verificar se a resposta foi gerada por IA (pula para saudações)
      let isAIGenerated = false;
      let aiProbability = 0;
      let aiVerdict = '';
      if (!isGreetingMsg) {
        try {
          const aiCheck = await aiApi.detectAI({ text: userMessage });
          const detection = aiCheck?.ai_detection;
          aiProbability = detection?.probability || 0;
          aiVerdict = detection?.verdict || '';
          isAIGenerated = aiVerdict === 'likely_ai' || aiProbability > 0.7;
        } catch (e) {
          // AI detection não disponível - continua sem verificação
        }
      }
      setIsCheckingAI(false);

      // Se foi detectado como IA, mostrar aviso
      if (isAIGenerated) {
        const probabilityPercent = Math.round(aiProbability * 100);
        const warningContent = `⚠️ **Opa!** Parece que essa resposta foi gerada por uma IA (${probabilityPercent}% de probabilidade).\n\nO objetivo do método socrático é desenvolver seu próprio raciocínio crítico. Tente responder com suas próprias palavras - não precisa ser perfeito, o importante é o processo de reflexão!\n\nVamos tentar de novo?`;

        const warningMsg: ChatMessage = {
          id: `ai_warning_${Date.now()}`,
          role: 'ai',
          content: warningContent,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, warningMsg]);
        setInteractionCount(prev => prev - 1); // Não conta como interação válida

        // Persistir aviso de IA no banco
        if (chatSessionId) {
          try {
            await chatSessionsApi.addMessage(chatSessionId, {
              role: 'assistant',
              content: warningContent,
              agent_type: 'analyst',
              metadata: { type: 'ai_detection_warning', probability: aiProbability }
            });
          } catch (e) {
            console.warn('Erro ao persistir aviso de IA:', e);
          }
        }

        setIsAiThinking(false);
        return;
      }

      // 2. Buscar dados da pergunta original
      const questionData = questions.find((q: any) =>
        (q.question_text || q.question || q.text) === selectedQuestion
      );

      // Preparar histórico de conversa completo (user + AI)
      const conversationHistory = [...chatMessages, userMsg]
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        }));

      const response = await aiApi.socraticDialogue({
        student_message: userMessage,
        chapter_content: content?.text_content || content?.title || '',
        initial_question: {
          text: selectedQuestion || '',
          skill: questionData?.skill || 'análise crítica',
          intention: questionData?.expected_answer || 'explorar o conceito em profundidade'
        },
        conversation_history: conversationHistory,
        interactions_remaining: MAX_INTERACTIONS - newInteractionCount
      });

      // Adicionar resposta da IA
      const aiContent = response?.response?.content || response?.follow_up || response?.message || 'Interessante perspectiva. Pode elaborar mais sobre isso?';
      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        content: aiContent,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMsg]);

      // Persistir resposta da IA no banco
      if (chatSessionId) {
        try {
          await chatSessionsApi.addMessage(chatSessionId, {
            role: 'assistant',
            content: aiContent,
            agent_type: 'socrates',
            metadata: {
              interaction_number: newInteractionCount,
              is_final: newInteractionCount >= MAX_INTERACTIONS
            }
          });

          // Se for a última interação, marcar sessão como completada
          if (newInteractionCount >= MAX_INTERACTIONS) {
            await chatSessionsApi.complete(chatSessionId);
          }
        } catch (e) {
          console.warn('Erro ao persistir resposta da IA:', e);
        }
      }
    } catch (error: unknown) {
      console.error('Erro no chat:', error);
      setChatError('Erro ao processar resposta. Tente novamente.');
      // Fallback response
      const fallbackResponses = [
        'Interessante! Você poderia expandir um pouco mais esse raciocínio? O que te levou a essa conclusão?',
        'Boa reflexão. Mas e se considerássemos uma perspectiva diferente? Como isso mudaria sua análise?',
        'Você levantou um ponto válido. Consegue pensar em um exemplo prático que ilustre essa ideia?',
        'Entendo seu ponto de vista. Quais seriam as possíveis consequências dessa linha de pensamento?'
      ];
      const fallbackContent = fallbackResponses[Math.min(newInteractionCount - 1, fallbackResponses.length - 1)];
      const fallbackMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        content: fallbackContent,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, fallbackMsg]);

      // Persistir mesmo a resposta fallback
      if (chatSessionId) {
        try {
          await chatSessionsApi.addMessage(chatSessionId, {
            role: 'assistant',
            content: fallbackContent,
            agent_type: 'socrates',
            metadata: { type: 'fallback', error: (error as Error).message }
          });
        } catch (e) {
          console.warn('Erro ao persistir fallback:', e);
        }
      }
    } finally {
      setIsAiThinking(false);
      setIsCheckingAI(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  // Inicializar chat quando pergunta é selecionada
  useEffect(() => {
    if (!selectedQuestion || isEditing) return;
    const controller = new AbortController();
    const doInit = async () => {
      try {
        await initializeChat(selectedQuestion);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Erro ao inicializar chat:', error);
      }
    };
    doInit();
    return () => controller.abort();
  }, [selectedQuestion]);

  // Foca no input quando o chat abre
  useEffect(() => {
    if (selectedQuestion && chatInputRef.current && interactionCount < MAX_INTERACTIONS && !isAiThinking) {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 500);
    }
  }, [selectedQuestion, isFullScreen, interactionCount, isAiThinking]);

  // Chat is now inline, no need for height calculations

  // ========== FORMATAÇÃO DE TEXTO ==========
  const applyTextFormat = (command: string, value?: string) => {
    // Usar execCommand para formatação (funciona em contentEditable)
    document.execCommand(command, false, value);

    // Manter foco no elemento editável
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  };

  const handleBold = () => {
    applyTextFormat('bold');
  };

  const handleItalic = () => {
    applyTextFormat('italic');
  };

  const handleHighlight = () => {
    // Aplicar cor de fundo amarela para grifo
    applyTextFormat('hiliteColor', '#FFEB3B');
  };

  const handleAddLink = () => {
    const url = prompt('Digite a URL do link:');
    if (url) {
      applyTextFormat('createLink', url);
    }
  };

  const handleRewriteWithAI = async () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      toast.warning('Selecione um texto para reescrever com IA');
      return;
    }

    // TODO: Integrar com API de IA para reescrita
    toast.info('Funcionalidade de reescrita com IA em desenvolvimento');
  };

  // ========== GERAR ÁUDIO COM TTS ==========
  const handleGenerateAudio = async () => {
    if (!contentId || !content?.text_content) {
      toast.warning('É necessário ter conteúdo de texto para gerar áudio.');
      return;
    }

    setIsGeneratingAudio(true);
    setTtsError(null);

    try {
      const result = await ttsApi.generateSummary({
        content_id: contentId,
        style: ttsStyle
      });

      if (result.success && result.audio_url) {
        setGeneratedAudioUrl(result.audio_url);
        // Também atualizar o content local para persistir na interface
        setContent((prev: any) => ({ ...prev, audio_url: result.audio_url }));
      } else {
        throw new Error(result.error || 'Erro ao gerar áudio');
      }
    } catch (error: unknown) {
      console.error('Erro ao gerar áudio:', error);
      setTtsError((error as any).response?.data?.detail || (error as Error).message || 'Erro ao gerar áudio. Tente novamente.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // ========== TRANSCREVER ÁUDIO ==========
  const handleTranscribe = async () => {
    if (!contentId || !content?.content_url) {
      toast.warning('É necessário ter um arquivo de áudio/vídeo para transcrever.');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const result = await ttsApi.transcribe({
        content_id: contentId,
        audio_url: content.content_url
      });

      if (result.success && result.text) {
        // Atualizar o conteúdo local com o texto transcrito
        setContent((prev: any) => ({ ...prev, text_content: result.text }));
        setEditedContent(result.text);
        toast.success('Transcrição concluída com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao transcrever');
      }
    } catch (error: unknown) {
      console.error('Erro ao transcrever:', error);
      setTranscriptionError((error as any).response?.data?.detail || (error as Error).message || 'Erro ao transcrever. Tente novamente.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAddImage = () => {
    const url = prompt('Digite a URL da imagem:');
    if (url) {
      applyTextFormat('insertImage', url);
    }
  };

  // ========== SALVAR CONTEÚDO ==========
  const handleSaveContent = async () => {
    if (!contentId || !contentEditableRef.current) return;

    setIsSaving(true);
    try {
      const newTextContent = contentEditableRef.current.innerHTML;

      await contentsApi.update(contentId, {
        text_content: newTextContent
      });

      setContent((prev: any) => ({ ...prev, text_content: newTextContent }));
      setIsEditing(false);
      toast.success('Conteúdo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar conteúdo');
    } finally {
      setIsSaving(false);
    }
  };

  // ========== UPLOAD DE MÍDIA ==========
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contentId) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('video/')) {
      toast.warning('Por favor, selecione um arquivo de vídeo válido');
      return;
    }

    // Validar tamanho (máximo 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. Máximo permitido: 500MB');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadApi.upload(file, 'video');

      // Atualizar conteúdo com a URL do vídeo
      await contentsApi.update(contentId, {
        content_url: result.url,
        type: 'video'
      });

      setContent((prev: any) => ({
        ...prev,
        content_url: result.url,
        type: 'video'
      }));

      toast.success('Vídeo enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar vídeo');
    } finally {
      setIsUploading(false);
      // Limpar input
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contentId) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('audio/')) {
      toast.warning('Por favor, selecione um arquivo de áudio válido');
      return;
    }

    // Validar tamanho (máximo 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. Máximo permitido: 100MB');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadApi.upload(file, 'audio');

      // Atualizar conteúdo com a URL do áudio
      await contentsApi.update(contentId, {
        content_url: result.url,
        type: 'audio'
      });

      setContent((prev: any) => ({
        ...prev,
        content_url: result.url,
        type: 'audio'
      }));

      toast.success('Áudio enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar áudio');
    } finally {
      setIsUploading(false);
      // Limpar input
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950 relative">

      {/* Breadcrumb */}
      {content && (
        <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 px-4 md:px-8 py-2 border-b border-harven-border dark:border-gray-800 overflow-x-auto flex-shrink-0" aria-label="Breadcrumb">
          <button onClick={() => navigate(`/course/${courseId}`)} className="hover:text-primary whitespace-nowrap transition-colors">
            {content.course_title || 'Curso'}
          </button>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <button onClick={() => navigate(`/course/${courseId}/chapter/${chapterId}`)} className="hover:text-primary whitespace-nowrap transition-colors">
            {content.chapter_title || 'Capítulo'}
          </button>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <span className="text-harven-dark dark:text-white font-medium whitespace-nowrap">{content.title || 'Conteúdo'}</span>
        </nav>
      )}

      {/* TOC - Table of Contents */}
      {viewMode === 'text' && (
        <TableOfContents
          tocItems={tocItems}
          showToc={showToc}
          activeTocItem={activeTocItem}
          onToggle={setShowToc}
          onScrollToSection={scrollToSection}
        />
      )}

      {/* Content Area - Now includes inline chat */}
      <div className="w-full overflow-y-auto relative scrollbar-hide flex-1">

        {/* Instructor Editing Toolbar (Sticky) */}
        {isEditing && (
          <EditingToolbar
            isSaving={isSaving}
            onBold={handleBold}
            onItalic={handleItalic}
            onHighlight={handleHighlight}
            onAddLink={handleAddLink}
            onAddImage={handleAddImage}
            onRewriteWithAI={handleRewriteWithAI}
            onCancel={() => setIsEditing(false)}
            onSave={handleSaveContent}
          />
        )}

        <div className="max-w-3xl mx-auto p-12 flex flex-col gap-8">
          <header className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <button
                     onClick={() => navigate(`/course/${courseId}`)}
                     className="p-2 -ml-2 mr-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-harven-dark transition-colors"
                     title="Voltar ao curso"
                   >
                     <span className="material-symbols-outlined">arrow_back</span>
                   </button>
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-harven-gold">
                     {content?.chapter?.title || 'Capítulo'} • {content?.type || 'AULA'}
                   </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Botão de Edição para Instrutor */}
                    {userRole === 'INSTRUCTOR' && (
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${isEditing ? 'bg-primary text-harven-dark border-primary' : 'bg-white text-gray-500 border-harven-border hover:border-gray-400'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{isEditing ? 'check' : 'edit'}</span>
                            {isEditing ? 'Concluir' : 'Editar Conteúdo'}
                        </button>
                    )}

                    {/* Content Format Selector */}
                    <div className="flex items-center gap-2">
                        {/* Toggle Arquivo/Texto - só mostra se houver ambos */}
                        {content?.content_url && content?.text_content && contentType === 'TEXT' && (
                            <div className="bg-harven-bg p-1 rounded-lg flex items-center gap-1">
                                <button
                                    onClick={() => setViewMode('file')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'file' ? 'bg-white text-harven-dark shadow-sm' : 'text-gray-400 hover:text-harven-dark'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> Arquivo
                                </button>
                                <button
                                    onClick={() => setViewMode('text')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'text' ? 'bg-white text-harven-dark shadow-sm' : 'text-gray-400 hover:text-harven-dark'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">notes</span> Modo Leitura
                                </button>
                            </div>
                        )}

                        {/* Tipo de mídia */}
                        <div className="bg-harven-bg p-1 rounded-lg flex items-center gap-1">
                            <button
                                onClick={() => setContentType('TEXT')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${contentType === 'TEXT' ? 'bg-white text-harven-dark shadow-sm' : 'text-gray-400 hover:text-harven-dark'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">article</span> Texto
                            </button>
                            <button
                                onClick={() => setContentType('VIDEO')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${contentType === 'VIDEO' ? 'bg-white text-harven-dark shadow-sm' : 'text-gray-400 hover:text-harven-dark'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">play_circle</span> Vídeo
                            </button>
                            <button
                                onClick={() => setContentType('AUDIO')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${contentType === 'AUDIO' ? 'bg-white text-harven-dark shadow-sm' : 'text-gray-400 hover:text-harven-dark'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">headphones</span> Áudio
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <h1
                className={`text-4xl md:text-5xl font-display font-bold text-harven-dark leading-tight tracking-tight ${isEditing ? 'border-2 border-dashed border-gray-300 p-2 rounded-lg bg-gray-50' : ''}`}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
            >
              {content?.title || 'Conteúdo da Aula'}
            </h1>
            <div className="h-1 w-24 bg-primary rounded-full"></div>
          </header>

          {/* RENDERIZAÇÃO DO CONTEÚDO BASEADO NO TIPO */}

          {contentType === 'TEXT' && (
            <article className={`prose prose-lg max-w-none text-harven-dark/80 leading-relaxed font-sans text-lg space-y-8 animate-in fade-in duration-500 ${isEditing ? 'outline-2 outline-dashed outline-gray-200 p-4 rounded-xl' : ''}`}>
                {/* Modo Arquivo: Se houver URL de arquivo e viewMode é 'file' */}
                {viewMode === 'file' && content?.content_url && (
                    <div className="w-full bg-gray-100 rounded-2xl overflow-hidden border border-harven-border">
                        <div className="bg-harven-dark p-3 flex items-center justify-between">
                            <span className="text-white text-sm font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">picture_as_pdf</span>
                                {content.title || 'Documento'}
                            </span>
                            <a
                                href={content.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-primary text-harven-dark px-3 py-1 rounded font-bold hover:bg-primary-dark transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                Abrir em nova aba
                            </a>
                        </div>
                        {/* Tenta exibir no iframe - funciona para PDFs e muitos outros formatos */}
                        <iframe
                            src={content.content_url}
                            className="w-full h-[700px] bg-white"
                            title="Document Viewer"
                            onError={() => {}}
                        />
                    </div>
                )}

                {/* Modo Texto: Se viewMode é 'text', ou se é 'file' mas não tem URL de arquivo */}
                {(viewMode === 'text' || (viewMode === 'file' && !content?.content_url)) && content?.text_content && (
                    <div className="bg-white rounded-2xl border border-harven-border shadow-sm overflow-hidden">
                        {/* Header do modo texto */}
                        <div className="bg-gradient-to-r from-harven-bg to-white px-6 py-4 border-b border-harven-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-harven-dark/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-harven-dark">article</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-harven-dark text-sm">Conteúdo do Material</h3>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Versão em texto para leitura</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {tocItems.length > 0 && (
                                    <button
                                        onClick={() => setShowToc(!showToc)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            showToc
                                                ? 'bg-primary/10 text-primary-dark border-primary/30'
                                                : 'bg-white text-gray-500 border-harven-border hover:border-gray-400'
                                        }`}
                                        title={showToc ? 'Ocultar índice' : 'Mostrar índice'}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">toc</span>
                                        {tocItems.length} seções
                                    </button>
                                )}
                                {isEditing && (
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase">Modo Edição</span>
                                )}
                            </div>
                        </div>

                        {/* Conteúdo formatado */}
                        <div
                            ref={contentEditableRef}
                            contentEditable={isEditing}
                            suppressContentEditableWarning={true}
                            className={`p-8 outline-none ${isEditing ? 'focus:ring-2 focus:ring-primary/30 bg-yellow-50/30 min-h-[400px]' : ''}`}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(isEditing ? content.text_content : formatExtractedText(content.text_content)) }}
                        />
                    </div>
                )}

                {/* Se só tem arquivo mas viewMode é text e não tem text_content */}
                {viewMode === 'text' && content?.content_url && !content?.text_content && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-harven-border">
                        <span className="material-symbols-outlined text-6xl mb-4 text-gray-300">
                            {content.content_url.match(/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i) ? 'headphones' :
                             content.content_url.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i) ? 'movie' : 'notes'}
                        </span>
                        <p className="text-lg font-bold text-gray-600">
                            {content.content_url.match(/\.(mp3|wav|ogg|m4a|aac|mp4|mov|avi|webm|mkv)(\?|$)/i)
                                ? 'Este conteúdo é um arquivo de mídia'
                                : 'Texto não extraído'}
                        </p>
                        <p className="text-sm mt-2 text-gray-400 mb-6">
                            {content.content_url.match(/\.(mp3|wav|ogg|m4a|aac|mp4|mov|avi|webm|mkv)(\?|$)/i)
                                ? 'Você pode transcrever o áudio para texto usando IA'
                                : 'Use a visualização de arquivo para ver o conteúdo original.'}
                        </p>

                        {/* Botão de transcrição para áudio/vídeo */}
                        {content.content_url.match(/\.(mp3|wav|ogg|m4a|aac|mp4|mov|avi|webm|mkv)(\?|$)/i) && userRole === 'INSTRUCTOR' && (
                            <div className="flex flex-col items-center gap-3">
                                {isTranscribing ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-600">Transcrevendo áudio...</p>
                                        <p className="text-xs text-gray-400">Isso pode levar alguns minutos</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleTranscribe}
                                        className="bg-primary text-harven-dark px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-dark transition-colors"
                                    >
                                        <span className="material-symbols-outlined">subtitles</span>
                                        Transcrever para Texto
                                    </button>
                                )}
                                {transcriptionError && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm max-w-md">
                                        {transcriptionError}
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-2">Usa OpenAI Whisper para transcrever</p>
                            </div>
                        )}

                        {/* Botões para trocar de aba */}
                        <div className="flex justify-center gap-3 mt-6">
                            {content.content_url.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i) && (
                                <button
                                    onClick={() => setContentType('VIDEO')}
                                    className="px-4 py-2 border border-harven-border rounded-lg text-sm font-bold text-gray-600 hover:border-primary hover:text-primary-dark transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                                    Ver Vídeo
                                </button>
                            )}
                            {content.content_url.match(/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i) && (
                                <button
                                    onClick={() => setContentType('AUDIO')}
                                    className="px-4 py-2 border border-harven-border rounded-lg text-sm font-bold text-gray-600 hover:border-primary hover:text-primary-dark transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">headphones</span>
                                    Ouvir Áudio
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Se não houver conteúdo de texto, mostrar área editável vazia */}
                {!content?.text_content && !content?.content_url && isEditing && (
                    <div
                        ref={contentEditableRef}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        className="outline-none whitespace-pre-wrap focus:ring-2 focus:ring-primary/30 rounded-lg p-2 min-h-[200px] bg-gray-50 text-gray-400"
                        data-placeholder="Digite seu conteúdo aqui..."
                    />
                )}

                {/* Se não houver conteúdo, mostrar placeholder (apenas quando não está editando) */}
                {!content?.content_url && !content?.text_content && !isEditing && (
                    <div className="text-center py-12 text-gray-400">
                        <span className="material-symbols-outlined text-6xl mb-4">article</span>
                        <p className="text-lg font-bold">Nenhum conteúdo de texto disponível</p>
                        <p className="text-sm mt-2">Adicione conteúdo usando o editor acima.</p>
                    </div>
                )}
            </article>
          )}

          {contentType === 'VIDEO' && (
             <div className="w-full animate-in fade-in duration-500">
                {/* Input oculto para upload de vídeo */}
                <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                />

                {/* Se houver URL de vídeo real */}
                {content?.content_url && (content.type === 'video' || content.content_url.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                    <div className="w-full bg-black rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-harven-dark p-3 flex items-center justify-between">
                            <span className="text-white text-sm font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">play_circle</span>
                                {content?.title || 'Vídeo'}
                            </span>
                            <div className="flex items-center gap-2">
                                {isEditing && (
                                    <button
                                        onClick={() => videoInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="text-xs bg-white/10 text-white px-3 py-1 rounded font-bold hover:bg-white/20 transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                                        Trocar Vídeo
                                    </button>
                                )}
                                <a
                                    href={content.content_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs bg-primary text-harven-dark px-3 py-1 rounded font-bold hover:bg-primary-dark transition-colors"
                                >
                                    Abrir em nova aba
                                </a>
                            </div>
                        </div>
                        <video
                            src={content.content_url}
                            controls
                            className="w-full aspect-video"
                            poster={content.thumbnail_url}
                        >
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    </div>
                ) : (
                    /* Placeholder quando não há vídeo */
                    <div className="w-full aspect-video bg-black rounded-2xl shadow-2xl relative overflow-hidden group">
                        {isEditing || userRole === 'INSTRUCTOR' ? (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 gap-4">
                                {isUploading ? (
                                    <>
                                        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
                                        <p className="text-white font-bold">Enviando vídeo...</p>
                                        <p className="text-gray-400 text-sm">Isso pode demorar alguns minutos</p>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => videoInputRef.current?.click()}
                                            className="bg-white text-harven-dark px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined">upload</span>
                                            Adicionar Vídeo
                                        </button>
                                        <p className="text-gray-400 text-sm">Formatos suportados: MP4, WebM, OGG (máx. 500MB)</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-6xl mb-4">videocam_off</span>
                                <p className="text-lg font-bold">Nenhum vídeo disponível</p>
                                <p className="text-sm mt-2">O instrutor ainda não adicionou um vídeo.</p>
                            </div>
                        )}
                    </div>
                )}
             </div>
          )}

          {contentType === 'AUDIO' && (
              <div className={`bg-harven-dark rounded-2xl p-8 shadow-xl flex flex-col gap-6 animate-in fade-in duration-500 relative ${isEditing ? 'border-2 border-primary border-dashed' : ''}`}>
                 {/* Input oculto para upload de áudio */}
                 <input
                     ref={audioInputRef}
                     type="file"
                     accept="audio/*"
                     onChange={handleAudioUpload}
                     className="hidden"
                 />

                 {(isEditing || userRole === 'INSTRUCTOR') && (
                     <div className="absolute top-4 right-4 flex gap-2">
                         <button
                             onClick={() => audioInputRef.current?.click()}
                             disabled={isUploading}
                             className="p-2 bg-white/10 rounded hover:bg-white/20 text-white flex items-center gap-2"
                             title="Fazer upload de áudio"
                         >
                             {isUploading ? (
                                 <span className="animate-spin material-symbols-outlined">progress_activity</span>
                             ) : (
                                 <span className="material-symbols-outlined">upload</span>
                             )}
                         </button>
                     </div>
                 )}
                 <div className="flex items-center gap-6">
                    <div className="size-24 bg-gray-800 rounded-xl flex items-center justify-center">
                       <span className="material-symbols-outlined text-4xl text-primary">headphones</span>
                    </div>
                    <div>
                       <h3 className="text-2xl font-bold text-white">{content?.title || 'Áudio'}</h3>
                       <p className="text-gray-400 mt-1">{content?.description || 'Conteúdo de áudio'}</p>
                    </div>
                 </div>

                 {/* Player de áudio real */}
                 {(generatedAudioUrl || content?.audio_url || (content?.content_url && (content.type === 'audio' || content.content_url.match(/\.(mp3|wav|ogg|aac|m4a)$/i)))) ? (
                     <div className="w-full space-y-4">
                         <audio
                             src={generatedAudioUrl || content?.audio_url || content?.content_url}
                             controls
                             className="w-full h-14 rounded-lg"
                             style={{ filter: 'invert(1)' }}
                         >
                             Seu navegador não suporta o elemento de áudio.
                         </audio>
                         {generatedAudioUrl && (
                             <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                                 <p className="text-green-300 text-sm font-medium">Áudio gerado com sucesso!</p>
                                 <p className="text-green-400/70 text-xs mt-1">O áudio foi salvo automaticamente.</p>
                             </div>
                         )}
                         {isEditing && (
                             <div className="flex justify-center">
                                 <button
                                     onClick={() => audioInputRef.current?.click()}
                                     disabled={isUploading}
                                     className="text-xs bg-white/10 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
                                 >
                                     <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                                     Trocar Áudio
                                 </button>
                             </div>
                         )}
                     </div>
                 ) : (
                     /* Placeholder quando não há áudio */
                     <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                         {isUploading ? (
                             <>
                                 <span className="animate-spin material-symbols-outlined text-4xl mb-2 text-primary">progress_activity</span>
                                 <p className="text-sm font-bold text-white">Enviando áudio...</p>
                                 <p className="text-xs mt-1">Aguarde o upload finalizar</p>
                             </>
                         ) : isGeneratingAudio ? (
                             <>
                                 <div className="flex gap-1 mb-4">
                                     <span className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                     <span className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                     <span className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                 </div>
                                 <p className="text-sm font-bold text-white">Gerando áudio com IA...</p>
                                 <p className="text-xs mt-1">Isso pode levar até 2 minutos</p>
                             </>
                         ) : userRole === 'INSTRUCTOR' ? (
                             <>
                                 {/* Opção 1: Upload de arquivo */}
                                 <button
                                     onClick={() => audioInputRef.current?.click()}
                                     className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/20 transition-colors mb-4"
                                 >
                                     <span className="material-symbols-outlined">upload</span>
                                     Fazer Upload de Áudio
                                 </button>
                                 <p className="text-xs mb-6">MP3, WAV, OGG, AAC (máx. 100MB)</p>

                                 {/* Divider */}
                                 <div className="flex items-center gap-4 w-full max-w-sm mb-6">
                                     <div className="flex-1 h-px bg-gray-600"></div>
                                     <span className="text-xs text-gray-500 uppercase">ou</span>
                                     <div className="flex-1 h-px bg-gray-600"></div>
                                 </div>

                                 {/* Opção 2: Gerar com IA */}
                                 {content?.text_content ? (
                                     <div className="text-center">
                                         <p className="text-xs text-gray-400 mb-3">Gerar áudio automaticamente a partir do texto</p>
                                         <div className="flex items-center gap-2 justify-center">
                                             <select
                                                 value={ttsStyle}
                                                 onChange={(e) => setTtsStyle(e.target.value as any)}
                                                 className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg border border-gray-600 focus:border-primary outline-none"
                                             >
                                                 <option value="podcast">Estilo Podcast</option>
                                                 <option value="resumo">Resumo</option>
                                                 <option value="explicacao">Explicação</option>
                                             </select>
                                             <button
                                                 onClick={handleGenerateAudio}
                                                 className="bg-primary-dark text-harven-dark px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"
                                             >
                                                 <span className="material-symbols-outlined">auto_awesome</span>
                                                 Gerar com IA
                                             </button>
                                         </div>
                                         <p className="text-[10px] text-gray-500 mt-2">Usa ElevenLabs para criar narração do conteúdo</p>
                                     </div>
                                 ) : (
                                     <p className="text-xs text-gray-500">Adicione conteúdo de texto para poder gerar áudio com IA</p>
                                 )}

                                 {/* Erro */}
                                 {ttsError && (
                                     <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mt-4 max-w-sm">
                                         <p className="text-red-300 text-xs">{ttsError}</p>
                                         <button
                                             onClick={() => setTtsError(null)}
                                             className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
                                         >
                                             Fechar
                                         </button>
                                     </div>
                                 )}
                             </>
                         ) : (
                             <>
                                 <span className="material-symbols-outlined text-4xl mb-2">music_off</span>
                                 <p className="text-sm font-bold">Nenhum áudio disponível</p>
                                 <p className="text-xs mt-1">O instrutor ainda não adicionou um áudio.</p>
                             </>
                         )}
                     </div>
                 )}
              </div>
          )}

          {/* Botão de Marcar como Concluído */}
          <div className="flex justify-center py-8">
            <button
              onClick={() => saveStudyTime(true)}
              disabled={isContentCompleted}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                isContentCompleted
                  ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-default'
                  : 'bg-primary text-harven-dark hover:bg-primary-dark hover:scale-105 shadow-lg shadow-primary/30'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {isContentCompleted ? 'check_circle' : 'task_alt'}
              </span>
              {isContentCompleted ? 'Conteúdo Concluído!' : 'Marcar como Concluído'}
            </button>
          </div>

          {/* Socratic Questions & Chat */}
          <SocraticQuestionsGrid
            questions={socraticQuestions}
            selectedQuestion={selectedQuestion}
            lockedQuestionId={lockedQuestionId}
            isEditing={isEditing}
            onQuestionSelect={handleQuestionSelect}
            onResetConversation={resetConversation}
          />

          {selectedQuestion && !isEditing && (
            <SocraticChat
              selectedQuestion={selectedQuestion}
              chatMessages={chatMessages}
              isAiThinking={isAiThinking}
              isCheckingAI={isCheckingAI}
              chatError={chatError}
              interactionCount={interactionCount}
              maxInteractions={MAX_INTERACTIONS}
              messagesEndRef={messagesEndRef}
              chatInputRef={chatInputRef}
              onSend={handleSend}
              onClose={closeChat}
              onKeyDown={handleKeyDown}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterReader;
