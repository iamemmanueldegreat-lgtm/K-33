import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Brain, ArrowUp, Mic, Plus, Calendar, BookOpen } from 'lucide-react';
import Markdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { streamChat } from '../lib/gemini';

interface AskAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  courseTitle: string;
  studyContext: string;
  // Allows the parent component to persist the chat state so going back doesn't loose progress
  messages: { role: 'user' | 'model'; content: string }[];
  setMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'model'; content: string }[]>>;
}

export default function AskAiDrawer({
  isOpen,
  onClose,
  topicTitle,
  courseTitle,
  studyContext,
  messages,
  setMessages
}: AskAiDrawerProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
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

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported or was blocked in this browser. Please use Chrome, Safari, or Edge and grant microphone permissions.");
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
      }
    }
  };

  // Initialize with greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: `Hi **${user?.full_name || 'there'}**! I am **Kortex AI**, your personal tutor.

I have analyzed the study guide for **"${topicTitle}"** in the course **"${courseTitle}"** tailored for your **${user?.department || 'general'}** department at the **${user?.level || 'Undergraduate'}** level.

What part of this lesson would you like me to explain further? Just ask! 📚`
        }
      ]);
    }
  }, [messages, topicTitle, courseTitle, user, setMessages]);

  const scrollToBottom = (force = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (force) {
      container.scrollTop = container.scrollHeight;
    } else {
      // Check if user is scrolled near the bottom (within 150px) to automatically scroll down
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // Scroll to bottom smoothly when messages list length expands
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  // Maintain scroll alignment if near the bottom during continuous active model typing/streaming
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user' as const, content: input.trim() };
    const historyBeforeResponse = [...messages, userMessage];
    
    setMessages(historyBeforeResponse);
    setInput('');
    setIsTyping(true);

    const systemInstruction = [
      `You are Kortex AI, an expert university tutor helping a student study "${topicTitle}" from the course "${courseTitle}".`,
      user?.department ? `The student is studying ${user.department}` : '',
      user?.level ? `at ${user.level} level` : '',
      user?.school ? `at ${user.school}.` : '.',
      studyContext ? `\n\nRelevant study context:\n${studyContext.slice(0, 1200)}` : '',
      '\n\nBe helpful, educational, and concise. Use markdown formatting when it aids clarity.',
    ].filter(Boolean).join(' ');

    try {
      const validHistory = historyBeforeResponse.filter(m => m.content);

      let accumulatedText = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const text of streamChat(validHistory, systemInstruction)) {
        accumulatedText += text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', content: accumulatedText };
          return updated;
        });
      }
    } catch (err) {
      console.error('Ask AI Drawer Chat Error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: "I'm sorry, I encountered an issue. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur & Overlay */}
          <motion.div
            id="ask-ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-[2px] z-[100] cursor-pointer"
          />

          {/* Bottom Sheet Drawer 75% height */}
          <motion.div
            id="ask-ai-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            // Enable dragging down to dismiss
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 150) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-4xl h-[75vh] bg-background text-text rounded-t-[2.5rem] border-t border-border shadow-2xl z-[101] flex flex-col overflow-hidden select-none"
          >
            {/* Grab Handle pill for dragging */}
            <div className="w-12 h-1.5 bg-muted/30 rounded-full mx-auto mt-4 mb-2 cursor-grab active:cursor-grabbing flex-shrink-0" />

            {/* Header */}
            <div className="px-6 pb-4 pt-1 border-b border-border flex items-center justify-between flex-shrink-0 select-text bg-background">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Brain size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-1.5 leading-none text-text">
                    Ask Kortex AI
                    <span className="text-[10px] font-medium tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md uppercase">Tutor</span>
                  </h3>
                  <p className="text-xs text-muted mt-1 font-mono truncate max-w-[250px] sm:max-w-md">
                    Lesson Context: {topicTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface dark:hover:bg-surface/80 text-muted hover:text-text transition-all duration-250 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable messages space */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar select-text bg-background"
            >
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                if (isUser) {
                  return (
                    <div
                      key={idx}
                      className="flex w-full justify-end items-start animate-in fade-in duration-300"
                    >
                      <div className="flex flex-col items-end max-w-[85%] animate-in slide-in-from-bottom-2 duration-200">
                        <div className="text-[15px] leading-relaxed bg-surface px-5 py-3 rounded-3xl text-text font-normal border border-border/40 shadow-sm">
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={idx}
                      className="flex w-full justify-start items-start gap-4 animate-in fade-in duration-300"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-border bg-surface mt-0.5 animate-in zoom-in duration-300">
                        <Sparkles size={14} className="text-text/70" />
                      </div>
                      <div className="flex-1 flex flex-col items-start pt-1 max-w-[85%]">
                        <div className="text-[15px] leading-relaxed text-text font-normal w-full">
                          <div className="markdown-body break-words prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-pre:my-4">
                            <Markdown>{m.content}</Markdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}

              {isTyping && messages[messages.length - 1]?.role !== 'model' && (
                <div className="flex w-full justify-start items-center gap-4 animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-border bg-surface">
                    <Sparkles size={14} className="text-text/70 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-text/30 animate-pulse"></span>
                     <span className="w-2 h-2 rounded-full bg-text/30 animate-pulse delay-75"></span>
                     <span className="w-2 h-2 rounded-full bg-text/30 animate-pulse delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Interactive Footer & Input Form */}
            <div className="p-3 sm:p-4 bg-gradient-to-t from-background via-background to-transparent pt-4 flex-shrink-0 select-text border-t border-border bg-background">
              
              {/* Contextual Suggestions for Study Drawer */}
              {messages.length <= 1 && (
                <div className="w-full mb-3 overflow-x-auto pb-2 scrollbar-none whitespace-nowrap flex gap-2 justify-start sm:justify-center">
                  {[
                    {
                      icon: Sparkles,
                      title: "Explain a Concept",
                      promptText: `Can you break down the concept of "${topicTitle}" simply with some real-world examples so I can grasp it instantly?`
                    },
                    {
                      icon: Calendar,
                      title: "Detailed Study Schedule",
                      promptText: `Create a quick, strategic day-by-day study schedule to help me master "${topicTitle}" over the next few days.`
                    },
                    {
                      icon: BookOpen,
                      title: "Mock Practice Quiz",
                      promptText: `Give me 3 quick multiple-choice practice quiz questions with detailed feedback to test my learning on "${topicTitle}".`
                    }
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setInput(item.promptText)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-850 shadow-sm rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Icon size={14} className="text-neutral-500" />
                        <span>{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <form 
                onSubmit={handleSend}
                className="relative flex items-center bg-surface border border-border rounded-[32px] p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-border/50 transition-all mb-2"
              >
                <button
                  type="button"
                  className="w-10 h-10 flex items-center justify-center text-text rounded-full hover:bg-background transition-colors flex-shrink-0 ml-0.5 animate-in fade-in zoom-in duration-200"
                >
                  <Plus size={24} className="text-text/70" />
                </button>
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask KortexAI"
                  className="flex-1 bg-transparent border-none pl-2 pr-4 py-3 text-[15px] focus:outline-none focus:ring-0 w-full placeholder:text-muted whitespace-nowrap overflow-hidden text-ellipsis text-text"
                />
                
                <div className="flex items-center gap-1 mr-1">
                  {(!input.trim() || isRecording) && (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 relative z-10 ${
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
                    className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all relative z-10 ${
                      input.trim() && !isTyping 
                        ? 'bg-text text-background shadow-sm hover:scale-105 active:scale-95 cursor-pointer' 
                        : 'bg-text text-background opacity-90'
                    }`}
                  >
                    {input.trim() && !isTyping ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L12 20M12 4L18 10M12 4L6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <div className="flex gap-1 items-center justify-center">
                         <span className="w-1 h-3 bg-background rounded-full animate-pulse"></span>
                         <span className="w-1 h-4 bg-background rounded-full animate-pulse delay-75"></span>
                         <span className="w-1 h-3 bg-background rounded-full animate-pulse delay-150"></span>
                      </div>
                    )}
                  </button>
                </div>
              </form>
              <div className="flex items-center justify-between px-1 text-[10px] text-muted">
                <span className="flex items-center gap-1 font-sans">
                  Swipe down or tap backdrop to return to explanation.
                </span>
                <span className="font-mono">
                  Level: {user?.level || 'Undergraduate'}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
