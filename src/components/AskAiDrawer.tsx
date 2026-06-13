import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Brain, ArrowUp, Plus, Mic, Activity } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Initialize with greeting if empty, or correct the placeholder once actual details are fetched
  useEffect(() => {
    const defaultGreeting = (topicName: string, courseName: string) => {
      const displayTopic = topicName ? `"${topicName}"` : 'your study guide';
      const displayCourse = courseName ? `"${courseName}"` : 'your current course';
      return `Hi **${user?.full_name || 'there'}**! I am **Kortex AI**, your personal tutor.

I have analyzed the study guide for **${displayTopic}** in the course **${displayCourse}** tailored for your **${user?.department || 'Computer Science'}** department at the **${user?.level || 'ND 1'}** level.

What part of this lesson would you like me to explain further? Just ask! 📚`;
    };

    if (messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: defaultGreeting(topicTitle, courseTitle)
        }
      ]);
    } else if (messages.length === 1 && messages[0].role === 'model') {
      const firstContent = messages[0].content;
      // If the message contains empty quotes like for "" or has unpopulated fallbacks, and we now have real assets, refresh it
      if ((firstContent.includes('""') || firstContent.includes('"your study guide"') || firstContent.includes('your study guide')) && (topicTitle || courseTitle)) {
        setMessages([
          {
            role: 'model',
            content: defaultGreeting(topicTitle, courseTitle)
          }
        ]);
      }
    }
  }, [messages, topicTitle, courseTitle, user, setMessages]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (isTyping) {
      // Use instant 'auto' scrolling while generating to maintain locking without animation queue lag
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      // Use premium 'smooth' scrolling upon initial load or when answer completion is reached
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentY = e.targetTouches[0].clientY;
    const diffY = currentY - touchStart;

    // Swipe down gesture detection (more than 70 pixels)
    const container = e.currentTarget;
    if (container.scrollTop <= 0 && diffY > 70) {
      onClose();
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user' as const, content: input.trim() };
    const historyBeforeResponse = [...messages, userMessage];
    
    setMessages(historyBeforeResponse);
    setInput('');
    setIsTyping(true);

    try {
      const validHistory = historyBeforeResponse.filter(m => m.content);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: 'flash',
          messages: validHistory,
          topicTitle,
          courseTitle,
          studyContext,
          student: {
            department: user?.department || '',
            level: user?.level || '',
            school: user?.school || '',
            fullName: user?.full_name || ''
          }
        })
      });

      if (!res.ok) throw new Error("Failed to communicate with tutor API");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedText = "";
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

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
                    content: accumulatedText
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
    } catch (err) {
      console.error("Ask AI Drawer Chat Error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: "I'm sorry, I encountered an issue speaking with my cloud brain right now. Please check your internet or try again."
        }
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

          {/* Bottom Sheet Drawer 90% height */}
          <motion.div
            id="ask-ai-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 240 }}
            // Enable dragging down to dismiss from anywhere on the screen
            drag="y"
            dragConstraints={{ top: 0, bottom: 800 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 250) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-4xl h-[90vh] bg-background text-text rounded-t-[2.5rem] border-t border-border shadow-2xl z-[101] flex flex-col overflow-hidden select-none"
          >
            {/* Grab Handle pill for dragging */}
            <div className="w-12 h-1.5 bg-muted/30 rounded-full mx-auto mt-4 mb-2 cursor-grab active:cursor-grabbing flex-shrink-0" />

            {/* Header */}
            <div 
              className="px-6 pb-4 pt-1 border-b border-border flex items-center justify-between flex-shrink-0 select-text bg-background"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e4854]/30 border border-teal-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                  <Activity size={24} className="text-teal-500" />
                </div>
                <div>
                  <h3 className="font-outfit font-black text-lg sm:text-xl leading-none text-[#163038] dark:text-teal-400 tracking-tight">
                    Ask Kortex AI
                  </h3>
                  <p className="text-xs text-muted mt-1.5 font-mono truncate max-w-[250px] sm:max-w-md">
                    Lesson Context: {topicTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-sans font-extrabold text-sm rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-neutral-400 dark:hover:border-zinc-500 transition-all duration-200 focus:outline-none cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                aria-label="Cancel"
              >
                <X size={18} className="stroke-[2.5]" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Scrollable messages space */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar select-text bg-background"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
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
                      <div className="flex-1 flex flex-col items-start pt-1 max-w-[85%] min-w-0 w-full">
                        <div className="text-[15px] leading-relaxed text-text font-normal w-full min-w-0">
                          <div className="markdown-body break-words prose prose-sm dark:prose-invert max-w-none w-full min-w-0 overflow-x-hidden prose-p:leading-relaxed prose-pre:overflow-x-auto prose-pre:max-w-full prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-pre:my-4">
                            <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
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
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-border bg-background flex flex-col gap-2 flex-shrink-0 select-text"
            >
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-full px-4 py-2 border border-neutral-200/40 dark:border-zinc-700/40 w-full max-w-4xl mx-auto shadow-sm">
                {/* Plus Button */}
                <button 
                  type="button" 
                  className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-muted hover:text-text transition-colors flex-shrink-0"
                  title="Create or select"
                >
                  <Plus size={20} className="stroke-[2.5]" />
                </button>

                {/* Input Field */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Kortex AI"
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-text focus:outline-none placeholder:text-muted"
                />

                {/* Mic Button */}
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-muted hover:text-text transition-colors flex-shrink-0"
                  title="Voice input"
                >
                  <Mic size={18} />
                </button>

                {/* Send/Icon Action Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-[#163038] text-white dark:bg-white dark:text-black font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 duration-250 flex-shrink-0 ml-1 cursor-pointer shadow-sm"
                  title="Send Message"
                >
                  <ArrowUp size={18} className="stroke-[2.5]" />
                </button>
              </div>
              <div className="flex items-center justify-between px-4 text-[10px] text-muted">
                <span className="flex items-center gap-1 font-sans">
                  Swipe down or tap background backdrop to return to study guide.
                </span>
                <span className="font-mono">
                  Level: {user?.level || 'Undergraduate'}
                </span>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
