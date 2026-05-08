import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ShieldAlert, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import type { Course, Topic } from '../types';
import { EDO_STATE_SCHOOLS, AUCHI_POLY_DEPARTMENTS } from '../lib/constants';

import { generateCourseImagePrompt } from '../lib/gemini';

export default function Admin() {
  const { user, setSimulatedRole } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  
  // Forms state
  const [newCourse, setNewCourse] = useState({ school: 'Auchi Polytechnic', department: '', level: '100L', code: '', title: '', description: '', topicsBulk: '' });

  useEffect(() => {
    if (user?.is_admin) {
      fetchCourses();
    }
  }, [user]);

  const handleBackfillImages = async () => {
    const coursesToBackfill = courses.filter(c => !c.thumbnail);
    if (coursesToBackfill.length === 0) {
      toast('No courses to backfill', { icon: 'ℹ️' });
      return;
    }

    if (!confirm(`Generate AI images for ${coursesToBackfill.length} courses?`)) return;

    setIsBackfilling(true);
    let successCount = 0;
    const total = coursesToBackfill.length;

    for (let i = 0; i < total; i++) {
      const course = coursesToBackfill[i];
      try {
        const imagePrompt = await generateCourseImagePrompt(course.title, course.department);
        const thumbnail = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
        
        await updateDoc(doc(db, 'courses', course.id), { thumbnail });
        successCount++;
        toast(`Backfilled ${successCount}/${total}`, { icon: '🖼️', id: 'backfill-toast' });
      } catch (err) {
        console.error(`Failed to backfill ${course.id}`, err);
        handleFirestoreError(err, OperationType.UPDATE, `courses/${course.id}`);
      }
    }

    setIsBackfilling(false);
    toast.success(`Successfully backfilled ${successCount} courses!`);
    fetchCourses();
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'));
      const querySnapshot = await getDocs(q);
      const coursesData: Course[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
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
        coursesData.push(course);
      }
      
      setCourses(coursesData);
    } catch (error) {
      toast.error('Failed to load courses');
      handleFirestoreError(error, OperationType.LIST, 'courses');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    const toastId = toast.loading('Generating AI course image...');
    try {
      // Generate AI Image Prompt and URL
      const imagePrompt = await generateCourseImagePrompt(newCourse.title, newCourse.department);
      // Using Pollinations.ai for AI image generation via URL
      const thumbnail = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;

      const topicsList = newCourse.topicsBulk.split('\n').map(t => t.trim()).filter(t => t);
      const courseData = { 
        ...newCourse,
        thumbnail,
        createdAt: new Date().toISOString()
      };
      delete (courseData as any).topicsBulk;

      const courseRef = await addDoc(collection(db, 'courses'), courseData);
      
      // Batch topic creation
      for (const tTitle of topicsList) {
        await addDoc(collection(db, `courses/${courseRef.id}/topics`), {
          course_id: courseRef.id,
          title: tTitle
        });
      }

      toast.success('Course created with AI cover photo!', { id: toastId });
      setNewCourse({ school: 'Auchi Polytechnic', department: '', level: '100L', code: '', title: '', description: '', topicsBulk: '' });
      fetchCourses();
    } catch (error) {
      toast.error('Failed to create course', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'courses');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      toast.success('Course deleted');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to delete course');
      handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    }
  };

  const handleDeleteTopic = async (courseId: string, topicId: string) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await deleteDoc(doc(db, `courses/${courseId}/topics`, topicId));
      toast.success('Topic deleted');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to delete topic');
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}/topics/${topicId}`);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted">You need administrator privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header>
        <span className="badge-blue border-red-200 text-red-500 dark:bg-red-500/10">Admin Dashboard</span>
        <h2 className="text-3xl font-bold tracking-tight mt-2">Manage Curriculum</h2>
        <div className="flex flex-wrap gap-2 mt-4">
          <p className="text-muted text-sm flex-1">Add courses to specific departments and levels.</p>
          <button 
            onClick={() => {
              setSimulatedRole('student');
              navigate('/');
            }}
            className="text-xs px-4 py-2 bg-text/5 text-text rounded-full font-bold hover:bg-text/10 transition-all flex items-center gap-2"
          >
            <Eye size={16} />
            View as Student
          </button>
          <button 
            onClick={handleBackfillImages}
            disabled={isBackfilling}
            className="text-xs px-4 py-2 bg-primary/10 text-primary rounded-full font-bold hover:bg-primary/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isBackfilling ? 'Backfilling...' : 'Backfill AI Images'}
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* ADD COURSE FORM */}
        <section className="card-bento space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Plus size={18}/> Add Course</h3>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select 
                required 
                className="input-field col-span-2" 
                value={newCourse.school} onChange={e => setNewCourse({...newCourse, school: e.target.value})} 
              >
                <option value="" disabled>Select Institution / School</option>
                {EDO_STATE_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {newCourse.school === 'Auchi Polytechnic' ? (
                <select
                  required
                  className="input-field col-span-2"
                  value={newCourse.department} onChange={e => setNewCourse({...newCourse, department: e.target.value})}
                >
                  <option value="" disabled>Select Department</option>
                  {AUCHI_POLY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input 
                  required placeholder="Department (e.g. Computer Science)" 
                  className="input-field col-span-2" 
                  value={newCourse.department} onChange={e => setNewCourse({...newCourse, department: e.target.value})} 
                />
              )}
              <select 
                className="input-field"
                value={newCourse.level} onChange={e => setNewCourse({...newCourse, level: e.target.value})}
              >
                <option value="100L">100 Level</option>
                <option value="200L">200 Level</option>
                <option value="300L">300 Level</option>
                <option value="400L">400 Level</option>
                <option value="500L">500 Level</option>
                <option value="ND 1">ND 1</option>
                <option value="ND 2">ND 2</option>
                <option value="HND 1">HND 1</option>
                <option value="HND 2">HND 2</option>
              </select>
              <input 
                required placeholder="Code (e.g. MTH 101)" 
                className="input-field" 
                value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value})} 
              />
            </div>
            <input 
              required placeholder="Title (e.g. Algebra)" 
              className="input-field" 
              value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} 
            />
            <textarea 
              placeholder="Description" 
              className="input-field min-h-[80px]" 
              value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} 
            />
            <textarea 
              placeholder="Add Topics in Bulk (one topic per line)" 
              className="input-field min-h-[120px]" 
              value={newCourse.topicsBulk} onChange={e => setNewCourse({...newCourse, topicsBulk: e.target.value})} 
            />
            <button 
              type="submit" 
              disabled={isGenerating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating AI Cover...
                </>
              ) : (
                'Create Course'
              )}
            </button>
          </form>
        </section>
      </div>

      <section className="mt-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="font-bold text-xl">Existing Courses</h3>
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search courses..."
              className="input-field pl-10 h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <Eye size={16} />
            </div>
          </div>
        </div>

        {loading ? (
           <div className="animate-pulse flex flex-col gap-4">
             <div className="h-20 bg-surface rounded-xl"></div>
             <div className="h-20 bg-surface rounded-xl"></div>
             <div className="h-20 bg-surface rounded-xl"></div>
           </div>
        ) : (
          <div className="overflow-hidden bg-surface dark:bg-dark-surface rounded-2xl border border-border dark:border-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background dark:bg-dark-background border-b border-border dark:border-dark-border">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Course</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted hidden md:table-cell">School / Dept</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted hidden sm:table-cell">Level</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted text-center">Topics</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-dark-border">
                  {filteredCourses.map(course => (
                    <React.Fragment key={course.id}>
                      <tr className="hover:bg-primary/5 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {course.thumbnail && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                                <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-sm leading-tight">{course.code}</div>
                              <div className="text-xs text-muted truncate max-w-[200px]">{course.title}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="text-xs font-medium">{course.school}</div>
                          <div className="text-[10px] text-muted">{course.department}</div>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="badge-blue text-[10px] py-0.5">{course.level}</span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                            className={`text-xs font-bold px-2 py-1 rounded-md transition-all ${
                              expandedCourseId === course.id 
                                ? "bg-primary text-white" 
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                          >
                            {course.topics?.length || 0} Topics
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Course"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Topics View */}
                      {expandedCourseId === course.id && (
                        <tr className="bg-background/50 dark:bg-dark-background/50">
                          <td colSpan={5} className="p-4 pt-0">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 p-4 rounded-xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-inner">
                                <h5 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Curriculum Topics</h5>
                                {course.topics && course.topics.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {course.topics.map((topic: Topic) => (
                                      <div key={topic.id} className="flex justify-between items-center group/topic bg-background dark:bg-dark-background p-2 px-3 rounded-lg border border-border dark:border-dark-border hover:border-primary/30 transition-all">
                                        <span className="text-xs font-medium">{topic.title}</span>
                                        <button 
                                          onClick={() => handleDeleteTopic(course.id, topic.id)}
                                          className="text-muted hover:text-red-500 p-1 opacity-0 group-hover/topic:opacity-100 transition-all"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted italic">No topics added to this internal curriculum yet.</p>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCourses.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted">No courses found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
