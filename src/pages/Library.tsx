import { useState, useEffect } from 'react';
import { Search, Star, BookOpen, Layers, Award, Calendar, Library as LibraryIcon, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Course, Topic } from '../types';
import { LoadingSpinner } from '../components/LoadingScreen';
import { isPolytechnic } from '../lib/constants';

const COURSE_THEMES = [
  { bg: 'bg-[#FFECAA]', starColor: 'text-[#E8590C]', doodleColor: 'stroke-[#E8590C]/10' },
  { bg: 'bg-[#D1EBE3]', starColor: 'text-[#099268]', doodleColor: 'stroke-[#099268]/10' },
  { bg: 'bg-[#E5D4F5]', starColor: 'text-[#7048E8]', doodleColor: 'stroke-[#7048E8]/10' },
  { bg: 'bg-[#FFD1DF]', starColor: 'text-[#D6336C]', doodleColor: 'stroke-[#D6336C]/10' },
];
const CHAPTER_STAMPS = [Layers, Award, BookOpen, Calendar];

// In-memory cache keyed by user+dept+level+semester
const globalCoursesCache: Record<string, Course[]> = {};

export default function Library() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [semester, setSemester] = useState<1 | 2>(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isPoly = isPolytechnic(user?.school || '');
  const cacheKey = `${user?.id}-${user?.department}-${user?.level}-${semester}`;

  useEffect(() => {
    if (user) {
      const cached = globalCoursesCache[cacheKey];
      if (cached) {
        setCourses(cached);
        setLoading(false);
        // Silent background refresh
        fetchCoursesFromDb(false);
      } else {
        fetchCoursesFromDb(true);
      }
    }
  }, [user?.id, user?.department, user?.level, semester]);

  const fetchCoursesFromDb = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      let all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));

      all = all.filter(c => {
        const deptMatch = c.department === user?.department || c.department === 'General';
        const levelMatch =
          c.level?.replace(/\s+/g, '') === user?.level?.replace(/\s+/g, '') ||
          c.level === 'All Levels' ||
          !c.level;
        const schoolMatch =
          c.school === user?.school ||
          (isPoly && c.school === 'NBTE') ||
          (!isPoly && c.school === 'CCMAS');
        // Courses without a semester field (legacy) show in all semesters
        const semesterMatch = !c.semester || c.semester === semester;
        return deptMatch && levelMatch && schoolMatch && semesterMatch;
      });

      // Fetch topics for each course in parallel
      const withTopics = await Promise.all(
        all.map(async (course) => {
          const topicsSnap = await getDocs(collection(db, `courses/${course.id}/topics`));
          course.topics = topicsSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Topic))
            .sort((a, b) => ((a.chapter_order ?? 0) * 1000 + (a.order ?? 0)) - ((b.chapter_order ?? 0) * 1000 + (b.order ?? 0)));
          return course;
        })
      );

      globalCoursesCache[cacheKey] = withTopics;
      setCourses(withTopics);
    } catch (e) {
      console.error('Error fetching courses:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(
    c =>
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-16 px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-neutral-900 dark:text-neutral-50 animate-fade-in truncate">
            Your Curriculum
          </h1>
          <p className="text-xs font-semibold text-zinc-500 mt-1 truncate">
            {user?.department} &middot; {user?.level} &middot;{' '}
            {isPoly ? 'Polytechnic (NBTE)' : 'University'}
          </p>
        </div>
        <button
          onClick={() => document.getElementById('librarySearchInput')?.focus()}
          className="ml-3 w-12 h-12 rounded-[20px] bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-zinc-850 active:scale-95 transition-all shadow-sm"
        >
          <LibraryIcon size={22} className="text-neutral-900 dark:text-white stroke-[2]" />
        </button>
      </div>

      {/* Semester Tabs */}
      <div className="flex gap-2">
        {([1, 2] as const).map(s => (
          <button
            key={s}
            onClick={() => setSemester(s)}
            className={`flex-1 py-3 rounded-[18px] text-xs font-black tracking-wider uppercase transition-all border ${
              semester === s
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md'
                : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            {s === 1 ? '1st Semester' : '2nd Semester'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative group">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors"
        />
        <input
          id="librarySearchInput"
          type="text"
          placeholder={
            'Search course codes or titles...'
          }
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 outline-none focus:border-zinc-300 dark:focus:border-zinc-700 transition-all text-xs font-semibold"
        />
      </div>

      {/* Course code pills — list view */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-2 px-2 whitespace-nowrap scroll-smooth">
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => navigate(`/course/${course.id}`)}
              className="px-5 py-2.5 rounded-[22px] text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all border bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              #{course.code.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-32 flex items-center justify-center w-full">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {/* Course grid */}
          {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-min mt-2 pb-12">
                {filteredCourses.map((course, index) => {
                  const theme = COURSE_THEMES[index % COURSE_THEMES.length];
                  const StampIcon = CHAPTER_STAMPS[index % CHAPTER_STAMPS.length];
                  const topicCount = course.topics?.length ?? 0;
                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => navigate(`/course/${course.id}`)}
                      className={`relative cursor-pointer group h-52 sm:h-60 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] flex flex-col justify-between overflow-hidden border border-black/5 dark:border-none shadow-sm hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ${theme.bg}`}
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
                        {course.credit_units != null && (
                          <span className="text-[9px] font-black font-mono tracking-wider bg-black/10 text-neutral-900 px-2 py-0.5 rounded-full uppercase">
                            {course.credit_units} units
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 sm:space-y-1.5 relative z-10 flex-1 flex flex-col justify-center select-none pt-2">
                        <span className="text-[12px] sm:text-[14px] font-extrabold tracking-widest uppercase block font-mono bg-white/70 text-black px-3.5 py-1.5 rounded-[12px] w-max shadow-sm border border-black/5">
                          {course.code}
                        </span>
                        <h3 className="text-[16px] sm:text-[22px] font-black text-black leading-tight font-sans tracking-tight line-clamp-3 transition-colors mt-2">
                          {course.title}
                        </h3>
                        <p className="text-[10px] sm:text-[12px] font-bold leading-normal text-neutral-800/70 line-clamp-1 mt-1">
                          {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
                        </p>
                      </div>
                      <div className="flex items-center border-t border-black/5 pt-1.5 sm:pt-2 relative z-10 mt-auto justify-between">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/5 flex items-center justify-center text-[#111827]/70">
                          <StampIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                        <span className="text-[10px] font-bold text-neutral-800">View Chapters →</span>
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-10 sm:h-12 pointer-events-none z-10 opacity-70">
                        <svg className="absolute inset-0 w-full h-full text-white dark:text-[#0B0F19] fill-current" viewBox="0 0 32 80" preserveAspectRatio="none">
                          <path d="M 32,0 C 32,18 14,18 14,40 C 14,62 32,62 32,80 Z" />
                        </svg>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-neutral-50 dark:bg-zinc-950 rounded-[32px] border border-dashed border-neutral-300 dark:border-zinc-800">
                <GraduationCap size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
                <p className="font-black text-lg text-zinc-700 dark:text-zinc-300">
                  No courses yet for {semester === 1 ? '1st' : '2nd'} Semester
                </p>
                <p className="text-xs text-zinc-500 mt-2 max-w-xs mx-auto px-4">
                  The curriculum for {user?.department} {user?.level} hasn't been added yet.
                  Check back soon!
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
