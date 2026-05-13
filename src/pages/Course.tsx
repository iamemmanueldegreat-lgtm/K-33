import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { useAuth } from '../App';
import type { Course as CourseType, Topic } from '../types';
import { ArrowLeft, BookOpen, ChevronRight, Wand2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Course() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseType | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) return;
      setLoading(true);
      try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          const cData = courseDoc.data() as CourseType;
          cData.id = courseDoc.id;
          setCourse(cData);
        }

        const topicsQuery = query(collection(db, `courses/${courseId}/topics`));
        const topicsSnapshot = await getDocs(topicsQuery);
        const topicsData: Topic[] = [];
        topicsSnapshot.forEach(tDoc => {
          const topic = tDoc.data() as Topic;
          topic.id = tDoc.id;
          topicsData.push(topic);
        });
        setTopics(topicsData);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'courses/' + courseId);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  return (
    <div className="space-y-6 w-full">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/library')}
          className="w-10 h-10 rounded-full bg-surface shadow-sm border border-border/50 text-text hover:bg-surface/80 transition-colors flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="text-xs font-bold text-primary tracking-widest uppercase">{course?.code || 'Loading...'}</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">{course?.title || 'Loading...'}</h2>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 bg-surface animate-pulse rounded-2xl"></div>
          <div className="h-16 bg-surface animate-pulse rounded-2xl"></div>
        </div>
      ) : (
        <div className="card-bento p-5 space-y-4">
          <p className="text-muted leading-relaxed mb-6">{course?.description}</p>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-primary" /> Topics ({topics.length})
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {topics.map((topic, index) => (
              <button
                key={topic.id}
                onClick={() => navigate(`/study/${course?.id}/${topic.id}`)}
                className="flex p-4 rounded-2xl bg-background border border-border hover:border-primary hover:shadow-sm transition-all text-left items-center group"
              >
                <div className="w-10 h-10 rounded-full bg-surface text-muted font-bold flex items-center justify-center mr-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-text block">{topic.title}</span>
                  {topic.content ? (
                     <span className="text-xs text-success flex items-center gap-1 mt-1 font-medium"><CheckCircle2 size={12}/> Content available</span>
                  ) : (
                     <span className="text-xs text-muted flex items-center gap-1 mt-1">Pending generation</span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1">
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
            
            {topics.length === 0 && (
              <div className="text-center py-10 opacity-50 bg-background border border-dashed border-border rounded-2xl">
                <p className="font-medium text-muted">No topics found for this course.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
