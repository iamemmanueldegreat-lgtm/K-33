import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Course } from '../types';
import { BookOpen, ChevronRight, PlayCircle, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Practice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
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
          const courseData: Course[] = [];
          querySnapshot.forEach(doc => {
            courseData.push({ id: doc.id, ...doc.data() } as Course);
          });
          setCourses(courseData);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'courses');
        } finally {
          setLoading(false);
        }
      };
      
      fetchCourses();
    }
  }, [user]);

  return (
    <div className="space-y-6 pb-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold mb-1">Practice Zone</h1>
        <p className="text-muted text-sm">Choose a course and test your knowledge</p>
      </header>
      
      <div className="grid gap-3">
        {_loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                 <div key={i} className="h-[80px] bg-surface rounded-2xl"></div>
              ))}
            </div>
        ) : courses.length > 0 ? (
          courses.map(course => (
            <motion.div 
              key={course.id}
              onClick={() => navigate(`/practice/${course.id}`)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-surface p-4 rounded-[20px] shadow-sm border border-border/50 cursor-pointer flex items-center gap-4 hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <BrainCircuit size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm line-clamp-1 mb-1">{course.title}</h3>
                <p className="text-xs text-muted font-medium">{course.code}</p>
              </div>
              <ChevronRight size={20} className="text-muted" />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-muted bg-surface rounded-[24px]">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>No courses available to practice yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
