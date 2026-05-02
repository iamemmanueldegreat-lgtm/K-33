import { useState, useEffect } from 'react';
import { Search, BookOpen, ChevronRight, Wand2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../App';
import type { Course, Topic } from '../types';
import { generateStudyContent } from '../lib/gemini';
import toast from 'react-hot-toast';

export default function Library() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'courses'));
      
      if (!user?.is_admin) {
        q = query(
          collection(db, 'courses'),
          where('school', '==', user?.school),
          where('department', '==', user?.department),
          where('level', '==', user?.level)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      const coursesPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const course = docSnapshot.data() as Course;
        course.id = docSnapshot.id;
        
        const topicsQuery = query(collection(db, `courses/${course.id}/topics`));
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
      
      const coursesData = await Promise.all(coursesPromises);
      setCourses(coursesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async (e: React.MouseEvent, course: Course, topic: Topic) => {
    e.stopPropagation();
    if (generatingTopicId) return;
    
    setGeneratingTopicId(topic.id);
    try {
      toast.success('Generating topic content...');
      const text = await generateStudyContent(topic.title, course.title, course.level);
      
      await updateDoc(doc(db, `courses/${course.id}/topics`, topic.id), {
        content: text
      });
      
      toast.success('Generated successfully!');
      
      // Update local state
      setCourses(prev => prev.map(c => {
        if (c.id === course.id) {
          return {
            ...c,
            topics: c.topics.map(t => t.id === topic.id ? { ...t, content: text } : t)
          };
        }
        return c;
      }));
    } catch (error) {
      toast.error('Failed to generate content');
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}/topics/${topic.id}`);
    } finally {
      setGeneratingTopicId(null);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header>
        <span className="badge-blue">Academic Resources</span>
        <h2 className="text-3xl font-bold tracking-tight mt-2">Course Library</h2>
        <p className="text-muted text-sm mt-1">Master your curriculum for {user?.department} - {user?.level}</p>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search courses or codes..." 
          className="input-field pl-12"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
            <div className="h-20 bg-surface animate-pulse rounded-[24px]"></div>
            <div className="h-20 bg-surface animate-pulse rounded-[24px]"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCourses.map((course) => (
            <div key={course.id} className="card-bento p-0 overflow-hidden group">
              <button 
                onClick={() => setSelectedCourse(selectedCourse?.id === course.id ? null : course)}
                className="w-full p-5 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 overflow-hidden">
                    {course.thumbnail ? (
                      <img 
                        src={course.thumbnail} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <BookOpen size={24} />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-0.5">{course.code}</p>
                    <h4 className="font-bold text-lg leading-tight">{course.title}</h4>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: selectedCourse?.id === course.id ? 90 : 0 }}
                  className="p-2 rounded-lg bg-background border border-border"
                >
                  <ChevronRight size={18} className="text-muted" />
                </motion.div>
              </button>

              <AnimatePresence>
                {selectedCourse?.id === course.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-background/50 border-t border-border"
                  >
                    <div className="p-5 space-y-3">
                      <p className="text-xs text-muted leading-relaxed">{course.description}</p>
                      <div className="grid grid-cols-1 gap-2 pt-2">
                      {course.topics && course.topics.map((topic) => (
                        <div key={topic.id} className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/study/${course.id}/${topic.id}`)}
                            className="flex-1 p-4 rounded-xl bg-surface border border-border flex items-center justify-between hover:border-primary hover:shadow-sm transition-all group/topic"
                          >
                            <span className="text-sm font-bold">{topic.title}</span>
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover/topic:opacity-100 transition-all">
                              <ChevronRight size={14} />
                            </div>
                          </button>
                          {user?.is_admin && (
                            <button
                              onClick={(e) => handleGenerateContent(e, course, topic)}
                              disabled={generatingTopicId === topic.id}
                              className={`p-4 rounded-xl border transition-all flex items-center justify-center min-w-[56px]
                                ${topic.content 
                                  ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' 
                                  : 'bg-surface border-border text-primary hover:border-primary'}
                              `}
                              title={topic.content ? "Regenerate Content" : "Generate Content"}
                            >
                              {generatingTopicId === topic.id ? (
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : topic.content ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <Wand2 size={18} />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                      {(!course.topics || course.topics.length === 0) && (
                        <p className="text-sm text-muted text-center py-4">No topics found for this course.</p>
                      )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {filteredCourses.length === 0 && (
            <div className="text-center py-20 opacity-50 card-bento !bg-transparent border-dashed">
              <BookOpen size={48} className="mx-auto mb-4 text-muted" />
              <p className="font-bold">No courses found</p>
              <p className="text-sm border-t border-border mt-2 pt-2">Check back later or ask an admin to add courses for {user?.department} - {user?.level}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
