import { useState, useEffect, useRef } from 'react';
import { Clock, Target, Play, RotateCcw, CheckCircle2, XCircle, BrainCircuit, Sparkles, AlertCircle, ChevronRight, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Course, Topic } from '../types';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

type SessionState = 'SETUP' | 'GENERATING' | 'QUIZ' | 'RESULTS';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const numPattern = [5, 10, 15, 20];
const durationPattern = ['Untimed', '5 min', '10 min', '15 min'];

interface PracticeQuizProps {
  courseTitle: string;
  courseCode: string;
  topicTitle: string;
  preGeneratedQuestions?: any[];
}

export default function PracticeQuiz({ courseTitle, courseCode, topicTitle, preGeneratedQuestions }: PracticeQuizProps) {
  const { user } = useAuth();
  // Flow states
  const [sessionState, setSessionState] = useState<SessionState>('SETUP');
  const [numQuestions, setNumQuestions] = useState(5);
  const [duration, setDuration] = useState('Untimed');
  
  // Quiz states
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    if (sessionState === 'QUIZ') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        if (timeRemaining !== null) {
          setTimeRemaining(prev => {
            if (prev && prev > 1) return prev - 1;
            // Time's up
            handleFinishQuiz();
            return 0;
          });
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState, timeRemaining]);


  const generateQuiz = async () => {
    setSessionState('GENERATING');
    
    // Use pre-generated offline questions if available
    if (preGeneratedQuestions && preGeneratedQuestions.length > 0) {
      setTimeout(() => {
        // Take up to numQuestions if there are extra, or use all
        const subset = preGeneratedQuestions.slice(0, numQuestions);
        setQuestions(subset);
        setCurrentIdx(0);
        setScore(0);
        setSelectedOption(null);
        setTimeElapsed(0);
        
        if (duration !== 'Untimed') {
          const mins = parseInt(duration.split(' ')[0]);
          setTimeRemaining(mins * 60);
        } else {
          setTimeRemaining(null);
        }
        
        setSessionState('QUIZ');
      }, 700);
      return;
    }
    
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseTitle, courseCode, topicTitle, numQuestions }),
      });
      if (!res.ok) throw new Error("Failed to fetch generated quiz.");
      const generatedQuestions = await res.json();
      
      setQuestions(generatedQuestions);
      setCurrentIdx(0);
      setScore(0);
      setSelectedOption(null);
      setTimeElapsed(0);
      
      if (duration !== 'Untimed') {
        const mins = parseInt(duration.split(' ')[0]);
        setTimeRemaining(mins * 60);
      } else {
        setTimeRemaining(null);
      }
      
      setSessionState('QUIZ');
      
    } catch (e) {
      console.error("Failed to generate quiz", e);
      alert("Failed to generate questions. Please try again.");
      setSessionState('SETUP');
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(idx);
    if (idx === questions[currentIdx].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Save quiz stats to Firestore for real-time analytics tracking
    try {
      if (user && user.id) {
        const todayStr = new Date().toISOString().split('T')[0];
        const docRef = doc(db, 'users', user.id);
        const statsByDate = { ...(user.academic_stats_by_date || {}) };
        
        const currentToday = statsByDate[todayStr] || {
          answered: 0,
          right: 0,
          coins: 0,
          finished_reading: 0,
          started_reading: 0
        };

        statsByDate[todayStr] = {
          answered: currentToday.answered + questions.length,
          right: currentToday.right + score,
          coins: currentToday.coins + (score * 10),
          finished_reading: currentToday.finished_reading + (score === questions.length ? 1 : 0),
          started_reading: currentToday.started_reading + (score !== questions.length ? 1 : 0)
        };

        await updateDoc(docRef, {
          academic_stats_by_date: statsByDate
        });
      }
    } catch (e) {
      console.error("Failed to persist stats securely to Firestore:", e);
    }

    setSessionState('RESULTS');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full pb-20 pt-4 min-h-[70vh]">
      {/* SETUP STATE */}
      {sessionState === 'SETUP' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-xl mx-auto"
        >
          <div className="card-bento space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted mb-3 block">Number of Questions</label>
              <div className="flex gap-2.5">
                {numPattern.map(n => (
                  <button 
                    key={n}
                    onClick={() => setNumQuestions(n)}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all border-2 ${numQuestions === n ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'border-border bg-surface text-muted hover:bg-surface/80 hover:border-primary/50'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted mb-3 block">Time Limit</label>
              <div className="flex flex-wrap gap-2.5">
                {durationPattern.map(d => (
                  <button 
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-4 px-4 rounded-2xl font-bold transition-all border-2 ${duration === d ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'border-border bg-surface text-muted hover:bg-surface/80 hover:border-primary/50'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button 
            onClick={generateQuiz}
            className="w-full mt-8 py-5 rounded-[24px] bg-primary text-white font-bold text-lg hover:opacity-95 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-1 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            <div className="flex items-center gap-2">
              Start Practice
              <Play fill="currentColor" size={20} />
            </div>
            <span className="text-[10px] font-medium text-white/70 uppercase tracking-widest">Questions chosen for this topic</span>
          </button>
        </motion.div>
      )}

      {/* GENERATING STATE */}
      {sessionState === 'GENERATING' && (
         <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }}
           className="flex flex-col items-center justify-center py-20 text-center space-y-6"
         >
            <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary relative">
              <BrainCircuit size={48} strokeWidth={1.5} className="animate-pulse" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center animate-bounce shadow-lg">
                <Sparkles size={16} fill="currentColor" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Crafting your questions...</h2>
              <p className="text-muted text-sm max-w-xs mx-auto font-medium">
                Our AI is composing a random mix of questions based on <span className="text-text font-bold">{topicTitle}</span>.
              </p>
            </div>
         </motion.div>
      )}

      {/* QUIZ STATE */}
      {sessionState === 'QUIZ' && questions.length > 0 && (
         <div className="max-w-2xl mx-auto flex flex-col min-h-[60vh] justify-between">
           
           <div className="space-y-6">
             {/* Quiz Header Info */}
             <div className="flex items-center justify-between text-text font-bold text-xs uppercase tracking-widest bg-surface border border-border p-3 sm:p-4 rounded-[20px] shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">Q {currentIdx + 1} / {questions.length}</span>
                </div>
                {duration !== 'Untimed' && timeRemaining !== null && (
                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${timeRemaining < 60 ? 'text-red-500 border-red-500/20 bg-red-500/10 animate-pulse' : 'text-muted border-border bg-surface'}`}>
                     <Clock size={16} className={timeRemaining < 60 ? "animate-spin" : ""} style={{ animationDuration: '2s' }} />
                     <span className="font-mono text-sm">{formatTime(timeRemaining)}</span>
                   </div>
                )}
             </div>

             {/* Progress Bar */}
             <div className="w-full h-2.5 bg-border/50 rounded-full overflow-hidden p-0.5">
               <motion.div 
                 className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                 initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
                 animate={{ width: `${((currentIdx + (selectedOption !== null ? 1 : 0)) / questions.length) * 100}%` }}
                 transition={{ duration: 0.3 }}
               />
             </div>

             {/* Question Card */}
             <motion.div 
               key={`q-${currentIdx}`}
               initial={{ x: 20, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               className="card-bento p-6 sm:p-8 shadow-sm border-border/50"
             >
               <h2 className="text-lg sm:text-xl font-bold text-text mb-8 leading-snug">
                 {questions[currentIdx].question}
               </h2>

               <div className="space-y-3">
                 {questions[currentIdx].options.map((opt, idx) => {
                   
                   let buttonStyle = "border-border/60 bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-text hover:border-primary/50 hover:shadow-sm";
                   let Icon = null;

                   if (selectedOption !== null) {
                      const isCorrectAnswer = idx === questions[currentIdx].correctIndex;
                      const isSelected = selectedOption === idx;

                      if (isCorrectAnswer) {
                        buttonStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] scale-[1.02] z-10 relative";
                        Icon = <CheckCircle2 size={24} className="text-emerald-500" />;
                      } else if (isSelected && !isCorrectAnswer) {
                        buttonStyle = "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-400 scale-[0.98]";
                        Icon = <XCircle size={24} className="text-red-500" />;
                      } else {
                        buttonStyle = "border-border bg-surface opacity-40 grayscale";
                      }
                   }

                   return (
                     <motion.button
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                       key={idx}
                       onClick={() => handleOptionSelect(idx)}
                       disabled={selectedOption !== null}
                       className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center justify-between gap-4 transition-all duration-300 font-medium ${buttonStyle}`}
                     >
                       <div className="flex items-center gap-4 flex-1">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${selectedOption !== null && idx === questions[currentIdx].correctIndex ? 'bg-emerald-500 text-white' : 'bg-border/50 text-muted'}`}>
                           {String.fromCharCode(65 + idx)}
                         </div>
                         <span className="flex-1 leading-relaxed">{opt}</span>
                       </div>
                       {Icon && <span className="shrink-0">{Icon}</span>}
                     </motion.button>
                   );
                 })}
               </div>
             </motion.div>
             
             {/* Explanation */}
             <AnimatePresence>
               {selectedOption !== null && (
                 <motion.div 
                   initial={{ opacity: 0, height: 0, y: -10 }}
                   animate={{ opacity: 1, height: 'auto', y: 0 }}
                   className="card-bento p-5 border-primary/20 bg-primary/5"
                 >
                   <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-2">Explanation</p>
                   <p className="text-sm font-medium leading-relaxed">{questions[currentIdx].explanation}</p>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
           
           <div className="pt-6 pb-2">
             {selectedOption !== null && (
               <button 
                 onClick={handleNextQuestion}
                 className="btn-primary w-full py-4 rounded-[20px] text-lg"
               >
                 {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
               </button>
             )}
           </div>
         </div>
      )}

      {/* RESULTS STATE */}
      {sessionState === 'RESULTS' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto card-bento p-6 sm:p-8 flex flex-col items-center bg-gradient-to-b from-surface to-background border-border relative overflow-hidden"
        >
          {/* Confetti-like effect background (abstract setup) */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

          <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center p-1 mb-4 shadow-xl z-10">
            <div className="w-full h-full bg-surface rounded-full flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-primary">{(score / questions.length * 100).toFixed(0)}%</span>
            </div>
          </div>
          <h2 className="text-xs font-black tracking-[0.2em] uppercase text-muted mb-8 z-10">Quiz Completed</h2>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full mb-8 z-10">
            <div className="bg-surface/80 backdrop-blur-sm border border-border p-3 rounded-2xl flex flex-col items-center text-center">
               <Clock className="text-blue-500 mb-1" size={24} />
               <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Time</p>
               <p className="font-black mt-1 text-sm">{formatTime(timeElapsed)}</p>
            </div>
            <div className="bg-surface/80 backdrop-blur-sm border border-border p-3 rounded-2xl flex flex-col items-center text-center">
               <Target className="text-emerald-500 mb-1" size={24} />
               <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Accuracy</p>
               <p className="font-black mt-1 text-sm">{score}/{questions.length}</p>
            </div>
            <div className="bg-surface/80 backdrop-blur-sm border border-border p-3 rounded-2xl flex flex-col items-center text-center">
               <Coins className="text-amber-500 mb-1" size={24} />
               <p className="text-[10px] font-bold text-muted uppercase tracking-widest">X-Coins</p>
               <p className="font-black mt-1 text-sm">+{score * 10}</p>
            </div>
          </div>

          <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between mb-8 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-primary tracking-tight">Check your updated</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">Ranking in leaderboard</p>
              </div>
            </div>
            <ChevronRight className="text-primary" size={20} />
          </div>

          <div className="w-full space-y-3 z-10">
            <button 
              onClick={() => {
                 setSessionState('SETUP');
              }}
              className="w-full py-4 rounded-2xl font-bold bg-surface border border-border text-text flex items-center justify-center gap-2 hover:bg-border/50 transition-colors"
            >
              <RotateCcw size={18} />
              Reattempt Quiz
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
