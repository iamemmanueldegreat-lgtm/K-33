import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, BrainCircuit, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { Course } from '../types';

export default function PracticeSession() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      const fetchCourse = async () => {
        try {
          const docRef = doc(db, 'courses', courseId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCourse({ id: docSnap.id, ...docSnap.data() } as Course);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
        } finally {
          setLoading(false);
        }
      };
      fetchCourse();
    }
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted">Preparing session...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20 px-6">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Course not found</h2>
        <button onClick={() => navigate('/practice')} className="btn-primary">Go Back</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pt-4 pb-20 px-4 sm:px-6 xl:px-8">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/practice')}
          className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{course.code}</span>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-bento p-12 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 relative overflow-hidden"
      >
        <img 
          src="https://picsum.photos/seed/kortex-ai-brain/800/800?blur=5" 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.05] pointer-events-none"
          referrerPolicy="no-referrer"
        />
        
        <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary relative z-10">
          <BrainCircuit size={48} strokeWidth={1.5} />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <Sparkles size={16} fill="currentColor" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">AI Practice Pending</h2>
          <p className="text-muted text-sm max-w-xs mx-auto leading-relaxed">
            The AI-powered test generator for <span className="text-primary font-bold">{course.title}</span> is almost ready for deployment.
          </p>
        </div>

        <div className="w-full h-px bg-border/50"></div>

        <div className="grid grid-cols-2 gap-4 w-full text-left">
          <div className="p-4 rounded-2xl bg-surface/50 border border-border">
            <p className="text-[10px] font-bold uppercase text-muted mb-1 opacity-60">Status</p>
            <p className="text-sm font-bold text-accent">Experimental</p>
          </div>
          <div className="p-4 rounded-2xl bg-surface/50 border border-border">
            <p className="text-[10px] font-bold uppercase text-muted mb-1 opacity-60">Wait Time</p>
            <p className="text-sm font-bold text-primary">Pre-alpha</p>
          </div>
        </div>

        <button 
          onClick={() => navigate('/practice')}
          className="btn-primary w-full shadow-lg shadow-primary/20"
        >
          Explore Other Courses
        </button>
      </motion.div>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted px-2">How it works</h3>
        <div className="space-y-3">
          {[
            { title: "Smart Extraction", desc: "Our AI reads your curriculum and extracts core syllabus requirements." },
            { title: "Dynamic Questions", desc: "We generate past-question style problems relevant to Nigerian exams." },
            { title: "Real-time Feedback", desc: "Get instant explanations for every answer choice you make." },
          ].map((feature, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-surface border border-border shadow-sm">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                {i + 1}
              </div>
              <div>
                <p className="font-bold text-sm">{feature.title}</p>
                <p className="text-xs text-muted leading-relaxed mt-1">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
