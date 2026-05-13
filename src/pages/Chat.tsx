import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
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
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
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
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Recording error", e);
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
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const validHistory = historyBeforeResponse.filter(m => m.parts && m.parts[0].text);

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-lite", 
        contents: validHistory.map(m => ({
          role: m.role,
          parts: m.parts
        }))
      });

      let accumulatedText = "";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      for await (const chunk of responseStream) {
        if (chunk.text) {
          accumulatedText += chunk.text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'model',
              parts: [{ text: accumulatedText }]
            };
            return updated;
          });
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
              className="absolute left-0 top-0 bottom-0 w-[80%] max-w-sm z-50 bg-background border-r border-border flex flex-col"
            >
              <div className="flex items-center justify-between p-4 mb-2">
                <h2 className="font-semibold text-lg">KortexAI</h2>
                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface text-text transition-colors">
                    <Search size={20} />
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface text-text transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3">
                <div className="space-y-1 mb-6">
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface text-sm font-medium transition-colors">
                     <FolderClosed size={18} /> Projects
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface text-sm font-medium transition-colors">
                     <ImageIcon size={18} /> Images
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface text-sm font-medium transition-colors">
                     <MoreHorizontal size={18} /> More
                  </button>
                </div>
                
                <h3 className="px-3 text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Recents</h3>
                <div className="space-y-0.5">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <button 
                        key={session.id} 
                        onClick={() => loadSession(session)} 
                        className={`w-full text-left truncate px-3 py-3 rounded-xl hover:bg-surface text-sm transition-colors text-text/90 ${currentSessionId === session.id ? 'bg-surface' : ''}`}
                      >
                        {session.title}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted">No recent chats</div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border">
                <button 
                  onClick={startNewChat}
                  className="w-full flex items-center justify-between px-4 py-3 bg-text text-background rounded-full hover:opacity-90 font-medium transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <PenSquare size={18} />
                    <span>New chat</span>
                  </div>
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
          <div className="h-full flex flex-col items-center justify-center text-center p-6 mt-[-10vh]">
             <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Sparkles size={28} className="text-primary" />
             </div>
             <h2 className="text-xl font-medium mb-10 text-text/80">How can I help you today?</h2>
             
             {/* Quick Actions Placeholder similar to ChatGPT */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mx-auto pointer-events-none opacity-50 hidden sm:grid">
                <div className="p-4 border border-border rounded-2xl flex flex-col items-start text-left bg-surface/30">
                   <ImageIcon size={18} className="mb-2 text-text/60" />
                   <p className="text-sm font-medium">Create an image</p>
                </div>
                <div className="p-4 border border-border rounded-2xl flex flex-col items-start text-left bg-surface/30">
                   <PenSquare size={18} className="mb-2 text-text/60" />
                   <p className="text-sm font-medium">Write or edit</p>
                </div>
             </div>
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
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-background via-background to-transparent pt-10 pointer-events-none">
        
        {messages.length === 0 && (
          <div className="w-full px-4 sm:px-6 mb-4 pointer-events-auto">
            <div className="flex flex-col items-start space-y-2.5 max-w-[220px]">
              <button className="w-full flex items-center gap-3 text-sm font-medium text-text hover:bg-surface px-4 py-2.5 bg-surface/80 backdrop-blur shadow-sm border border-border/50 rounded-full transition-colors">
                <ImageIcon size={18} className="text-text/80" /> Create an image
              </button>
              <button className="w-full flex items-center gap-3 text-sm font-medium text-text hover:bg-surface px-4 py-2.5 bg-surface/80 backdrop-blur shadow-sm border border-border/50 rounded-full transition-colors">
                <PenSquare size={18} className="text-text/80" /> Write or edit
              </button>
              <button className="w-full flex items-center gap-3 text-sm font-medium text-text hover:bg-surface px-4 py-2.5 bg-surface/80 backdrop-blur shadow-sm border border-border/50 rounded-full transition-colors">
                <Search size={18} className="text-text/80" /> Look something up
              </button>
            </div>
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
