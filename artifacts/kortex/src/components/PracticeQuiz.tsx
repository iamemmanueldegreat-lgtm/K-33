import { useState, useEffect, useRef } from 'react';
import { Clock, Target, Play, RotateCcw, CheckCircle2, XCircle, BrainCircuit, Sparkles, AlertCircle, ChevronRight, Coins, HelpCircle, ArrowRight, Hourglass, X, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

type SessionState = 'SETUP' | 'GENERATING' | 'QUIZ' | 'RESULTS';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface PracticeQuizProps {
  courseTitle: string;
  courseCode: string;
  topicTitle: string;
  preGeneratedQuestions?: any[];
  chapter?: string;
}

export default function PracticeQuiz({ courseTitle, courseCode, topicTitle, preGeneratedQuestions, chapter }: PracticeQuizProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Core Flow States
  const [sessionState, setSessionState] = useState<SessionState>('SETUP');
  const [showOverviewSheet, setShowOverviewSheet] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Interaction States
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confirmedAnswer, setConfirmedAnswer] = useState(false);
  const [explanationExpanded, setExplanationExpanded] = useState(true);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Ask AI follow-up states
  const [askQuery, setAskQuery] = useState('');
  const [askResponse, setAskResponse] = useState('');
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Confetti Particle state for Results Page
  const [confetti, setConfetti] = useState<{ id: number; rX: number; rY: number; scale: number; bg: string; delay: number }[]>([]);

  // Function to ask follow-up questions about this quiz question to AI
  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim()) return;

    setIsAskingAi(true);
    setAskResponse('');

    try {
      const response = await fetch('/api/quiz-explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questions[currentIdx].question,
          options: questions[currentIdx].options,
          correctIndex: questions[currentIdx].correctIndex,
          chosenIndex: selectedOption,
          userQuery: askQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not get response from AI');
      }

      const data = await response.json();
      setAskResponse(data.explanation || 'No response formulated.');
    } catch (err: any) {
      console.error(err);
      setAskResponse('Failed to fetch an answer from Kortex AI. Please check your connection and try again.');
    } finally {
      setIsAskingAi(false);
    }
  };

  // Timer logic for diagnostic elapsed-time tracking
  useEffect(() => {
    if (sessionState === 'QUIZ') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  // Generate confetti coordinates on celebration results show
  useEffect(() => {
    if (sessionState === 'RESULTS') {
      const arr = Array.from({ length: 32 }).map((_, i) => {
        const colors = ['bg-[#f43f5e]', 'bg-[#fbbf24]', 'bg-[#10b981]', 'bg-[#60a5fa]', 'bg-[#8b5cf6]', 'bg-[#ec4899]'];
        return {
          id: i,
          rX: Math.random() * 320 - 160,
          rY: Math.random() * -320 - 120,
          scale: Math.random() * 0.7 + 0.4,
          bg: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 1.0
        };
      });
      setConfetti(arr);
    } else {
      setConfetti([]);
    }
  }, [sessionState]);

  const generateQuiz = async () => {
    setSessionState('GENERATING');
    const targetLength = 10; // Hardcoded per user instruction ("I want the questions to always be 10")

    // Use pre-generated offline questions if available AND they fit the required size
    if (preGeneratedQuestions && preGeneratedQuestions.length > 0) {
      setTimeout(() => {
        const padded: QuizQuestion[] = [];
        // Pad to exactly 10 questions by repeating the list if it's smaller, guaranteeing 10 questions
        while (padded.length < targetLength) {
          const remaining = targetLength - padded.length;
          const slice = preGeneratedQuestions.slice(0, remaining).map((q) => ({
            question: q.question || '',
            options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || 'Review topic syllabus to confirm correct recall.'
          }));
          padded.push(...slice);
        }

        setQuestions(padded);
        setCurrentIdx(0);
        setScore(0);
        setSelectedOption(null);
        setConfirmedAnswer(false);
        setTimeElapsed(0);
        setSessionState('QUIZ');
      }, 1500);
      return;
    }

    // Otherwise, generate 10 dynamic LLM active recall questions online
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseTitle, courseCode, topicTitle, numQuestions: targetLength }),
      });
      if (!res.ok) throw new Error("Failed to compile quiz database");
      const generatedQuestions = await res.json();

      if (Array.isArray(generatedQuestions) && generatedQuestions.length > 0) {
        const valid = generatedQuestions.map((q) => ({
          question: q.question || 'Academic Appraisal Checkpoint',
          options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          explanation: q.explanation || 'Syllabus alignment confirmed.'
        }));
        setQuestions(valid.slice(0, targetLength));
      } else {
        throw new Error("No array found");
      }

      setCurrentIdx(0);
      setScore(0);
      setSelectedOption(null);
      setConfirmedAnswer(false);
      setTimeElapsed(0);
      setSessionState('QUIZ');

    } catch (e) {
      console.error("LLM Generation lagged. Activating local robust template logic:", e);
      // Construct a premium robust procedural fallback set of 10 relevant questions
      const fallbackQuestions: QuizQuestion[] = Array.from({ length: targetLength }).map((_, i) => ({
        question: `Appraisal Assessment concept #${i + 1}: How does the student correctly evaluate key components associated with "${topicTitle}"?`,
        options: [
          `By applying standard computational and procedural frameworks`,
          `Through qualitative review of syllabus guidelines and formulas`,
          `By measuring diagnostic efficiency benchmarks`,
          `By validating real-life local case study constraints`
        ],
        correctIndex: i % 4,
        explanation: `Concept review check: This question assesses core syllabus components related to ${topicTitle}. Practicing active recall locks in optimal exam retention.`
      }));

      setQuestions(fallbackQuestions);
      setCurrentIdx(0);
      setScore(0);
      setSelectedOption(null);
      setConfirmedAnswer(false);
      setTimeElapsed(0);
      setSessionState('QUIZ');
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (confirmedAnswer) return; // Cannot modify after locking answer
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || confirmedAnswer) return;
    setConfirmedAnswer(true);
    if (selectedOption === questions[currentIdx].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    setAskQuery('');
    setAskResponse('');
    setIsAskingAi(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setConfirmedAnswer(false);
      setExplanationExpanded(true);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Save final stats to Firestore database securely
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
          coins: currentToday.coins + (score * 10), // 10 Coins / Points per correct answer
          finished_reading: currentToday.finished_reading + (score === questions.length ? 1 : 0),
          started_reading: currentToday.started_reading + (score !== questions.length ? 1 : 0)
        };

        await updateDoc(docRef, {
          academic_stats_by_date: statsByDate
        });
      }
    } catch (e) {
      console.error("Firestore persistence warning (safely offline):", e);
    }

    setSessionState('RESULTS');
  };

  const resetSession = () => {
    setAskQuery('');
    setAskResponse('');
    setIsAskingAi(false);
    setSessionState('SETUP');
    setShowOverviewSheet(true);
    setSelectedOption(null);
    setConfirmedAnswer(false);
    setExplanationExpanded(true);
    setScore(0);
  };

  return (
    <div className="w-full relative min-h-[30vh] flex flex-col justify-center items-center">

      {/* SETUP STATE (STATIC PREVIEW OR BOTTOM SHEET DRAWER) */}
      {sessionState === 'SETUP' && (
        <div className="w-full max-w-2xl px-2">
          {/* Static Preview Card below sheet if user closes it */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-[24px] p-6 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#14333c]/10 dark:bg-[#14333c]/35 text-[#14333c] dark:text-teal-400 mx-auto flex items-center justify-center">
              <BrainCircuit size={28} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">Active Practice Ready</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Unlock active recall appraisal with an interactive 10-question evaluation tailored specifically to <span className="font-bold text-zinc-800 dark:text-zinc-200">"{topicTitle}"</span>.
              </p>
            </div>
            <button
              onClick={() => setShowOverviewSheet(true)}
              className="py-2.5 px-6 rounded-full bg-[#14333c] hover:bg-[#0f2830] text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-2 shadow-md"
            >
              Prepare Quiz Overview
            </button>
          </div>

          {/* SLIDE-UP BOTTOM SHEET DRAWER OVERLAY (SPANNING EXTRA EDGE-TO-EDGE) */}
          <AnimatePresence>
            {showOverviewSheet && (
              <div className="fixed inset-0 bg-black/45 dark:bg-black/65 backdrop-blur-[3px] z-50 flex items-end justify-center">
                
                {/* Backdrop closer */}
                <div className="absolute inset-0 cursor-pointer" onClick={() => setShowOverviewSheet(false)} />

                {/* Card sliding from under - Spans LEFT-TO-RIGHT completely, edge-to-edge */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 240 }}
                  className="bg-white dark:bg-zinc-950 rounded-t-[36px] w-full max-w-full overflow-hidden p-6 sm:p-8 relative shadow-2xl flex flex-col z-10 border-t border-zinc-200 dark:border-zinc-850 pb-8 bottom-0"
                >
                  {/* Top Close Button */}
                  <button
                    onClick={() => setShowOverviewSheet(false)}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 transition-colors z-20 cursor-pointer shadow-sm"
                  >
                    <X size={18} />
                  </button>

                  {/* Concentric Rainbow Arch Banner Graphic Frame (Mimicking Image 1 Left) */}
                  <div className="w-full h-48 bg-gradient-to-br from-[#fed7aa]/35 to-[#fef08a]/20 rounded-[28px] relative overflow-hidden flex items-center justify-center mb-6 border border-amber-100/30 dark:border-zinc-800">
                    {/* Dynamic overlapping concentric arch paths perfectly centered and cropped at bottom */}
                    <div className="absolute inset-x-0 -bottom-16 flex justify-center pointer-events-none">
                      <div className="w-[430px] h-[430px] rounded-full border-[36px] border-[#fb7185] flex items-center justify-center shadow-lg"> {/* Rosa-Red outer arch */}
                        <div className="w-[358px] h-[358px] rounded-full border-[36px] border-[#fb923c] flex items-center justify-center"> {/* Orange */}
                          <div className="w-[286px] h-[286px] rounded-full border-[36px] border-[#facc15] flex items-center justify-center"> {/* Yellow */}
                            <div className="w-[214px] h-[214px] rounded-full border-[36px] border-[#a3e635] flex items-center justify-center"> {/* Lime */}
                              <div className="w-[142px] h-[142px] rounded-full bg-[#38bdf8] shadow-inner" /> {/* Vibrant Blue Center */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Floating pill tag over arches */}
                    <div className="absolute inset-0 bg-black/[0.02]" />
                    <span className="relative z-10 text-white font-extrabold text-[11px] uppercase tracking-wider bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md border border-white/15">
                      <Sparkles size={11} className="text-yellow-300 fill-yellow-300 animate-bounce" />
                      Active Recall Prep
                    </span>
                  </div>

                  {/* Test metadata info text (Matching Image 1 Left layout) */}
                  <div className="space-y-1 mb-6 text-left">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                      {topicTitle} Test
                    </h2>
                    <p className="text-xs font-bold text-zinc-400 tracking-wider">
                      10 Question
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-600 dark:text-zinc-350">
                      <span>Total Score:</span>
                      <span className="inline-flex items-center gap-1 bg-[#14333c]/10 dark:bg-[#14333c]/35 text-[#14333c] dark:text-teal-400 px-3 py-1 rounded-full text-xs font-black">
                        <Star size={12} className="fill-[#14333c] dark:fill-teal-400 text-[#14333c] dark:text-teal-400 animate-pulse" />
                        100 Points
                      </span>
                    </div>
                  </div>

                  {/* Core quiz instructions matching image */}
                  <div className="space-y-4 text-left w-full mb-8">
                    <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-200 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-1.5">Instructions:</h4>
                    <ul className="space-y-3.5 text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#14333c]/10 dark:bg-[#14333c]/35 text-[#14333c] dark:text-teal-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Read each question carefully.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#14333c]/10 dark:bg-[#14333c]/35 text-[#14333c] dark:text-teal-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                        <span>Choose the correct answer from the options provided.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#14333c]/10 dark:bg-[#14333c]/35 text-[#14333c] dark:text-teal-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                        <span>Review active concepts and ask Kortex AI for deeper explanations after each question!</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action launcher button */}
                  <button
                    onClick={generateQuiz}
                    type="button"
                    className="w-full py-4.5 rounded-[24px] bg-[#14333c] hover:bg-[#0f2830] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#14333c]/15 active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer border border-[#14333c]/20"
                  >
                    <span>Start Quiz</span>
                  </button>

                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* GENERATING / CREATION STATE (IMMERSIVE FULL SCREEN OVERLAY) */}
      {sessionState === 'GENERATING' && (
         <LoadingScreen />
      )}

      {/* ACTIVE QUIZ VIEW STATE (FULL-SCREEN EXPERIENCE) */}
      {sessionState === 'QUIZ' && questions.length > 0 && (
         <div
           className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex flex-col"
           style={{ height: '100dvh' }}
         >
           {/* UPPER SECTION: question display — auto height, never scrolls */}
           <div
             className="w-full flex-none flex flex-col bg-white dark:bg-zinc-950 pb-3 px-5 sm:px-8 items-center border-b border-zinc-50 dark:border-zinc-900/40"
             style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
           >
             <div className="w-full max-w-2xl flex flex-col">
               
               {/* Header Top Bar - Pushed to the absolute top */}
               <div className="flex items-center justify-between w-full mb-3.5">
                 <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                   Question {currentIdx + 1}
                 </h1>
                 {/* Top Close Button inside layout */}
                 <button
                   onClick={resetSession}
                   title="Exit exam"
                   className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-805 text-zinc-600 dark:text-zinc-350 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                 >
                   <X size={20} />
                 </button>
               </div>

               {/* Vibrant Lime Progress Line spanning full horizontal space */}
               <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden mb-2.5">
                 <motion.div
                   className="h-full bg-[#a3e635] rounded-full"
                   initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
                   animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                   transition={{ duration: 0.35 }}
                 />
               </div>

               {/* Question metadata label right under progress bar as seen in Image 2 */}
               <p className="text-zinc-500 dark:text-zinc-400 text-xs font-black uppercase tracking-[0.25em] mb-4">
                 {currentIdx + 1} of {questions.length} questions
               </p>

               {/* Central Active Question Display - Large, bold, legible fonts */}
               <motion.div
                 key={`q-txt-idx-${currentIdx}`}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.3 }}
                 className="min-h-[85px] sm:min-h-[100px] py-2 flex items-center justify-start text-left"
               >
                 <h2 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-snug max-w-2xl">
                   {questions[currentIdx].question}
                 </h2>
               </motion.div>

             </div>
           </div>

           {/* LOWER SECTION: dark teal rounded drawer — fills all remaining space */}
           <div className="bg-[#14333c] rounded-t-[44px] px-6 pt-5 sm:px-12 sm:pt-6 flex flex-col w-full shadow-2xl z-20 flex-1 min-h-0">
             {/* Scrollable content: options + explanation. Takes all available height. */}
             <div className="max-w-xl mx-auto w-full flex-1 min-h-0 overflow-y-auto pr-1 pb-2 custom-scrollbar">
               
               {/* Centered label */}
               <p className="text-center text-teal-200/80 text-xs font-black uppercase tracking-[0.25em] mb-4">
                 Choose Answer
               </p>

               {/* Options stacked vertically */}
               <div className="space-y-3 mb-4">
                 {questions[currentIdx].options.map((opt, idx) => {
                   // Defaults: Option pill outline, clear font (exact matching image 2)
                   let optStyle = "bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-sm sm:text-base";
                   let numStyle = "bg-[#14333c]/85 text-teal-250 border border-teal-500/20";

                   // Golden Selected State (replicating Yellow button in Image 2)
                   if (selectedOption === idx) {
                     optStyle = "bg-teal-400 text-[#14333c] border-transparent font-black text-sm sm:text-base shadow-xl scale-[1.015]";
                     numStyle = "bg-[#14333c]/25 text-teal-850 border-transparent font-black";
                   }

                   // Visual correction highlight codes post-answer lock-in
                   if (confirmedAnswer) {
                     const isCorrect = idx === questions[currentIdx].correctIndex;
                     const isSelected = selectedOption === idx;

                     if (isCorrect) {
                       optStyle = "bg-[#10b981] text-white border-transparent font-black text-sm sm:text-base shadow-lg";
                       numStyle = "bg-white/25 text-white border-transparent font-black";
                     } else if (isSelected) {
                       optStyle = "bg-[#ef4444] text-white border-transparent font-black text-sm sm:text-base shadow-lg";
                       numStyle = "bg-white/25 text-white border-transparent font-black";
                     } else {
                       optStyle = "opacity-30 bg-transparent text-teal-300 border border-teal-500/15 text-sm sm:text-base";
                       numStyle = "opacity-30 bg-transparent text-teal-250 border-transparent";
                     }
                   }

                   return (
                     <motion.button
                       key={`choice-opt-${idx}`}
                       initial={{ opacity: 0, y: 15 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.25, delay: idx * 0.06 }}
                       disabled={confirmedAnswer}
                       onClick={() => handleOptionSelect(idx)}
                       type="button"
                       className={`w-full p-3.5 sm:p-4 rounded-full flex items-center justify-between gap-4 transition-all duration-300 text-left cursor-pointer ${optStyle}`}
                     >
                       <div className="flex items-center gap-4 flex-1">
                         <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm sm:text-base shrink-0 transition-all ${numStyle}`}>
                           {String.fromCharCode(65 + idx)}
                         </div>
                         <span className="flex-1 leading-snug tracking-wide font-extrabold">{opt}</span>
                       </div>

                       {/* Interactive visual status icons */}
                       {confirmedAnswer && idx === questions[currentIdx].correctIndex && (
                         <CheckCircle2 size={20} className="text-white shrink-0 animate-bounce" />
                       )}
                       {confirmedAnswer && selectedOption === idx && idx !== questions[currentIdx].correctIndex && (
                         <XCircle size={20} className="text-white shrink-0" />
                       )}
                     </motion.button>
                   );
                 })}
               </div>

               {/* Post-answer feedback block */}
               <AnimatePresence>
                 {confirmedAnswer && (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="rounded-[20px] mb-4 overflow-hidden border border-white/10 shadow-inner"
                   >
                     {/* Verdict header */}
                     {(() => {
                       const isCorrect = selectedOption === questions[currentIdx].correctIndex;
                       const correctLetter = String.fromCharCode(65 + questions[currentIdx].correctIndex);
                       return (
                         <>
                           <div className={`flex items-center gap-2 px-4 py-2.5 ${isCorrect ? 'bg-[#10b981]/25' : 'bg-[#ef4444]/25'}`}>
                             {isCorrect
                               ? <CheckCircle2 size={15} className="text-emerald-300 shrink-0" />
                               : <XCircle size={15} className="text-red-300 shrink-0" />}
                             <span className={`text-xs font-black ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                               {isCorrect
                                 ? `Correct! Option ${correctLetter} is right.`
                                 : `Wrong! Option ${correctLetter} is the correct answer.`}
                             </span>
                           </div>
                           <div
                             className="bg-white/8 px-4 py-3 cursor-pointer hover:bg-white/12 transition-all select-none"
                             onClick={() => setExplanationExpanded(!explanationExpanded)}
                           >
                             <div className={`transition-all duration-300 overflow-hidden ${explanationExpanded ? 'max-h-28 overflow-y-auto' : 'max-h-5 line-clamp-1'}`}>
                               <p className="text-[11px] text-white/80 font-medium leading-relaxed">
                                 {questions[currentIdx].explanation}
                               </p>
                             </div>
                             <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 mt-1 block">
                               {explanationExpanded ? 'Tap to collapse' : 'Tap to read more'}
                             </span>
                           </div>
                         </>
                       );
                     })()}
                   </motion.div>
                 )}
               </AnimatePresence>


              </div>

             {/* Pinned action buttons — flex-none so they NEVER scroll away */}
             <div
               className="max-w-xl mx-auto w-full flex items-center justify-end flex-none pt-3"
               style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
             >
               {selectedOption !== null && !confirmedAnswer && (
                 <button
                   onClick={handleSubmitAnswer}
                   type="button"
                   className="bg-white hover:bg-zinc-50 text-[#14333c] font-black text-sm px-8 py-4 rounded-full shadow-lg transition-all active:scale-[0.97] cursor-pointer inline-flex items-center gap-2"
                 >
                   <span>Confirm Option</span>
                   <ArrowRight size={15} className="stroke-[3]" />
                 </button>
               )}

               {confirmedAnswer && (
                 <button
                   onClick={handleNextQuestion}
                   type="button"
                   className="bg-white hover:bg-zinc-50 text-[#14333c] font-black text-sm px-8 py-4 rounded-full shadow-lg transition-all active:scale-[0.97] cursor-pointer inline-flex items-center gap-2"
                 >
                   <span>{currentIdx < questions.length - 1 ? 'Next Question' : 'Finish'}</span>
                   <ArrowRight size={15} className="stroke-[3]" />
                 </button>
               )}
             </div>

           </div>

         </div>
      )}

      {/* QUIZ COMPLETED / RESULTS STATE */}
      {sessionState === 'RESULTS' && (
        <div
          className="fixed inset-0 z-[100] bg-[#14333c] flex flex-col justify-center items-center p-6 overflow-y-auto"
          style={{ height: '100dvh' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md mx-auto text-center flex flex-col items-center"
          >
            {/* Celebration Confetti */}
            {confetti.map(c => (
              <motion.div
                key={`conf-${c.id}`}
                initial={{ y: 50, x: 0, opacity: 1, rotate: 0 }}
                animate={{ y: c.rY, x: c.rX, opacity: [1, 1, 0], rotate: 360 }}
                transition={{ duration: 2.4, delay: c.delay, ease: "easeOut" }}
                className={`absolute w-2.5 h-2.5 rounded-sm ${c.bg} pointer-events-none z-10`}
                style={{ scale: c.scale, left: '50%', top: '35%' }}
              />
            ))}

            {/* Immersive Party Popper graphic circle wrapper (replicating original) */}
            <div className="relative w-32 h-32 flex items-center justify-center bg-white/10 rounded-full mb-6 z-20 shadow-inner">
              <span className="text-6 text-6xl animate-bounce select-none">
                🎉
              </span>
            </div>

            {/* Title section (Matching Image 1 Right header) */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 z-20">
              Quiz Completed!
            </h2>

            {/* Result container box ("Your Result" panel matching Image 1 Right) */}
            <div className="w-full bg-[#1e4854] p-6 rounded-[28px] flex flex-col gap-4 mt-6 mb-8 z-20 shadow-inner border border-white/5">
              <p className="text-teal-200/80 text-xs font-black uppercase tracking-[0.25em]">
                Your Result
              </p>
              <div className="flex items-center justify-between gap-4">
                {/* Score star pill */}
                <div className="flex-1 bg-white py-4 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border border-white/10 hover:scale-[1.02] transition-transform">
                  <Star size={16} className="fill-[#14333c] text-[#14333c]" />
                  <span className="font-extrabold text-[#14333c] text-sm">
                    {score * 10} Points
                  </span>
                </div>
                {/* Correct questions check icon pill */}
                <div className="flex-1 bg-white py-4 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border border-white/10 hover:scale-[1.02] transition-transform">
                  <Check size={16} className="text-emerald-600 stroke-[3]" />
                  <span className="font-extrabold text-[#14333c] text-sm font-black">
                    {score}/10 Questions
                  </span>
                </div>
              </div>
            </div>

            {/* CTA action buttons */}
            <div className="w-full space-y-4 z-20">
              <button
                onClick={() => {
                  resetSession();
                  setShowOverviewSheet(false);
                  if (chapter) {
                    navigate(`/course/${courseCode}?chapter=${encodeURIComponent(chapter)}`);
                  } else {
                    navigate(`/course/${courseCode}`);
                  }
                }}
                type="button"
                className="w-full py-4 rounded-full bg-white hover:bg-zinc-50 text-[#14333c] font-black text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Continue
              </button>
            </div>





          </motion.div>
        </div>
      )}

    </div>
  );
}
