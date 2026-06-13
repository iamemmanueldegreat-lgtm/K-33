import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type { Course as CourseType, Topic } from '../types';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingScreen';

// Memory caches across SPA transitions to make navigating to courses/chapters instant
const cachedCourseDetails: Record<string, { course: CourseType; topics: Topic[] }> = {};

export default function Course() {
  const { courseId } = useParams();
  const root = 'courses';
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

  useEffect(() => {
    setCourse(cachedData?.course || null);
    setTopics(cachedData?.topics || []);
    setLoading(!cachedData);
  }, [courseId, cachedData]);

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      const hasCached = !!cachedCourseDetails[courseId];
      if (!hasCached) {
        setLoading(true);
      }
      try {
        const courseDoc = await getDoc(doc(db, root, courseId));
        let cData: CourseType | null = null;
        if (courseDoc.exists()) {
          cData = courseDoc.data() as CourseType;
          cData.id = courseDoc.id;
          setCourse(cData);
        }
        
        const topicsSnapshot = await getDocs(
          collection(db, `${root}/${courseId}/topics`)
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
          try {
            handleFirestoreError(error, OperationType.GET, root + '/' + courseId);
          } catch(e) {}
        }
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  const [searchParams] = useSearchParams();
  const chapterQuery = searchParams.get('chapter');

  // Group topics by chapter name
  const groupedChapters = useMemo(() => {
    const groups: { chapter: string; chapter_order: number; topics: Topic[] }[] = [];
    for (const t of topics) {
      const name = t.chapter || 'Foundations';
      const order = t.chapter_order ?? 999;
      
      // If a 'chapter' query param is present, only include topics for that chapter
      if (chapterQuery && name !== chapterQuery) {
        continue;
      }
      
      let g = groups.find(x => x.chapter === name);
      if (!g) {
        g = { chapter: name, chapter_order: order, topics: [] };
        groups.push(g);
      }
      g.topics.push(t);
    }
    return groups;
  }, [topics, chapterQuery]);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-black font-sans selection:bg-black/10 pb-12">
      {/* Navbar Minimal */}
      <header className="sticky top-0 z-40 bg-[#F4F4F6]/90 backdrop-blur-md pt-5 pb-4 px-5 sm:px-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/library')}
          className="text-black hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
        <span className="font-bold text-[17px] tracking-tight">{chapterQuery ? "Chapter" : "Textbook"}</span>
        <button className="text-black hover:opacity-70 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-5 sm:px-6">
        {loading ? (
          <div className="py-32 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-8 mt-2">
            
            {/* Header Section (Book Info) */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 sm:space-y-1.5 flex-1 pt-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black leading-tight">
                  {chapterQuery ? chapterQuery : (course?.title || 'Untitled Course')}
                </h1>
                {course && <p className="text-sm font-semibold text-black/80">{course?.department || 'General'}</p>}
                {course && <p className="text-sm text-black/50 font-medium">Code: {course?.code || 'N/A'}</p>}
                {course && <p className="text-sm text-black/50 font-medium">{course?.school || 'University'}</p>}
              </div>

              {/* Cover Image Placeholder */}
              <div className="w-20 h-28 sm:w-24 sm:h-32 bg-[#F3E5D8] rounded-md shadow-sm border border-black/5 overflow-hidden flex flex-col shrink-0 relative mt-1">
                 <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-[#E7D0BB] to-transparent opacity-50"></div>
                 <div className="relative z-10 flex-1 p-2.5 flex flex-col">
                    <span className="text-[10px] font-black text-amber-900/80 leading-none uppercase tracking-tighter">
                      {course?.title?.substring(0, 20) || 'COURSE'}
                    </span>
                    <span className="text-[6px] font-bold text-amber-900/60 leading-none uppercase tracking-tighter mt-0.5 max-w-full truncate">
                      {course?.code || 'CODE'}
                    </span>
                 </div>
                 <div className="relative z-10 h-8 mt-auto flex">
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=200')] bg-cover bg-center mix-blend-multiply opacity-50"></div>
                 </div>
              </div>
            </div>

            {/* Curriculum / Solutions List */}
            <div className="space-y-4">
              <h2 className="text-[19px] sm:text-[21px] font-bold tracking-tight text-black">Topics</h2>
              
              <div className="space-y-4">
                {groupedChapters.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <p className="text-black/50 font-medium">No topics available yet.</p>
                  </div>
                ) : (
                  groupedChapters.map((group, chapterIdx) => {
                    const visibleTopics = group.topics.filter(t => t.title && t.title.trim() !== '---');
                    if (visibleTopics.length === 0) return null;

                    return (
                      <div key={group.chapter} className="space-y-3">
                        {!chapterQuery && (
                          <h3 className="text-xs font-bold text-black/40 uppercase tracking-widest mt-6 first:mt-0 mb-1 ml-1">
                            {group.chapter}
                          </h3>
                        )}
                        
                        <div className="flex flex-col gap-2.5">
                          {visibleTopics.map((topic, topicIdx) => (
                            <button
                              key={topic.id}
                              onClick={() => navigate(`/study/${courseId}/${topic.id}`)}
                              className="bg-white rounded-[14px] p-4 sm:p-5 flex items-start text-left shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.04] active:scale-[0.98] transition-transform"
                            >
                              <div className="flex items-start gap-4 w-full">
                                <span className="text-base sm:text-lg font-bold text-black min-w-[20px] pt-px">
                                  {topicIdx + 1}
                                </span>
                                <span className="text-[17px] sm:text-lg text-black/80 font-medium leading-[1.3]">
                                  {topic.title}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
}
