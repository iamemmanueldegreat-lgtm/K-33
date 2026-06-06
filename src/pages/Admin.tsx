import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { ArrowLeft, Loader2, Plus, List, FolderPlus, BookOpen, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AUCHI_POLY_DEPARTMENTS } from '../lib/constants';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab ] = useState<'courses' | 'topics' | 'manage'>('courses');
  
  // Courses Form State
  const [department, setDepartment] = useState(AUCHI_POLY_DEPARTMENTS[0] || 'Computer Science');
  const [level, setLevel] = useState('ND1');
  const [courseCodes, setCourseCodes] = useState('');
  const [addingCourses, setAddingCourses] = useState(false);

  // Manage Courses Form State
  const [editingCourseId, setEditingCourseId] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [savingFields, setSavingFields] = useState(false);

  // Topics Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [addingTopics, setAddingTopics] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<{id: string, title: string, code: string}[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (user && !user.is_admin) {
      toast.error('Unauthorized access');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'topics' || activeTab === 'manage') {
      fetchCoursesForTopics();
    }
  }, [activeTab, department, level]);

  const fetchCoursesForTopics = async () => {
    setLoadingCourses(true);
    try {
      // Fetch courses for the selected department & level for Auchi Poly
      const coursesRef = collection(db, 'courses');
      const q = query(
        coursesRef, 
        where('school', '==', 'Auchi Polytechnic'),
        where('department', '==', department),
        where('level', '==', level)
      );
      
      const snapshot = await getDocs(q);
      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        code: doc.data().code || ''
      }));
      setAvailableCourses(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to fetch courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleBulkAddCourses = async () => {
    if (!courseCodes.trim()) {
      toast.error('Please enter course codes');
      return;
    }

    setAddingCourses(true);
    try {
      const lines = courseCodes.split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const batch = writeBatch(db);
      
      lines.forEach(line => {
        // e.g. COM 111 - INTRODUCTION TO COMPUTER SCIENCE
        const delimiterIndex = line.indexOf('-');
        let formattedCode = line;
        let title = line;

        if (delimiterIndex !== -1) {
          formattedCode = line.substring(0, delimiterIndex).trim().toUpperCase();
          title = line.substring(delimiterIndex + 1).trim();
        } else {
          formattedCode = line.toUpperCase();
        }
        
        const docId = `${department.replace(/[^a-zA-Z0-9]/g, '')}-${level}-${formattedCode.replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase();
        
        const courseRef = doc(db, 'courses', docId);
        batch.set(courseRef, {
          title: title, 
          code: formattedCode,
          school: 'Auchi Polytechnic',
          department: department,
          level: level,
          createdAt: new Date().toISOString()
        }, { merge: true }); 
      });

      await batch.commit();
      
      toast.success(`Successfully added ${lines.length} courses!`);
      setCourseCodes('');
    } catch (error) {
      console.error('Error adding courses:', error);
      toast.error('Failed to add courses');
    } finally {
      setAddingCourses(false);
    }
  };

  const handleBulkAddTopics = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }
    if (!topicsText.trim()) {
      toast.error('Please enter topics');
      return;
    }

    setAddingTopics(true);
    try {
      const lines = topicsText.split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const batch = writeBatch(db);
      const courseTopicsRef = collection(db, `courses/${selectedCourseId}/topics`);
      
      let currentChapterTitle = 'General Concepts';
      let currentChapterOrder = 1;
      let topicIdx = 0;

      lines.forEach((line) => {
        // Check if line is a chapter heading, e.g., "Chapter 1: Introduction"
        const chapterMatch = line.match(/^Chapter\s+(\d+)[.:\-\s]*(.*)$/i);
        if (chapterMatch) {
          currentChapterOrder = parseInt(chapterMatch[1], 10);
          currentChapterTitle = chapterMatch[2].trim() || `Chapter ${currentChapterOrder}`;
        } else {
          const topicId = line.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          const newTopicRef = doc(courseTopicsRef, `${currentChapterOrder}-${topicId}`);
          
          batch.set(newTopicRef, {
            title: line,
            order: topicIdx++,
            chapter: currentChapterTitle,
            chapter_order: currentChapterOrder,
            estimated_minutes: 10,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      });

      await batch.commit();
      toast.success(`Successfully added topics and chapters!`);
      setTopicsText('');
    } catch (error) {
      console.error('Error adding topics:', error);
      toast.error('Failed to add topics');
    } finally {
      setAddingTopics(false);
    }
  };

  const handleSaveCourse = async (courseId: string) => {
    if (!editCode.trim() || !editTitle.trim()) {
      toast.error('Course Code and Title cannot be empty');
      return;
    }
    setSavingFields(true);
    try {
      const courseRef = doc(db, 'courses', courseId);
      await setDoc(courseRef, {
        code: editCode.trim().toUpperCase(),
        title: editTitle.trim(),
      }, { merge: true });
      toast.success('Course details updated successfully!');
      setEditingCourseId('');
      // Refresh local available courses list
      await fetchCoursesForTopics();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course details');
    } finally {
      setSavingFields(false);
    }
  };

  if (!user?.is_admin) return null;

  return (
    <div className="h-full w-full flex flex-col p-4 sm:p-6 overflow-hidden">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full overflow-y-auto hide-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-4 mb-6">
          <button 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-100 dark:border-zinc-850"
          >
            <ArrowLeft size={18} className="text-zinc-700 dark:text-zinc-300" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Admin Workspace</h1>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Content Management Panel</p>
          </div>
        </div>

        {/* Global Selectors */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-6 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Context (Auchi Polytechnic)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary h-11 appearance-none"
              >
                {AUCHI_POLY_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary h-11 appearance-none"
              >
                {['100L', '200L', '300L', '400L', '500L', 'ND1', 'ND2', 'HND1', 'HND2'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'courses' 
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md' 
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <FolderPlus size={16} />
            Add Courses
          </button>
          
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'manage' 
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md' 
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Edit2 size={16} />
            Manage Courses
          </button>

          <button
            onClick={() => setActiveTab('topics')}
            className={`flex-1 py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'topics' 
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md' 
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <BookOpen size={16} />
            Add Topics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'courses' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                <List size={20} className="text-blue-500" />
                Bulk Paste Course Codes
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Paste one course code per line (e.g. COM 111). They will be added to Auchi Polytechnic ({department} - {level}).
              </p>
            </div>
            
            <textarea
              value={courseCodes}
              onChange={(e) => setCourseCodes(e.target.value)}
              placeholder={"COM 111 - INTRODUCTION TO COMPUTER SCIENCE\nCOM 112 - INTRODUCTION TO SOFTWARE ENGINEERING\nCOM 113 - INTRODUCTION TO PROGRAMMING"}
              className="w-full h-48 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />

            <button
              onClick={handleBulkAddCourses}
              disabled={addingCourses || !courseCodes.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingCourses ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              {addingCourses ? 'Adding...' : 'Create Courses'}
            </button>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                <Edit2 size={20} className="text-sky-505" />
                Manage & Edit Courses
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Below are the courses currently added under Auchi Polytechnic ({department} - {level}).
              </p>
            </div>

            {loadingCourses ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-zinc-500">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span>Loading courses...</span>
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">
                No courses found for this level and department. Paste them in "Add Courses" first.
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {availableCourses.map((course) => {
                  const isEditing = editingCourseId === course.id;
                  return (
                    <div 
                      key={course.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        isEditing 
                          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-700'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 dark:text-zinc-400 mb-1">Code</label>
                              <input
                                type="text"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-black text-zinc-900 dark:text-white uppercase outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 dark:text-zinc-400 mb-1">Course Title / Name</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setEditingCourseId('')}
                              disabled={savingFields}
                              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <X size={14} /> Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCourse(course.id)}
                              disabled={savingFields}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {savingFields ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              {savingFields ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-black tracking-wide">
                              {course.code}
                            </span>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {course.title || course.code}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCourseId(course.id);
                              setEditCode(course.code);
                              setEditTitle(course.title);
                            }}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-750 text-zinc-650 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/10 transition-colors shadow-sm cursor-pointer"
                            title="Edit Code or Title"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'topics' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                <List size={20} className="text-green-500" />
                Bulk Paste Topics
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                First select a course, then paste topics (one per line).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">Select Course</label>
              {loadingCourses ? (
                <div className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse flex items-center px-4 text-xs text-zinc-500">Loading courses...</div>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none h-11 appearance-none"
                >
                  <option value="">-- Choose a Course --</option>
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} {c.title && c.title !== c.code ? `- ${c.title}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
            
            <textarea
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder={"Introduction to Computers\nNumber Systems\nLogic Gates\n..."}
              className="w-full h-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />

            <button
              onClick={handleBulkAddTopics}
              disabled={addingTopics || !topicsText.trim() || !selectedCourseId}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingTopics ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              {addingTopics ? 'Adding...' : 'Create Topics'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
