import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  ArrowLeft,
  Bot,
  User,
  Sparkles,
  Loader2,
  Trash2,
  Menu,
  Plus,
  Mic,
  PenSquare,
  MoreVertical,
  MoreHorizontal,
  Search,
  Image as ImageIcon,
  FolderClosed,
  X,
  Calendar,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: any;
  updatedAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const STUDENT_PROMPTS = [
  {
    icon: Sparkles,
    title: "Explain a Concept",
    description: "Deep dive into a difficult topic with active physical, real-world examples",
    promptText: "Can you break down and explain a complex academic concept simply with real-world examples so I can grasp it instantly?",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/10"
  },
  {
    icon: Calendar,
    title: "Detailed Study Schedule",
    description: "Help me organize a detailed 1-week prep schedule for upcoming exams",
    promptText: "I have exams next week. Help me build a strategic, realistic day-by-day 1-week study plan to prepare efficiently.",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/10"
  },
  {
    icon: BookOpen,
    title: "Mock Practice Quiz",
    description: "Test my learning with interactive multi-choice quiz questions",
    promptText: "Give me an interactive 5-question multiple choice practice quiz on core academic topics with complete detailed feedback for answers.",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/10"
  },
  {
    icon: PenSquare,
    title: "Active Recall & Flashcards",
    description: "Convert dry study materials into summarized key recall cards",
    promptText: "Provide me with active recall study prompts, questions, and summarized bullet-point learning tables for study reviews.",
    color: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/10"
  }
];

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // continuous set to false runs best for inputting chat prompts
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setInput(prev => {
              const cleaned = prev.trim();
              return cleaned ? `${cleaned} ${finalTranscript.trim()}` : finalTranscript.trim();
            });
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.error("Speech recognition initialization failed:", e);
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'chat_sessions'),
          where('userId', '==', user.id)
        );
        const snapshot = await getDocs(q);
        const loadedSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChatSession[];
        
        // Sort manually by updatedAt since we don't want to create an index right away
        // (If timestamps are serverTimestamp, they might be null locally initially)
        loadedSessions.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : Date.parse(a.updatedAt || '0');
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : Date.parse(b.updatedAt || '0');
          return timeB - timeA;
        });

        setSessions(loadedSessions);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'chat_sessions');
      }
    };
    loadSessions();
  }, [user]);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      // Optimistic update
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewChat();
      }
      
      const sessionRef = doc(db, 'chat_sessions', sessionId);
      await deleteDoc(sessionRef);
    } catch (error) {
      console.error("Failed to delete session:", error);
      // Reload on failure to ensure UI consistency
      const q = query(
        collection(db, 'chat_sessions'),
        where('userId', '==', user.id)
      );
      const snapshot = await getDocs(q);
      const loadedSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      loadedSessions.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : Date.parse(a.updatedAt || '0');
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : Date.parse(b.updatedAt || '0');
        return timeB - timeA;
      });
      setSessions(loadedSessions);
    }
  };

  const saveMessageToSession = async (currentMessages: Message[], newMessage: Message, overrideSessionId?: string | null) => {
    if (!user) return null;
    
    const combinedMessages = [...currentMessages, newMessage];
    const targetSessionId = overrideSessionId !== undefined ? overrideSessionId : currentSessionId;
    
    // Ensure we only store required properties to avoid large payloads / strict rules rejection
    const serializedMessages = combinedMessages.map(m => ({
      role: m.role,
      parts: m.parts.map(p => ({ text: p.text }))
    }));

    try {
      if (!targetSessionId) {
        // Create new session
        const title = serializedMessages[0]?.parts[0]?.text?.substring(0, 40) || 'New Chat';
        const docRef = doc(collection(db, 'chat_sessions'));
        const sessionData = {
          userId: user.id,
          title: title + (title.length >= 40 ? '...' : ''),
          messages: serializedMessages,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(docRef, sessionData);
        setCurrentSessionId(docRef.id);
        
        setSessions(prev => [{ id: docRef.id, ...sessionData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as ChatSession, ...prev]);
        return docRef.id;
      } else {
        // Update existing session
        const sessionRef = doc(db, 'chat_sessions', targetSessionId);
        
        const title = serializedMessages[0]?.parts[0]?.text?.substring(0, 40) || 'New Chat';
        const updateData = {
          title: title + (title.length >= 40 ? '...' : ''),
          messages: serializedMessages,
          updatedAt: serverTimestamp()
        };
        await updateDoc(sessionRef, updateData);
        
        setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: serializedMessages, updatedAt: new Date().toISOString() } as ChatSession : s));
        return targetSessionId;
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      // Not throwing so UI doesn't crash on failed save
      return targetSessionId;
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported or was blocked in this browser. Please make sure you are using Chrome, Safari or Edge and have granted microphone permissions.");
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop SpeechRecognition:", e);
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start SpeechRecognition:", e);
        setIsRecording(false);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input.trim() }] };
    const historyBeforeResponse = [...messages, userMessage];
    
    setMessages(historyBeforeResponse);
    setInput('');
    setIsTyping(true);

    // Save user message initially
    const activeSessionId = await saveMessageToSession(messages, userMessage, currentSessionId);

    try {
      const validHistory = historyBeforeResponse.filter(m => m.parts && m.parts[0].text);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: 'flash',
          messages: validHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.parts[0].text
          }))
        })
      });

      if (!res.ok) throw new Error("Failed to communicate with chat API");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedText = "";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                accumulatedText += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'model',
                    parts: [{ text: accumulatedText }]
                  };
                  return updated;
                });
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e);
            }
          }
        }
      }
      
      // Save model message after it's done stream
      const modelMessage: Message = { role: 'model', parts: [{ text: accumulatedText }] };
      await saveMessageToSession(historyBeforeResponse, modelMessage, activeSessionId);

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage: Message = { role: 'model', parts: [{ text: "Sorry, I ran into an issue while processing your request. Please try again later." }] };
      setMessages(prev => [...prev, errorMessage]);
      await saveMessageToSession(historyBeforeResponse, errorMessage, activeSessionId);
    } finally {
      setIsTyping(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };
  
  const loadSession = (session: ChatSession) => {
    setMessages(session.messages || []);
    setCurrentSessionId(session.id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0 bg-background relative overflow-hidden font-sans">
      
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm z-50 bg-[#F9FAFB] dark:bg-[#111318] border-r border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-5 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h2 className="font-semibold text-lg tracking-tight">KortexAI</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-text transition-colors">
                    <Search size={18} />
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-text transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-1.5 mb-8">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:shadow-sm text-sm font-medium transition-all text-text/90">
                     <FolderClosed size={18} className="text-zinc-500" /> Projects
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:shadow-sm text-sm font-medium transition-all text-text/90">
                     <ImageIcon size={18} className="text-zinc-500" /> Images
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-black/5 dark:hover:border-white/5 hover:shadow-sm text-sm font-medium transition-all text-text/90">
                     <MoreHorizontal size={18} className="text-zinc-500" /> More
                  </button>
                </div>
                
                <h3 className="px-4 text-[11px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Recent Chats</h3>
                <div className="space-y-1.5">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <div 
                        key={session.id}
                        className={`group relative flex items-center justify-between rounded-2xl hover:bg-white dark:hover:bg-white/5 hover:shadow-sm border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all ${
                          currentSessionId === session.id ? 'bg-white dark:bg-white/5 shadow-sm border-black/5 dark:border-white/5' : ''
                        }`}
                      >
                        <button 
                          onClick={() => loadSession(session)} 
                          className="flex-1 flex items-center gap-3 text-left truncate pl-4 pr-12 py-3 text-sm text-text/90 cursor-pointer"
                        >
                          <MessageSquare size={16} className="text-zinc-400 flex-shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="absolute right-3 p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer z-10"
                          title="Delete Chat"
                          aria-label="Delete Chat"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-zinc-500 bg-white/50 dark:bg-white/5 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">No recent chats</div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <button 
                  onClick={startNewChat}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] shadow-md font-bold transition-all"
                >
                  <PenSquare size={18} />
                  <span>Start New Chat</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-4 pt-6 sticky top-0 z-10 pointer-events-none">
        {/* Background gradient fade mapping to the top if needed, we'll keep transparent */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-transparent z-[-1]" />
        
        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface shadow-sm border border-border/50 text-text hover:bg-surface/80 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface shadow-sm border border-border/50 text-text hover:bg-surface/80 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-1 pointer-events-auto">
          <div className="flex items-center bg-surface rounded-full shadow-sm border border-border/50 p-0.5">
            <button 
              onClick={startNewChat}
              className="w-10 h-10 flex items-center justify-center rounded-full text-text hover:bg-background transition-colors"
            >
              <PenSquare size={18} />
            </button>
            <div className="w-[1px] h-5 bg-border/60 mx-0.5"></div>
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full text-text hover:bg-background transition-colors"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 w-full space-y-6 pt-4 pb-32">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
             <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-sans">How can I help you today?</h2>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';

            return (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx} 
                className={`flex w-full group ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-4 border border-border bg-surface mt-0.5">
                    <Sparkles size={14} className="text-text/70" />
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start pt-1'}`}>
                  <div className={`text-[15px] leading-relaxed ${
                    isUser 
                      ? 'bg-surface px-5 py-3 rounded-3xl text-text font-normal border border-border/40 shadow-sm' 
                      : 'text-text font-normal'
                  }`}>
                    <div className={`markdown-body break-words prose-sm max-w-none ${isUser ? '[&>p]:mb-0 border-none' : 'prose-p:leading-relaxed prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-pre:my-4'}`}>
                      <Markdown>{msg.parts[0].text}</Markdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {isTyping && messages[messages.length - 1]?.role !== 'model' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full justify-start items-center"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-4 border border-border bg-surface">
              <Sparkles size={14} className="text-text/70" />
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-text/30 animate-pulse"></span>
               <span className="w-2 h-2 rounded-full bg-text/30 animate-pulse delay-75"></span>
               <span className="w-2 h-2 rounded-full bg-text/30 animate-pulse delay-150"></span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-6" />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-background via-background to-transparent pt-12 pointer-events-none">
        
        {messages.length === 0 && (
          <div className="w-full px-4 sm:px-6 mb-3 pointer-events-auto overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 scrollbar-none whitespace-nowrap flex sm:flex-wrap gap-2 justify-start sm:justify-center">
            {STUDENT_PROMPTS.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setInput(item.promptText)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-sm text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-zinc-850 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Icon size={14} className="text-neutral-500" />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="pointer-events-auto w-full px-4 sm:px-6">
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-center bg-surface border border-border rounded-[32px] p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-border/50 transition-all mb-2 sm:mb-4"
          >
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center text-text rounded-full hover:bg-background transition-colors flex-shrink-0 ml-0.5"
            >
              <Plus size={24} className="text-text/70" />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask KortexAI"
              className="flex-1 bg-transparent border-none pl-2 pr-4 py-3 text-[15px] focus:outline-none focus:ring-0 w-full placeholder:text-muted whitespace-nowrap overflow-hidden text-ellipsis"
            />
            
            <div className="flex items-center gap-1 mr-1">
              {(!input.trim() || isRecording) && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
                    isRecording 
                      ? 'bg-red-500/10 text-red-500 animate-pulse' 
                      : 'text-text/70 hover:bg-background'
                  }`}
                >
                  <Mic size={20} />
                </button>
              )}
              
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
                  input.trim() && !isTyping 
                    ? 'bg-text text-background shadow-sm hover:scale-105 active:scale-95' 
                    : 'bg-text text-background opacity-90'
                }`}
              >
                {input.trim() && !isTyping ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L12 20M12 4L18 10M12 4L6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <div className="flex gap-1 items-center justify-center">
                     <span className="w-1 h-3 bg-background rounded-full"></span>
                     <span className="w-1 h-4 bg-background rounded-full"></span>
                     <span className="w-1 h-3 bg-background rounded-full"></span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
