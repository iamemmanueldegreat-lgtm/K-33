import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Book, Zap, Clock, Trophy, ChevronRight, PlayCircle, BarChart2, MessageSquare, BookOpen, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, limit, getDocs, getDoc, doc, orderBy } from 'firebase/firestore';
import ThemeToggle from '../components/ThemeToggle';
import type { Course, Topic } from '../types';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [continueLearning, setContinueLearning] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Create promises for both queries so they run in parallel
      const recentViewsPromise = getDocs(query(
        collection(db, `users/${user?.id}/recent_views`),
        orderBy('lastViewedAt', 'desc'),
        limit(5)
      ));

      let q = query(collection(db, 'courses'), limit(10));
      if (!user?.is_admin) {
        // Fetch courses for the student's school that match their department OR are 'General'
        const departments = [user?.department, 'General'].filter((v, i, a) => v && a.indexOf(v) === i);
        q = query(
          collection(db, 'courses'),
          where('school', '==', user?.school),
          where('department', 'in', departments),
          limit(20)
        );
      }
      const coursesSnapshotPromise = getDocs(q);

      const [recentViewsSnapshot, coursesSnapshot] = await Promise.all([recentViewsPromise, coursesSnapshotPromise]);
      
      // Fetch course details and topics in parallel for continue learning
      const continueLearningPromises = recentViewsSnapshot.docs.map(async (viewDoc) => {
        const viewData = viewDoc.data();
        const courseRef = doc(db, 'courses', viewData.courseId);
        const courseDoc = await getDoc(courseRef);
        
        if (courseDoc.exists()) {
          const course = { id: courseDoc.id, ...courseDoc.data() } as Course;
          const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/topics`), limit(1)));
          course.topics = topicsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Topic));
          return course;
        }
        return null;
      });

      const continueLearningData = (await Promise.all(continueLearningPromises)).filter(Boolean) as Course[];
      setContinueLearning(continueLearningData);

      // Filter by level in memory to maintain flexibility without complex Firestore composite indexes
      let coursesData: Course[] = coursesSnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      } as Course));

      if (!user?.is_admin) {
        coursesData = coursesData.filter(c => 
          c.level === user?.level || c.level === 'All Levels' || !c.level
        );
      }
      
      setRecentCourses(coursesData.slice(0, 10));
    } catch (error) {
      console.error("Error fetching home data:", error);
      handleFirestoreError(error, OperationType.LIST, 'courses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 pt-2">
      
      {/* Header Greeting */}
      <div className="px-1 pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface border border-border flex-shrink-0 relative">
             {user?.avatar_url ? (
               <img src={user.avatar_url} alt={user.full_name || 'Profile'} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-xl bg-primary/10 text-primary font-bold">
                  {user?.full_name?.charAt(0) || 'M'}
               </div>
             )}
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text leading-tight">
              Hi, {user?.full_name?.split(' ')[0] || 'Michael'}
            </h1>
            <p className="text-sm font-medium text-muted">
              Welcome Back
            </p>
          </div>
        </div>
        
        <ThemeToggle />
      </div>

      {/* Daily Streak Banner */}
      <div 
        onClick={() => navigate('/profile')}
        className="bg-surface dark:bg-dark-surface rounded-[24px] p-4 shadow-sm border border-border dark:border-dark-border cursor-pointer hover:shadow-md transition-all group lg:mb-8"
      >
        {/* Header: Title and Total Days */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <h3 className="font-semibold text-text dark:text-dark-text text-sm tracking-tight">Daily Streak</h3>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            {user?.streak || 0} days
          </span>
        </div>

        {/* Days Row */}
        <div className="flex justify-between items-center gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
            const today = new Date();
            const todayIdx = (today.getDay() + 6) % 7; // Mon=0, Sun=6
            const isCompleted = idx <= todayIdx && (todayIdx - idx) < (user?.streak || 0);
            
            return (
              <div key={day} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted 
                      ? "bg-primary/10 dark:bg-primary/20 text-primary scale-105 shadow-sm" 
                      : "bg-gray-100 dark:bg-gray-800/80 text-transparent"
                  }`}
                >
                  {isCompleted && (
                    <svg className="w-5 h-5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {!isCompleted && (
                    <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold tracking-wide uppercase ${
                  isCompleted ? "text-primary dark:text-primary" : "text-gray-500 dark:text-gray-400"
                }`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Action Bento Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top Full Width Card */}
        <div 
          onClick={() => navigate('/practice')}
          className="col-span-2 bg-gradient-to-br from-[#3B82F6] to-[#6366F1] text-white rounded-[24px] p-5 relative overflow-hidden cursor-pointer shadow-sm md:min-h-[160px] min-h-[140px] flex flex-col justify-center group"
        >
          <div className="relative z-10 w-2/3">
            <p className="text-[10px] font-medium opacity-80 mb-1 outline-none">Test your knowledge</p>
            <h3 className="text-xl font-bold leading-tight group-hover:translate-x-1 transition-transform">Practice Zone</h3>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/2 flex items-center justify-end pr-4 text-white/5 group-hover:text-white/10 transition-colors">
            <MessageSquare size={100} strokeWidth={1} className="translate-y-4" />
          </div>
        </div>

        {/* Bottom Left Card */}
        <div onClick={() => navigate('/library')} className="bg-surface border border-border text-text rounded-[24px] p-4 relative overflow-hidden cursor-pointer shadow-sm min-h-[160px] flex flex-col justify-between group hover:border-primary/30 transition-colors">
          <div className="relative z-10">
            <p className="text-[10px] font-medium text-muted mb-1">{recentCourses.length || '0'} active</p>
            <h3 className="text-lg font-bold leading-tight group-hover:translate-x-1 transition-transform">My<br/>Courses</h3>
          </div>
          <BookOpen size={64} className="absolute bottom-2 right-2 text-border group-hover:scale-110 transition-transform" />
        </div>

        {/* Bottom Right Card */}
        <div onClick={() => navigate('/notes')} className="bg-purple-50 dark:bg-[#1F1A2E] border border-purple-100 dark:border-[#1F1A2E] text-text rounded-[24px] p-4 relative overflow-hidden cursor-pointer shadow-sm min-h-[160px] flex flex-col justify-between group hover:border-purple-200 dark:hover:border-[#2D2640] transition-colors">
          <div className="relative z-10">
            <p className="text-[10px] font-medium text-purple-600/70 dark:text-purple-300/50 mb-1">Jot down your</p>
            <h3 className="text-lg font-bold leading-tight group-hover:translate-x-1 transition-transform text-purple-900 dark:text-purple-100">Notes</h3>
          </div>
          <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-200/50 dark:bg-purple-900/20 rounded-full blur-xl group-hover:bg-purple-300/50 dark:group-hover:bg-purple-900/30 transition-colors"></div>
          <FileText size={64} className="absolute bottom-2 right-2 text-purple-200 dark:text-purple-900/40 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* Enrolled Courses Row */}
      <div 
        onClick={() => navigate('/library')}
        className="bg-surface rounded-[20px] p-4 flex items-center gap-4 shadow-sm border border-border cursor-pointer group hover:border-primary/30 transition-colors"
      >
        <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center overflow-hidden transition-all group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(var(--primary),0.2)]">
          <img 
            src="https://images.unsplash.com/photo-1544716278-e513176f20b5?auto=format&fit=crop&q=80&w=100&h=100" 
            alt="Courses" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Your enrolled courses</h4>
          <p className="text-[11px] text-muted font-medium mt-0.5">Total {recentCourses.length || '0'} courses</p>
        </div>
        <ChevronRight size={20} className="text-muted group-hover:text-primary transition-colors" />
      </div>

      {/* Horizontal Scroll Section: Free Animated Lesson */}
      <section className="space-y-3">
        <h3 className="font-bold text-sm px-1">Continue Learning</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar px-1">
           {loading ? (
             <>
               <div className="min-w-[200px] h-[180px] bg-surface rounded-[24px] animate-pulse snap-start"></div>
               <div className="min-w-[200px] h-[180px] bg-surface rounded-[24px] animate-pulse snap-start"></div>
             </>
           ) : continueLearning.length > 0 ? (
             continueLearning.map((course, idx) => {
               const topic = course.topics?.[0]; // Show the first topic or just the course
               if (!topic) return null;
               return (
                   <div 
                   key={`${course.id}-${topic.id}`}
                   onClick={() => navigate(`/study/${course.id}/${topic.id}`)}
                   className="min-w-[240px] bg-surface rounded-[24px] overflow-hidden shadow-sm border border-border cursor-pointer snap-start flex flex-col group hover:border-primary/30 transition-colors"
                 >
                    {/* Top half - AI Illustration or abstract background */}
                    <div className="h-[120px] bg-background border-b border-border flex items-center justify-center relative overflow-hidden">
                      <img 
                        src={`https://picsum.photos/seed/course-${course.id}/600/400`} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                          <div className="w-12 h-12 bg-white/90 text-primary rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                              <PlayCircle size={24} className="ml-0.5" />
                          </div>
                      </div>
                    </div>
                   {/* Bottom half - Content focus */}
                   <div className="p-4 flex-1 flex flex-col">
                     <div className="flex items-center gap-1.5 mb-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                       <p className="text-[11px] text-muted font-bold tracking-wide">{course.title}</p>
                     </div>
                     <h4 className="text-sm font-bold leading-tight">{topic.title}</h4>
                   </div>
                 </div>
               );
             })
           ) : (
             <div className="min-w-[240px] h-[180px] bg-surface rounded-[24px] p-6 text-center border-dashed border-2 border-border text-muted text-sm flex items-center justify-center flex-col">
               <PlayCircle size={32} className="mb-2 opacity-50" />
               <p className="font-bold">No progress yet</p>
               <p className="text-[10px] mt-1">Courses you view will appear here.</p>
             </div>
           )}
        </div>
      </section>

      {/* Section: Available Courses */}
      <section className="space-y-3 pb-8">
        <h3 className="font-bold text-sm px-1">My Courses</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar px-1">
           {loading ? (
              <>
               <div className="min-w-[220px] h-[200px] bg-surface rounded-[24px] animate-pulse snap-start"></div>
               <div className="min-w-[220px] h-[200px] bg-surface rounded-[24px] animate-pulse snap-start"></div>
             </>
           ) : recentCourses.length > 0 ? (
             recentCourses.map(course => (
                 <div 
                   key={course.id}
                   onClick={() => navigate('/library')}
                   className="min-w-[240px] bg-surface rounded-[24px] overflow-hidden shadow-sm border border-border cursor-pointer snap-start flex flex-col group hover:border-primary/30 transition-colors"
                 >
                   <div className="h-[100px] bg-background border-b border-border flex items-center justify-center relative overflow-hidden text-muted/30">
                       <img 
                         src={`https://picsum.photos/seed/thumb-${course.id}/400/300`} 
                         alt={course.title} 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100" 
                         referrerPolicy="no-referrer"
                       />
                       <div className="absolute inset-0 bg-black/5"></div>
                   </div>
                   <div className="p-4 flex-1 flex flex-col justify-center">
                     <h4 className="text-sm font-bold leading-tight line-clamp-1 mb-1.5">{course.title}</h4>
                     <p className="text-[11px] text-muted font-medium flex items-center gap-1">
                        For {user?.level} <span className="text-border">|</span> <span className="text-muted font-bold">{course.code}</span>
                     </p>
                   </div>
                 </div>
             ))
           ) : (
             <div className="min-w-[240px] h-[200px] bg-surface rounded-[24px] p-6 text-center border-dashed border-2 border-border text-muted text-sm flex flex-col items-center justify-center">
               <Book size={32} className="mb-2 opacity-50" />
               No courses available for your department yet.
             </div>
           )}
        </div>
      </section>

    </div>
  );
}
