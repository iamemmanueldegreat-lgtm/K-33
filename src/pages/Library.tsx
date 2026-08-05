import { useState, useEffect } from 'react';
import { Search, Star, ArrowUpRight, BookOpen, Layers, Users, Calendar, Plus, ChevronDown, Book, Award, Library as LibraryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Course, Topic } from '../types';
import { LoadingSpinner } from '../components/LoadingScreen';

// The 4 pastel colors, star colors, hand-crafted overlay brush strokes and metadata matching screenshot 2.
const CHAPTER_THEMES = [
  {
    bg: 'bg-[#FFECAA]',
    fill: '#FFECAA',
    border: 'border-[#FFD43B]/60',
    starColor: 'text-[#E8590C]',
    doodleColor: 'stroke-[#E8590C]/10',
    badge: 'Comprehensive Guide'
  },
  {
    bg: 'bg-[#D1EBE3]',
    fill: '#D1EBE3',
    border: 'border-[#38D9A9]/60',
    starColor: 'text-[#099268]',
    doodleColor: 'stroke-[#099268]/10',
    badge: 'Interactive Quiz'
  },
  {
    bg: 'bg-[#E5D4F5]',
    fill: '#E5D4F5',
    border: 'border-[#B197FC]/60',
    starColor: 'text-[#7048E8]',
    doodleColor: 'stroke-[#7048E8]/10',
    badge: 'AI Study Chat'
  },
  {
    bg: 'bg-[#FFD1DF]',
    fill: '#FFD1DF',
    border: 'border-[#FAA2C1]/60',
    starColor: 'text-[#D6336C]',
    doodleColor: 'stroke-[#D6336C]/10',
    badge: 'Practice & Prep'
  }
];

// Memory caches across SPA transitions to make navigating back and forth instant
const globalCoursesCacheByUserId: Record<string, Course[]> = {};
const lastSelectedCourseIdByUserId: Record<string, string> = {};

export default function Library() {
  const { user } = useAuth();
  const selectedCurriculum = 'School Curriculum';
  const root = 'courses';
  const userId = user?.id || 'anonymous';

  // Synchronously retrieve cached courses from memory or localStorage
  const cached = (() => {
    if (globalCoursesCacheByUserId[userId]) {
      return globalCoursesCacheByUserId[userId];
    }
    try {
      const stored = localStorage.getItem(`courses_cache_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Course[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          globalCoursesCacheByUserId[userId] = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse courses cache from localStorage', e);
    }
    return null;
  })();

  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>(cached || []);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(() => {
    if (cached && cached.length > 0) {
      const lastId = lastSelectedCourseIdByUserId[userId];
      const match = cached.find(c => c.id === lastId);
      return match || cached[0];
    }
    return null;
  });
  const [loading, setLoading] = useState(!cached);
  const navigate = useNavigate();

  useEffect(() => {
    const memCache = globalCoursesCacheByUserId[userId];
    if (memCache && memCache.length > 0) {
      setCourses(memCache);
      const lastId = lastSelectedCourseIdByUserId[userId];
      setSelectedCourse(memCache.find(c => c.id === lastId) || memCache[0] || null);
    } else {
      setCourses([]);
      setSelectedCourse(null);
    }
  }, [userId]);

  // Synchronously keep selectedCourse valid
  useEffect(() => {
    if (courses.length > 0 && selectedCourse && !courses.find(c => c.id === selectedCourse.id)) {
        // Just clear or adjust if selected course no longer in list
        // Typically not strictly needed if we don't have secondary filters like semester anymore
    }
  }, [courses, userId]);

  useEffect(() => {
    if (user) {
      // If we have cached copies, do a silent background refresh without loading skeleton
      const showLoading = !cached || cached.length === 0;
      fetchCourses(showLoading);
    }
  }, [user, userId]);

  const fetchCourses = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const q = query(collection(db, root));
      const querySnapshot = await getDocs(q);
      
      let coursesData = querySnapshot.docs.map((docSnapshot) => {
        const course = docSnapshot.data() as Course;
        course.id = docSnapshot.id;
        return course;
      });

      const departments = [user?.department, 'General'].filter((v, i, a) => v && a.indexOf(v) === i);
      coursesData = coursesData.filter(c => {
        return c.school === user?.school &&
          departments.includes(c.department) &&
          (c.level?.replace(/\s+/g, '') === user?.level?.replace(/\s+/g, '') || c.level === 'All Levels' || !c.level);
      });
      
      const coursesPromises = coursesData.map(async (course) => {
        const topicsQuery = query(collection(db, `${root}/${course.id}/topics`));
        const topicsSnapshot = await getDocs(topicsQuery);
        const topics: Topic[] = [];
        topicsSnapshot.forEach(topicDoc => {
          const topic = topicDoc.data() as Topic;
          topic.id = topicDoc.id;
          topics.push(topic);
        });
        
        course.topics = topics;
        return course;
      });
      
      const finalCourses = await Promise.all(coursesPromises);
      
      // Update caches
      globalCoursesCacheByUserId[userId] = finalCourses;
      try {
        localStorage.setItem(`courses_cache_${userId}`, JSON.stringify(finalCourses));
      } catch (e) {
        console.warn('Storage quota exceeded or disabled', e);
      }

      setCourses(finalCourses);
      
      // Keep previously selected course active if possible, otherwise select first available
      setSelectedCourse((prev) => {
        if (finalCourses.length === 0) return null;
        const currentActiveId = prev?.id || lastSelectedCourseIdByUserId[userId];
        const match = finalCourses.find(c => c.id === currentActiveId);
        const next = match || finalCourses[0];
        if (next) {
          lastSelectedCourseIdByUserId[userId] = next.id;
        }
        return next;
      });
    } catch (error) {
      // Gracefully handle/suppress errors if a cached copy already exists to keep page highly available
      if (cached && cached.length > 0) {
        console.warn('Failed to fetch courses in background; serving cached version.', error);
      } else {
        try {
          handleFirestoreError(error, OperationType.LIST, 'courses');
        } catch(e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract chapters or fallback to awesome templates
  const getCourseChapters = (course: Course | null) => {
    if (!course) return [];
    
    // Group course.topics by chapter, preserving order
    const chaptersMap: Record<string, Topic[]> = {};
    if (course.topics && course.topics.length > 0) {
      course.topics.forEach(topic => {
        const chapterName = topic.chapter || 'Foundations';
        if (!chaptersMap[chapterName]) {
          chaptersMap[chapterName] = [];
        }
        chaptersMap[chapterName].push(topic);
      });
    }

    const chaptersList = Object.keys(chaptersMap).map((name, idx) => {
      return {
        name,
        order: chaptersMap[name][0]?.chapter_order ?? (idx + 1),
        topics: chaptersMap[name].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      };
    });

    chaptersList.sort((a, b) => a.order - b.order);

    return chaptersList;
  };

  let curriculumCourses = courses;

  const filteredCourses = curriculumCourses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CHAPTER_STAMPS = [Layers, Award, BookOpen, Calendar];

  const getActiveChapters = () => {
    if (selectedCourse) {
      return getCourseChapters(selectedCourse).map((ch, idx) => ({
        ...ch,
        courseCode: selectedCourse.code,
        courseTitle: selectedCourse.title,
        courseId: selectedCourse.id,
        index: idx
      }));
    } else {
      const combined: Array<{ name: string; order: number; topics: Topic[]; courseCode: string; courseTitle: string; courseId: string; index: number }> = [];
      let globalIdx = 0;
      filteredCourses.forEach(c => {
        const chaptersList = getCourseChapters(c);
        chaptersList.forEach(ch => {
          combined.push({
            ...ch,
            courseCode: c.code,
            courseTitle: c.title,
            courseId: c.id,
            index: globalIdx++
          });
        });
      });
      return combined;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-16 px-4 pt-4">
      {/* Your Courses Head and Library button */}
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-neutral-900 dark:text-neutral-50 animate-fade-in">
          Your Courses
        </h1>
        <button 
          onClick={() => {
            const el = document.getElementById('librarySearchInput');
            if (el) el.focus();
          }}
          className="w-12 h-12 rounded-[20px] bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-zinc-850 active:scale-95 transition-all shadow-sm"
        >
          <LibraryIcon size={22} className="text-neutral-900 dark:text-white stroke-[2]" />
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="relative group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors" />
        <input 
          id="librarySearchInput"
          type="text" 
          placeholder="Search course codes or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 outline-none focus:border-zinc-300 dark:focus:border-zinc-700 transition-all text-xs font-semibold"
        />
      </div>

      {/* Title Display (Replacing Semester selector) and Grid Layout Toggler */}
      <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          <div className="relative inline-block w-full">
            <h2 className="text-sm font-black font-sans tracking-tight text-neutral-800 dark:text-neutral-100 uppercase truncate px-2 w-full">
              {selectedCourse ? selectedCourse.title : "All Courses"}
            </h2>
          </div>
        </div>

        {/* Layout indicator */}
        <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-650">
          <button className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button className="p-2 sm:p-2.5 rounded-xl text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontally scrolling pill buttons for com 111, MTH 111 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-2 px-2 whitespace-nowrap scroll-smooth">
         <button
          onClick={() => {
            setSelectedCourse(null);
          }}
          className={`px-5 py-2.5 rounded-[22px] text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all border ${
            selectedCourse === null 
              ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105' 
              : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
          }`}
        >
          #All
        </button>

        {filteredCourses.map(course => {
          const isSelected = selectedCourse?.id === course.id;
          return (
            <button
              key={course.id}
              onClick={() => {
                setSelectedCourse(course);
                lastSelectedCourseIdByUserId[userId] = course.id;
              }}
              className={`
                px-5 py-2.5 rounded-[22px] text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all border
                ${isSelected 
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105 font-black' 
                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                }
              `}
            >
              #{course.code.toUpperCase()}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-32 flex items-center justify-center w-full">
           <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {selectedCourse === null ? (
            filteredCourses.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-min mt-2 pb-12">
                {filteredCourses.map((course, index) => {
                  const theme = CHAPTER_THEMES[index % CHAPTER_THEMES.length];
                  const StampIcon = CHAPTER_STAMPS[index % CHAPTER_STAMPS.length];
                  
                  return (
                    <motion.div
                      key={`course-${course.id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => {
                        setSelectedCourse(course);
                        lastSelectedCourseIdByUserId[userId] = course.id;
                      }}
                      className={`
                        relative cursor-pointer group h-52 sm:h-60 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] 
                        flex flex-col justify-between overflow-hidden border border-black/5 dark:border-none shadow-sm
                        hover:scale-[1.02] hover:shadow-lg transition-all duration-300
                        ${theme.bg}
                      `}
                    >
                      <div className="absolute inset-x-4 top-4 bottom-16 opacity-30 pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 100 135" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 20,25 C 60,15 75,35 45,55 C 15,75 80,75 50,105" className={theme.doodleColor} />
                        </svg>
                      </div>

                      <div className="flex justify-between items-start w-full relative z-10">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Star className={`w-4 h-4 ${theme.starColor} fill-current`} />
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-1.5 relative z-10 flex-1 flex flex-col justify-center select-none pt-2">
                        <span className="text-[12px] sm:text-[14px] font-extrabold tracking-widest uppercase block font-mono bg-white/70 text-black px-3.5 py-1.5 rounded-[12px] w-max shadow-sm border border-black/5">
                          {course.code}
                        </span>
                        <h3 className="text-[16px] sm:text-[22px] font-black text-black leading-tight font-sans tracking-tight line-clamp-3 transition-colors mt-2">
                          {course.title}
                        </h3>
                        <p className="text-[10px] sm:text-[12px] font-bold leading-normal text-neutral-800/70 line-clamp-1 truncate mt-1">
                          {course.department} • {course.level}
                        </p>
                      </div>

                      <div className="flex items-center border-t border-black/5 pt-1.5 sm:pt-2 relative z-10 mt-auto justify-between">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/5 flex items-center justify-center text-[#111827]/70">
                          <StampIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                        <span className="text-[10px] font-bold text-neutral-800">View Chapters →</span>
                      </div>

                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-10 sm:h-12 flex items-center pointer-events-none z-10 opacity-70">
                        <svg className="absolute inset-0 w-full h-full text-white dark:text-[#0B0F19] fill-current" viewBox="0 0 32 80" preserveAspectRatio="none">
                          <path d="M 32,0 C 32,18 14,18 14,40 C 14,62 32,62 32,80 Z" />
                        </svg>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-neutral-50 dark:bg-zinc-950 rounded-[32px] border border-dashed border-neutral-300 dark:border-zinc-800">
                <BookOpen size={44} className="mx-auto mb-4 text-zinc-400" />
                <p className="font-bold text-base">No courses found</p>
                <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto">
                  No courses match your search or profile settings.
                </p>
              </div>
            )
          ) : (
            getActiveChapters().length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-min mt-2 pb-12">
                {getActiveChapters().map((chapter, index) => {
                  const theme = CHAPTER_THEMES[index % CHAPTER_THEMES.length];
                  const StampIcon = CHAPTER_STAMPS[index % CHAPTER_STAMPS.length];
                  
                  const topicsCount = chapter.topics?.length ?? 0;
                  const excerpt = topicsCount > 0 
                    ? `Master all ${topicsCount} high-yield topics, complete diagnostic practice quizzes, and connect with real-time AI tutors.`
                    : `Review core chapter definitions, summary cheat sheets, custom practice quizzes, and instant AI tutor answers.`;

                  return (
                    <motion.div
                      key={`${chapter.courseId}-${chapter.name}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => navigate(`/course/${chapter.courseId}?chapter=${encodeURIComponent(chapter.name)}`)}
                      className={`
                        relative cursor-pointer group h-52 sm:h-60 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] 
                        flex flex-col justify-between overflow-hidden border border-black/5 dark:border-none shadow-sm
                        hover:scale-[1.02] hover:shadow-lg transition-all duration-300
                        ${theme.bg}
                      `}
                    >
                      {/* Doodle stroke overlay matching screenshot 2 */}
                      <div className="absolute inset-x-4 top-4 bottom-16 opacity-30 pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 100 135" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 20,25 C 60,15 75,35 45,55 C 15,75 80,75 50,105" className={theme.doodleColor} />
                        </svg>
                      </div>

                      {/* Top part: Star icon inside rounded bubble white container on the left */}
                      <div className="flex justify-between items-start w-full relative z-10">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Star className={`w-4 h-4 ${theme.starColor} fill-current`} />
                        </div>

                        {/* Course code label indicators if inside #All view */}
                        {selectedCourse === null && (
                          <span className="text-[9px] font-black font-mono tracking-wider bg-black/10 text-neutral-900 px-2 py-0.5 rounded-full uppercase max-w-[120px] truncate overflow-hidden">
                            {chapter.courseCode}
                          </span>
                        )}
                      </div>

                      {/* Middle part: Title of chapter and subtitle */}
                      <div className="space-y-1 sm:space-y-1.5 relative z-10 flex-1 flex flex-col justify-center select-none pt-2">
                        <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-black/40 block font-mono">
                          Chapter {chapter.order ?? (index + 1)}
                        </span>
                        <h3 className="text-[14px] sm:text-[20px] font-black text-black leading-tight font-sans tracking-tight line-clamp-2 transition-colors">
                          {chapter.name}
                        </h3>
                        <p className="text-[9px] sm:text-[12px] font-semibold leading-normal text-neutral-800/60 line-clamp-2">
                          {excerpt}
                        </p>
                      </div>

                      {/* Lower part: stamp icon only */}
                      <div className="flex items-center border-t border-black/5 pt-1.5 sm:pt-2 relative z-10 mt-auto">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/5 flex items-center justify-center text-[#111827]/70">
                          <StampIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                      </div>

                      {/* Bite notch cutout decorative elements on bottom-right or top-right as from Screenshot 2 */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-10 sm:h-12 flex items-center pointer-events-none z-10 opacity-70">
                        <svg className="absolute inset-0 w-full h-full text-white dark:text-[#0B0F19] fill-current" viewBox="0 0 32 80" preserveAspectRatio="none">
                          <path d="M 32,0 C 32,18 14,18 14,40 C 14,62 32,62 32,80 Z" />
                        </svg>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-neutral-50 dark:bg-zinc-950 rounded-[32px] border border-dashed border-neutral-300 dark:border-zinc-800">
                <BookOpen size={44} className="mx-auto mb-4 text-zinc-400" />
                <p className="font-bold text-base">No chapters found</p>
                <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto">
                  No courses are registered in your profile. You can generate study paths or search for courses using the plus button.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
