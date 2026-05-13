import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Menu, X, Search, ChevronRight, LayoutPanelLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateStudyContent } from '../lib/gemini';
import Markdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import ThemeToggle from '../components/ThemeToggle';
import type { Topic } from '../types';

export default function Study() {
  const { courseId, topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState({ course: '', topic: '' });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topicsDropdownOpen, setTopicsDropdownOpen] = useState(false);

  // active tab
  const [activeTab, setActiveTab] = useState('Explanation');
  const tabs = ['Explanation', 'Key Takeaways', 'Practice'];

  useEffect(() => {
    async function trackView() {
      if (!user || !courseId) return;
      try {
        await setDoc(doc(db, `users/${user.id}/recent_views`, courseId), {
          courseId,
          lastViewedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error tracking view:", err);
      }
    }
    trackView();
  }, [user, courseId]);

  useEffect(() => {
    async function loadData() {
      if (!courseId || !topicId) return;
      setLoading(true);
      try {
        // Fetch course details
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        const courseTitle = courseDoc.exists() ? courseDoc.data().title : courseId;
        
        // Fetch all topics
        const topicsSnapshot = await getDocs(collection(db, `courses/${courseId}/topics`));
        const topicsData = topicsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Topic));
        setTopics(topicsData);

        // Current topic data
        const currentTopic = topicsData.find(t => t.id === topicId);
        const topicTitle = currentTopic ? currentTopic.title : topicId;
        
        setTitles({ course: courseTitle, topic: topicTitle });

        // Set content
        if (currentTopic && currentTopic.content) {
          setContent(currentTopic.content);
        } else {
          setContent("> **Content Pending**\n\nThis content has not been generated yet. Please ask an admin to generate the explanation or check back later.");
        }
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Auto-close sidebar on mobile when navigating
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [courseId, topicId]);

  const filteredTopics = topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-[100dvh] bg-background text-text font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen || window.innerWidth >= 1024 ? 0 : '-100%' }}
        className={`fixed lg:static top-0 left-0 h-full w-[280px] bg-surface border-r border-border flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header */}
        <div className="p-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden">
               {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user?.full_name?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">{titles.course}</p>
              <p className="text-[10px] text-muted mt-1">Course</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-muted/10">
            <X size={18} />
          </button>
        </div>

        {/* Back Button */}
        <div className="p-4">
          <button 
            onClick={() => navigate('/library')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface border border-border hover:border-primary text-text rounded-lg font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft size={18} /> Back to Library
          </button>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              placeholder="Search topics" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto px-2 pb-6 custom-scrollbar">
          <h3 className="px-3 text-[10px] uppercase font-bold text-muted tracking-wider mb-2 mt-2">Topics</h3>
          <div className="space-y-1">
            {filteredTopics.map((t) => (
              <Link 
                key={t.id} 
                to={`/study/${courseId}/${t.id}`}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg transition-colors group
                  ${topicId === t.id 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted hover:bg-muted/10 hover:text-text'}
                `}
              >
                <span className="text-sm line-clamp-2 leading-tight pr-2">{t.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted/10 transition-colors"
            >
              <Menu size={24} />
            </button>
            <button 
               onClick={() => setSidebarOpen(prev => !prev)}
               className="hidden lg:flex p-2 -ml-2 rounded-lg hover:bg-muted/10 transition-colors text-muted"
               title="Toggle Sidebar"
            >
              <LayoutPanelLeft size={22} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="w-full px-4 sm:px-6 xl:px-8 pb-24 pt-4">
          
          {loading ? (
             <div className="py-32 flex flex-col items-center justify-center gap-6 animate-pulse">
                <div className="w-16 h-16 border-4 border-[#4F46E5]/20 border-t-[#4F46E5] rounded-full animate-spin" />
                <p className="text-muted font-medium">Retrieving content...</p>
             </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Topic Menu Bar */}
              <div className="relative mb-6 z-20">
                <button
                  onClick={() => setTopicsDropdownOpen(!topicsDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-primary rounded-xl text-sm font-semibold transition-all shadow-sm max-w-full"
                >
                  <span className="truncate">{titles.course}</span>
                  <span className="text-muted mx-1">•</span>
                  <span className="truncate text-primary">{titles.topic}</span>
                  <ChevronDown size={16} className={`ml-2 transition-transform ${topicsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {topicsDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden custom-scrollbar"
                    >
                      <div className="p-3 max-h-[300px] overflow-y-auto">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-2 px-2">All Topics</h4>
                        <div className="space-y-1">
                          {topics.map(t => (
                            <Link
                              key={t.id}
                              to={`/study/${courseId}/${t.id}`}
                              onClick={() => setTopicsDropdownOpen(false)}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${t.id === topicId ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/10 text-text'}`}
                            >
                              <span className="line-clamp-2 pr-4">{t.title}</span>
                              {t.id === topicId && <CheckCircle2 size={16} />}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Title Section */}
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 leading-[1.1]">{titles.topic}</h1>
              
              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-border mb-10 overflow-x-auto custom-scrollbar pb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 
                      ${activeTab === tab 
                        ? 'border-primary text-text' 
                        : 'border-transparent text-muted hover:text-text'}
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Document Text */}
              <article className="prose prose-slate dark:prose-invert max-w-none prose-lg
                prose-headings:font-semibold prose-headings:tracking-tight 
                prose-p:leading-8 prose-p:text-text 
                prose-a:text-primary prose-li:text-text prose-li:leading-8
                marker:text-muted
              ">
                {activeTab === 'Explanation' && (
                   <Markdown>{content}</Markdown>
                )}
                {activeTab === 'Key Takeaways' && (
                   <div className="text-center py-20 text-muted">
                     <p>Feature coming soon.</p>
                   </div>
                )}
                {activeTab === 'Practice' && (
                   <div className="text-center py-20 text-muted">
                     <p>Feature coming soon.</p>
                   </div>
                )}
              </article>
            </motion.div>
          )}

        </div>
      </main>

    </div>
  );
}

