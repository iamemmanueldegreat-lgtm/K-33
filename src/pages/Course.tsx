import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type { Course as CourseType, Topic } from '../types';
import { ArrowLeft, BookOpen, Clock, ChevronRight, CheckCircle2, Star, Sparkles, Book } from 'lucide-react';

// Memory caches across SPA transitions to make navigating to courses/chapters instant
const cachedCourseDetails: Record<string, { course: CourseType; topics: Topic[] }> = {};

export default function Course() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Try to load cached data synchronously
  const cachedData = useMemo(() => {
    if (!courseId) return null;
    if (cachedCourseDetails[courseId]) {
      return cachedCourseDetails[courseId];
    }
    try {
      const stored = localStorage.getItem(`course_detail_${courseId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as { course: CourseType; topics: Topic[] };
        if (parsed && parsed.course) {
          cachedCourseDetails[courseId] = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached details', e);
    }
    return null;
  }, [courseId]);

  const [course, setCourse] = useState<CourseType | null>(cachedData?.course || null);
  const [topics, setTopics] = useState<Topic[]>(cachedData?.topics || []);
  const [loading, setLoading] = useState(!cachedData);
  
  // Specific selected chapter name from URL parameter
  const selectedChapterName = searchParams.get('chapter') || '';

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      const hasCached = !!cachedCourseDetails[courseId];
      if (!hasCached) {
        setLoading(true);
      }
      try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        let cData: CourseType | null = null;
        if (courseDoc.exists()) {
          cData = courseDoc.data() as CourseType;
          cData.id = courseDoc.id;
          setCourse(cData);
        }
        
        const topicsSnapshot = await getDocs(
          collection(db, `courses/${courseId}/topics`)
        );
        const topicsData: Topic[] = topicsSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        topicsData.sort((a, b) => {
          const ca = a.chapter_order ?? 999;
          const cb = b.chapter_order ?? 999;
          if (ca !== cb) return ca - cb;
          return (a.order ?? 0) - (b.order ?? 0);
        });
        setTopics(topicsData);

        if (cData) {
          const payload = { course: cData, topics: topicsData };
          cachedCourseDetails[courseId] = payload;
          try {
            localStorage.setItem(`course_detail_${courseId}`, JSON.stringify(payload));
          } catch (e) {
            console.warn('Storage quota limit reached', e);
          }
        }
      } catch (error) {
        if (hasCached) {
          console.warn('Failed to refresh course details in background, using cache', error);
        } else {
          handleFirestoreError(error, OperationType.GET, 'courses/' + courseId);
        }
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  // Group topics by chapter name
  const groupedChapters = useMemo(() => {
    const groups: { chapter: string; chapter_order: number; topics: Topic[] }[] = [];
    for (const t of topics) {
      const name = t.chapter || 'Foundations';
      const order = t.chapter_order ?? 999;
      let g = groups.find(x => x.chapter === name);
      if (!g) {
        g = { chapter: name, chapter_order: order, topics: [] };
        groups.push(g);
      }
      g.topics.push(t);
    }
    return groups;
  }, [topics]);

  // Determine active chapter info to display (3rd and 4th screenshot style)
  const activeChapterData = useMemo(() => {
    if (groupedChapters.length === 0) {
      return {
        chapterName: selectedChapterName || 'Introduction',
        topics: [] as Topic[],
        lessonCount: 0,
        hoursCount: 4
      };
    }

    // Try to match chapter from url
    let matched = groupedChapters.find(
      g => g.chapter.toLowerCase() === selectedChapterName.toLowerCase()
    );

    // Default to first available chapter if empty/no match
    if (!matched) {
      matched = groupedChapters[0];
    }

    return {
      chapterName: matched.chapter,
      topics: matched.topics,
      lessonCount: matched.topics.length,
      hoursCount: Math.max(2, Math.round(matched.topics.length * 1.5))
    };
  }, [groupedChapters, selectedChapterName]);

  const handleStartStudying = () => {
    if (activeChapterData.topics.length > 0) {
      navigate(`/study/${courseId}/${activeChapterData.topics[0].id}`);
    } else if (topics.length > 0) {
      navigate(`/study/${courseId}/${topics[0].id}`);
    }
  };

  return (
    <div className="w-full h-full bg-[#09090C] text-white flex flex-col overflow-hidden">
      {loading ? (
        <div className="max-w-4xl w-full mx-auto p-6 space-y-6 pt-16">
          <div className="h-48 bg-zinc-105 dark:bg-zinc-900 animate-pulse rounded-3xl"></div>
          <div className="space-y-3">
            <div className="h-6 bg-zinc-105 dark:bg-zinc-900 animate-pulse rounded-full w-2/3"></div>
            <div className="h-4 bg-zinc-105 dark:bg-zinc-900 animate-pulse rounded-full w-1/3"></div>
          </div>
        </div>
      ) : (
        <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* LIGHT HEADER REGION - Expanded height to show more cellular organic imagery */}
          <div className="bg-[#FFFFFF] h-[225px] shrink-0 w-full relative overflow-hidden flex flex-col justify-start pt-6">
            
            {/* HIGH-FIDELITY ORGANIC BUBBLE CELLULAR ILLUSTRATION */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
              <svg className="w-full h-full" viewBox="0 0 1200 225" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Glowing organic radial gradients representing 3D cell structures */}
                  <radialGradient id="bubble1" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="20%" stopColor="#F5F3FF" />
                    <stop offset="60%" stopColor="#DDD6FE" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </radialGradient>
                  
                  <radialGradient id="bubble2" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="30%" stopColor="#FAE8FF" />
                    <stop offset="75%" stopColor="#F5D0FE" />
                    <stop offset="100%" stopColor="#C084FC" />
                  </radialGradient>

                  <radialGradient id="bubble3" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="25%" stopColor="#FDF2FF" />
                    <stop offset="70%" stopColor="#F0ABFC" />
                    <stop offset="100%" stopColor="#E879F9" />
                  </radialGradient>
                  
                  {/* Pearlescent linear backdrop gradient for entire white section */}
                  <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FAF5FF" />
                    <stop offset="30%" stopColor="#FFFDFE" />
                    <stop offset="65%" stopColor="#F5F3FF" />
                    <stop offset="100%" stopColor="#FDF4FF" />
                  </linearGradient>

                  {/* Microscopic Cell-Lattice/Porous pattern exactly mimicking the high-resolution texture */}
                  <pattern id="cellLatticePattern" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
                    {/* Organic bubble structures packed together */}
                    <circle cx="15" cy="15" r="14" fill="none" stroke="#7C3AED" strokeWidth="0.4" strokeOpacity="0.18" />
                    <circle cx="15" cy="15" r="10" fill="none" stroke="#8B5CF6" strokeWidth="0.25" strokeOpacity="0.12" />
                    <circle cx="15" cy="15" r="5" fill="none" stroke="#C084FC" strokeWidth="0.2" strokeOpacity="0.08" />
                    
                    <circle cx="2" cy="2" r="3.5" fill="none" stroke="#DB2777" strokeWidth="0.35" strokeOpacity="0.14" />
                    <circle cx="28" cy="2" r="4.5" fill="none" stroke="#D946EF" strokeWidth="0.3" strokeOpacity="0.15" />
                    <circle cx="2" cy="28" r="4" fill="none" stroke="#8B5CF6" strokeWidth="0.3" strokeOpacity="0.14" />
                    <circle cx="28" cy="28" r="3" fill="none" stroke="#C084FC" strokeWidth="0.25" strokeOpacity="0.12" />
                  </pattern>

                  {/* Soft Drop Shadow Filter for depth */}
                  <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="2" dy="6" stdDeviation="5" floodColor="#7C3AED" floodOpacity="0.12" />
                  </filter>
                  <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Light pearlescent biological canvas backdrop */}
                <rect width="1200" height="225" fill="url(#bgGrad)" />

                <g filter="url(#softShadow)" className="opacity-95">
                  {/* Connecting visual biological nerve links stretching across entire viewport */}
                  <path d="M150,160 Q450,40 750,150" fill="none" stroke="#DDD6FE" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.35" />
                  <path d="M450,150 Q750,50 1010,110" fill="none" stroke="#F5D0FE" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.35" />
                  <path d="M240,80 Q600,180 910,75" fill="none" stroke="#E9D5FF" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.3" />

                  {/* === GROUP LEFT === */}
                  <circle cx="150" cy="160" r="40" fill="url(#bubble1)" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.25" />
                  <circle cx="150" cy="160" r="40" fill="url(#cellLatticePattern)" opacity="0.75" />
                  
                  <circle cx="240" cy="80" r="45" fill="url(#bubble2)" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.25" />
                  <circle cx="240" cy="80" r="45" fill="url(#cellLatticePattern)" opacity="0.75" />
                  
                  <circle cx="80" cy="110" r="15" fill="url(#bubble1)" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.25" />
                  <circle cx="80" cy="110" r="15" fill="url(#cellLatticePattern)" opacity="0.6" />
                  
                  <circle cx="320" cy="150" r="18" fill="url(#bubble3)" stroke="#E879F9" strokeWidth="0.8" strokeOpacity="0.25" />
                  <circle cx="320" cy="150" r="18" fill="url(#cellLatticePattern)" opacity="0.6" />
                  
                  <circle cx="290" cy="40" r="14" fill="url(#bubble2)" stroke="#C084FC" strokeWidth="0.6" strokeOpacity="0.2" />
                  
                  <ellipse cx="240" cy="80" rx="58" ry="54" fill="none" stroke="#F5D0FE" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.4" />
                  <ellipse cx="150" cy="160" rx="50" ry="46" fill="none" stroke="#DDD6FE" strokeWidth="0.75" strokeDasharray="2 8" opacity="0.4" />

                  {/* === GROUP CENTER === */}
                  <circle cx="550" cy="140" r="48" fill="url(#bubble3)" stroke="#E879F9" strokeWidth="1.2" strokeOpacity="0.25" />
                  <circle cx="550" cy="140" r="48" fill="url(#cellLatticePattern)" opacity="0.8" />
                  
                  <circle cx="630" cy="70" r="40" fill="url(#bubble1)" stroke="#8B5CF6" strokeWidth="1.2" strokeOpacity="0.25" />
                  <circle cx="630" cy="70" r="40" fill="url(#cellLatticePattern)" opacity="0.8" />
                  
                  <circle cx="470" cy="80" r="16" fill="url(#bubble2)" stroke="#C084FC" strokeWidth="0.8" strokeOpacity="0.25" />
                  <circle cx="470" cy="80" r="16" fill="url(#cellLatticePattern)" opacity="0.6" />
                  
                  <circle cx="710" cy="150" r="15" fill="url(#bubble1)" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.25" />
                  <circle cx="710" cy="150" r="15" fill="url(#cellLatticePattern)" opacity="0.6" />
                  
                  <ellipse cx="550" cy="140" rx="60" ry="56" fill="none" stroke="#FDF2FF" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.4" />
                  <ellipse cx="630" cy="70" rx="52" ry="48" fill="none" stroke="#DDD6FE" strokeWidth="0.75" strokeDasharray="2 6" opacity="0.4" />

                  {/* === GROUP RIGHT === */}
                  <circle cx="1010" cy="110" r="75" fill="url(#bubble1)" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.3" />
                  <circle cx="1010" cy="110" r="75" fill="url(#cellLatticePattern)" opacity="0.85" />
                  <circle cx="1010" cy="110" r="71" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="180 90" />
                  
                  <circle cx="910" cy="75" r="50" fill="url(#bubble2)" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.25" />
                  <circle cx="910" cy="75" r="50" fill="url(#cellLatticePattern)" opacity="0.8" />
                  <circle cx="910" cy="75" r="46" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.4" />
                  
                  <circle cx="970" cy="155" r="42" fill="url(#bubble3)" stroke="#E879F9" strokeWidth="1" strokeOpacity="0.2" />
                  <circle cx="970" cy="155" r="42" fill="url(#cellLatticePattern)" opacity="0.75" />
                  
                  <circle cx="830" cy="110" r="18" fill="url(#bubble1)" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.3" filter="url(#glowFilter)" />
                  <circle cx="830" cy="110" r="18" fill="url(#cellLatticePattern)" opacity="0.6" />
                  
                  <circle cx="885" cy="145" r="12" fill="url(#bubble2)" stroke="#C084FC" strokeWidth="0.6" strokeOpacity="0.3" />
                  <circle cx="1040" cy="35" r="22" fill="url(#bubble3)" stroke="#D946EF" strokeWidth="0.8" strokeOpacity="0.25" />
                  <circle cx="1040" cy="35" r="22" fill="url(#cellLatticePattern)" opacity="0.7" />

                  <circle cx="820" cy="50" r="14" fill="url(#bubble2)" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.2" />
                  <circle cx="820" cy="50" r="14" fill="url(#cellLatticePattern)" opacity="0.6" />
                </g>

                {/* Orbit outlines */}
                <ellipse cx="1010" cy="110" rx="90" ry="86" fill="none" stroke="#DDD6FE" strokeWidth="0.75" strokeDasharray="2 10" opacity="0.7" />
                <ellipse cx="910" cy="75" rx="64" ry="60" fill="none" stroke="#F5D0FE" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.5" />
              </svg>
            </div>

            {/* Back Button and "Course Details" Label */}
            <div className="max-w-4xl w-full mx-auto px-6 flex items-center gap-5 z-20">
              <button
                onClick={() => navigate('/library')}
                className="w-12 h-12 rounded-full bg-white border border-zinc-250 text-zinc-800 hover:bg-zinc-50 transition-all flex items-center justify-center shadow-md active:scale-90 cursor-pointer shrink-0"
              >
                <ArrowLeft size={22} className="stroke-[2.5]" />
              </button>
              <span className="text-lg sm:text-xl font-black tracking-tight text-neutral-900 font-sans leading-none">
                Course Details
              </span>
            </div>
          </div>

          {/* OVERLAPPING DRAWER SHEET - Locked layout, but containing a scrollable lessons list inside */}
          <div className="bg-[#09090C] rounded-t-[40px] -mt-6 relative z-30 flex-grow flex flex-col min-h-0 border-t border-white/[0.02] overflow-hidden">
            <div className="max-w-4xl w-full mx-auto px-6 pt-8 flex flex-col shrink-0">
              
              {/* Header Title with Subtitle Course Name */}
              <div className="space-y-1 mb-4">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  {activeChapterData.chapterName}
                </h3>
                <p className="text-xs sm:text-sm font-black text-zinc-400 font-sans tracking-wide uppercase">
                  {course?.title || 'Academic Unit'}
                </p>
              </div>

              {/* Curriculum description - framed editorially */}
              <div className="relative pl-3.5 border-l-2 border-purple-500/30 py-0.5 mb-6">
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-medium line-clamp-2 md:line-clamp-none">
                  {course?.description || 'Learn advanced curriculum methodologies, foundational paradigms, and comprehensive test structures. Engage deeply with expert concepts designed to optimize your academic results and mastery.'}
                </p>
              </div>
            </div>

            {/* Calculate actual visible topics */}
            {(() => {
              const visibleTopics = activeChapterData.topics.filter(t => t.title && t.title.trim() !== '---');
              return (
                <div className="max-w-4xl w-full mx-auto px-6 flex-grow flex flex-col min-h-0 overflow-hidden">
                  
                  {/* Lessons Section Header - STICKY */}
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-900/60 pb-2.5 shrink-0">
                    <h4 className="text-base font-extrabold text-white tracking-tight">
                      Lessons
                    </h4>
                    <span className="text-[9px] font-black text-zinc-500 font-mono uppercase tracking-widest bg-zinc-900/50 px-2 py-0.5 rounded border border-white/[0.01]">
                      {visibleTopics.length} MODULES
                    </span>
                  </div>

                  {/* SCROLLABLE LESSONS CONTAINER - Independent vertical scrolling */}
                  <div className="flex-1 overflow-y-auto pr-1 pb-28 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {visibleTopics.length > 0 ? (
                      visibleTopics.map((topic, index) => {
                        const hasQuiz = !!topic.quiz_questions && topic.quiz_questions.length > 5;
                        const hasTakeaways = !!topic.key_takeaways && topic.key_takeaways.length > 0;
                        const formattedIndex = String(index + 1).padStart(2, '0');

                        return (
                          <button
                            key={topic.id}
                            onClick={() => navigate(`/study/${courseId}/${topic.id}`)}
                            className="w-full text-left bg-zinc-900/25 hover:bg-[#121217] border border-[#1f1f2e]/40 hover:border-purple-500/15 rounded-xl p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 tracking-tight cursor-pointer group shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 pr-4">
                              <div className="w-9 h-9 rounded-lg bg-black/45 border border-[#262638] group-hover:border-purple-500/20 group-hover:bg-purple-950/10 flex items-center justify-center transition-all shrink-0">
                                <BookOpen size={15} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs sm:text-sm text-zinc-200 group-hover:text-white transition-colors truncate sm:whitespace-normal line-clamp-1 leading-snug">
                                  {topic.title}
                                </h5>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-zinc-500 font-mono tracking-wider uppercase">
                                    <Clock size={9} /> 5-10 MIN READ
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-950 border border-zinc-850 text-zinc-550 group-hover:border-purple-500/25 group-hover:text-purple-300 group-hover:shadow-[0_0_8px_rgba(168,85,247,0.08)] transition-all shrink-0">
                              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 text-zinc-650 border border-zinc-900/40 border-dashed rounded-xl bg-zinc-900/5 mt-2">
                        <Star className="mx-auto mb-2 text-zinc-700 animate-spin" size={20} />
                        <p className="text-xs font-semibold">Creating Lessons for Chapter...</p>
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}
            
          </div>

        </div>
      )}
    </div>
  );
}
