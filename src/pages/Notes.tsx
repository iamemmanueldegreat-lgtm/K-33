import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Lock, 
  MoreVertical, 
  Tag as TagIcon, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X,
  Palette,
  Mic,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Note } from '../types';
import { toast } from 'react-hot-toast';

const COLORS = [
  { name: 'Default', bg: 'bg-surface text-text', hex: 'var(--color-surface)' },
  { name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-950 dark:text-purple-50', hex: '#D1C4E9' },
  { name: 'Green', bg: 'bg-green-100 dark:bg-green-900/30 text-green-950 dark:text-green-50', hex: '#C8E6C9' },
  { name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-950 dark:text-blue-50', hex: '#BBDEFB' },
  { name: 'Orange', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-950 dark:text-orange-50', hex: '#FFE0B2' },
  { name: 'Red', bg: 'bg-red-100 dark:bg-red-900/30 text-red-950 dark:text-red-50', hex: '#FFCDD2' },
  { name: 'Teal', bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-950 dark:text-teal-50', hex: '#B2DFDB' },
];

const TAGS = ['#All', '#Work', '#Personal', '#Fitness', '#Study', '#Inspiration'];

export default function Notes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('#All');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
  
  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch user's courses for tags
    const fetchCourses = async () => {
      try {
        const q = query(
          collection(db, 'courses'),
          where('level', '==', user.level),
          where('department', '==', user.department)
        );
        const snap = await getDocs(q);
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching course tags:", err);
      }
    };
    fetchCourses();

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      
      notesData.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : Date.parse(a.updatedAt || '0');
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : Date.parse(b.updatedAt || '0');
        return timeB - timeA;
      });
      
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateNew = (initialAction: 'text' | 'voice' | 'image' = 'text') => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setSelectedColor(COLORS[0].hex);
    setSelectedTags([]);
    setIsLocked(false);
    setIsEditorOpen(true);

    if (initialAction === 'voice') {
      setTimeout(startVoiceToText, 500);
    } else if (initialAction === 'image') {
      setTimeout(() => document.getElementById('imageUpload')?.click(), 100);
    }
  };

  const startVoiceToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please enable it in your browser settings.");
        } else {
          toast.error(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setContent(prev => {
            const hasNewline = prev && !prev.endsWith('\n');
            return prev + (hasNewline ? ' ' : '') + transcript;
          });
          toast.success("Text added from voice");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      toast.error("Could not start voice recognition.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      toast.error("Image too large. Please select a smaller photo (under 500KB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setContent(prev => prev + `\n![Image](${dataUrl})\n`);
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSelectedColor(note.color || COLORS[0].hex);
    setSelectedTags(note.tags || []);
    setIsLocked(note.isLocked || false);
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    const noteData = {
      userId: user.id,
      title,
      content,
      color: selectedColor,
      tags: selectedTags,
      isLocked,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingNote?.id) {
        await updateDoc(doc(db, 'notes', editingNote.id), noteData);
        toast.success('Note updated');
      } else {
        await addDoc(collection(db, 'notes'), {
          ...noteData,
          createdAt: serverTimestamp(),
        });
        toast.success('Note created');
      }
      setIsEditorOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notes');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
      toast.success('Note deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notes');
    }
  };

  const courseTags = ["#All", ...courses.map(c => `#${c.code}`)];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === '#All' || note.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="min-h-full pb-24">
      <input 
        type="file" 
        id="imageUpload" 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
      {/* Header Area */}
      <div className="flex flex-col gap-6 pt-4 px-1">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors">
               <ArrowLeft size={24} className="text-text" />
            </button>
            <h1 className="text-4xl font-black tracking-tighter text-text">Your Notes</h1>
        </div>

        {/* Search Bar (Design 1) */}
        <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-surface border border-border/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
          />
        </div>

        {/* Dynamic Tag Selection (Courses) */}
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar scroll-smooth">
          {courseTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`
                px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all snap-start
                ${selectedTag === tag 
                  ? 'bg-primary text-white shadow-md scale-105' 
                  : 'bg-surface text-muted hover:text-primary border border-border/20'
                }
              `}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid (Design 2 Masonry Layout inspired) */}
      <div className="mt-8 grid grid-cols-2 gap-4 auto-rows-min">
        {loading ? (
            Array(4).fill(0).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-surface rounded-[24px] animate-pulse"></div>
            ))
        ) : filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => {
            const colorObj = COLORS.find(c => c.hex === note.color) || COLORS[0];
            
            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleEdit(note)}
                className={`
                  p-5 rounded-[28px] shadow-sm border border-border/50 
                  flex flex-col justify-between relative overflow-hidden group cursor-pointer
                  hover:shadow-lg hover:-translate-y-1 transition-all
                  ${colorObj.bg}
                  ${index % 3 === 0 ? 'aspect-[4/5]' : 'aspect-square'}
                `}
              >
                <div>
                   <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold leading-tight line-clamp-1 opacity-90">{note.title}</h3>
                      {note.isLocked && <Lock size={14} className="opacity-40" />}
                   </div>
                   <div className="text-xs leading-relaxed line-clamp-4 opacity-75">
                     {note.isLocked ? "This note is locked." : (
                       note.content.split('\n').map((line, i) => (
                         line.startsWith('![Image]') ? (
                           <span key={i} className="text-[10px] font-bold block p-1 rounded mt-1 bg-black/5 dark:bg-white/10">📸 Attached Photo</span>
                         ) : <span key={i}>{line} </span>
                       ))
                     )}
                   </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                     {new Date(note.updatedAt?.toDate()).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                   </p>
                   <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 dark:bg-white/10">
                      <Edit3 size={14} className="opacity-60" />
                   </div>
                </div>

                {/* Tags indicator */}
                {note.tags && note.tags.length > 0 && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-40">
                     <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white"></div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-2 py-20 flex flex-col items-center justify-center text-center opacity-50">
             <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
                <TagIcon size={32} />
             </div>
             <p className="font-bold text-text">No notes found</p>
             <p className="text-xs mt-1">Start writing your first idea!</p>
          </div>
        )}
      </div>

      {/* Navigation action bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-16 bg-surface/90 backdrop-blur-xl rounded-full flex items-center justify-between px-3 shadow-2xl z-50 overflow-hidden border border-border">
        <button 
          onClick={() => handleCreateNew('text')}
          className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full h-11 transition-all active:scale-95 group"
        >
          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform">
             <Plus size={18} />
          </div>
          <span className="text-xs font-bold font-sans">Add note</span>
        </button>
        
        <div className="flex items-center gap-4 pr-4">
           <button 
            onClick={() => handleCreateNew('text')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-text transition-colors"
           >
              <Edit3 size={18} />
           </button>
           <button 
            onClick={() => handleCreateNew('voice')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-text transition-colors"
           >
              <Mic size={18} />
           </button>
           <button 
            onClick={() => handleCreateNew('image')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-text transition-colors"
           >
              <ImageIcon size={18} />
           </button>
        </div>
      </div>

      {/* Note Editor Modal (Design 3) */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ 
                scale: 1, 
                y: 0,
              }}
              exit={{ scale: 0.9, y: 50 }}
              transition={{ duration: 0.3 }}
              className={`w-full max-w-xl h-full max-h-[95vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative ${COLORS.find(c => c.hex === selectedColor)?.bg || COLORS[0].bg}`}
            >
              {/* Voice Listening Overlay */}
              <AnimatePresence>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[110] bg-black/10 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none"
                  >
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <Mic size={40} className="text-white" />
                    </div>
                    <p className="mt-4 font-black uppercase tracking-[0.2em] text-red-500">Listening...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toolbar */}
              <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5">
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2">
                   {editingNote && (
                     <button 
                       onClick={() => handleDelete(editingNote.id!)}
                       className="w-10 h-10 rounded-full flex items-center justify-center text-red-600 hover:bg-red-500/10 transition-colors"
                     >
                       <Trash2 size={20} />
                     </button>
                   )}
                   <button 
                    onClick={handleSave}
                    className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all"
                   >
                     Confirm
                   </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-4">
                 <input 
                    type="text" 
                    placeholder="Note title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-3xl font-black tracking-tight outline-none bg-transparent placeholder:opacity-40"
                 />
                 <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex gap-1">
                      {selectedTags.map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-black/5 dark:bg-white/10">{t}</span>
                      ))}
                    </div>
                 </div>
                 
                 <div className="w-full h-full min-h-[300px] flex flex-col gap-4">
                    {content.split('\n').map((line, i) => {
                      if (line.startsWith('![Image](')) {
                        const url = line.match(/\((.*?)\)/)?.[1];
                        return <img key={i} src={url} className="w-full rounded-[24px] shadow-sm max-h-[300px] object-cover" />;
                      }
                      return null;
                    })}
                    <textarea 
                        placeholder="Start typing your thoughts..."
                        value={content.replace(/!\[Image\].*?\n/g, '')}
                        onChange={(e) => setContent(prev => {
                          const images = prev.match(/!\[Image\].*?\n/g) || [];
                          return images.join('') + e.target.value;
                        })}
                        className="w-full flex-1 text-base leading-loose outline-none bg-transparent resize-none placeholder:opacity-40"
                    />
                 </div>
              </div>

              {/* Format Drawer */}
              <div className="p-6 border-t rounded-t-[40px] bg-black/5 border-black/5 dark:bg-white/5 dark:border-white/5">
                 <div className="flex flex-col gap-5">
                    {/* Color selection */}
                    <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar sm:pb-1">
                       <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                          <Palette size={18} className="opacity-60" />
                       </div>
                       {COLORS.map(c => (
                         <button
                           key={c.hex}
                           onClick={() => setSelectedColor(c.hex)}
                           className={`
                             w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm
                             ${selectedColor === c.hex ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-black/5 dark:border-white/5'}
                           `}
                           style={{ backgroundColor: c.hex }}
                         >
                            {selectedColor === c.hex && <CheckCircle2 size={12} className="text-primary" />}
                         </button>
                       ))}
                    </div>

                    {/* Tags selection (Courses) */}
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar sm:pb-1">
                       <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                          <TagIcon size={18} className="opacity-60" />
                       </div>
                       {courseTags.slice(1).map(tag => (
                         <button
                           key={tag}
                           onClick={() => toggleTag(tag)}
                           className={`
                             px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border
                             ${selectedTags.includes(tag) 
                               ? 'bg-primary text-white border-primary shadow-sm' 
                               : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 opacity-80 hover:opacity-100'
                             }
                           `}
                         >
                           {tag}
                         </button>
                       ))}
                    </div>

                    {/* Action methods */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                       <div className="flex gap-2">
                          <button 
                            onClick={startVoiceToText}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-black/5 dark:bg-white/5 opacity-80 hover:bg-primary hover:text-white"
                          >
                             <Mic size={20} />
                          </button>
                          <button 
                             onClick={() => document.getElementById('imageUpload')?.click()}
                             className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-black/5 dark:bg-white/5 opacity-80 hover:bg-primary hover:text-white"
                          >
                             <ImageIcon size={20} />
                          </button>
                       </div>
                       
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isLocked ? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/5 opacity-70'}`}>
                             <Lock size={18} />
                          </div>
                          <button 
                            onClick={() => setIsLocked(!isLocked)}
                            className={`w-12 h-6 rounded-full relative transition-colors ${isLocked ? 'bg-orange-500' : 'bg-black/10 dark:bg-white/10'}`}
                          >
                              <motion.div 
                                animate={{ x: isLocked ? 24 : 4 }}
                                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                              />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
