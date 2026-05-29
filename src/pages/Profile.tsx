import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Settings, LogOut, ChevronRight, Shield, Bell, CreditCard, ExternalLink, GraduationCap, Camera, Loader2, User, Mail, MapPin, Crown, Sparkles, Download, Smartphone, Share, Plus, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWA } from '../hooks/usePWA';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { compressImage } from '../lib/utils';

export default function Profile() {
  const { user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { isInstalled, installable, isIPhone, triggerInstall } = usePWA();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingAvatar(true);
    try {
      // Compress and resize image to max 400x400
      const base64Url = await compressImage(file, 400, 400);
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { avatar_url: base64Url });
      
      toast.success('Profile picture updated!');
      await refreshProfile();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to upload image. Please check file format.');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingCover(true);
    try {
      // Compress and resize cover to max 1200x800
      const base64Url = await compressImage(file, 1200, 800);
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { cover_url: base64Url });
      
      toast.success('Cover photo updated!');
      await refreshProfile();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to upload cover photo. Please check file format.');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 selection:bg-primary/10">
      <header className="flex flex-col items-center py-12 bg-white dark:bg-background border-b border-border relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #0D4C50 1px, transparent 1px), linear-gradient(to bottom, #0D4C50 1px, transparent 1px)`, 
            backgroundSize: '30px 30px' 
          }}
        />

        {/* Cover Image Background */}
        <div className="absolute inset-0 z-0 opacity-15">
          <img 
            src={user?.cover_url || "https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=1200"} 
            alt="Cover" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-background via-transparent to-transparent"></div>
        </div>

        <button 
           onClick={() => coverInputRef.current?.click()}
           className="absolute top-6 right-6 z-20 p-2.5 bg-white/80 dark:bg-surface/80 hover:bg-white dark:hover:bg-surface backdrop-blur-md rounded-full shadow-sm transition-all text-primary border border-primary/10 dark:border-white/10 active:scale-90"
           title="Change Cover Photo"
        >
            {uploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
        </button>
        <input 
           type="file" 
           ref={coverInputRef} 
           hidden 
           accept="image/*" 
           onChange={handleCoverUpload}
        />

        <div className="relative z-10 group mt-4">
          <button 
             onClick={() => avatarInputRef.current?.click()}
             className="relative w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-primary/40 overflow-hidden"
          >
             {user?.avatar_url ? (
               <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               user?.full_name?.charAt(0) || 'U'
             )}
             
             {/* Hover Overlay for Avatar */}
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {uploadingAvatar && <Loader2 size={24} className="animate-spin text-white" />}
             </div>
          </button>
          
          <button 
             onClick={() => avatarInputRef.current?.click()}
             className="absolute bottom-0 right-0 z-20 p-2 bg-surface border border-border hover:bg-background rounded-full shadow-md text-text/80 pointer-events-auto transition-transform active:scale-95"
             title="Change Profile Photo"
          >
             <Camera size={16} />
          </button>
          
          <input 
            type="file" 
            ref={avatarInputRef} 
            hidden 
            accept="image/*" 
            onChange={handleAvatarUpload}
          />
          
          {user?.is_pro && (
            <div className="absolute -bottom-2 -right-2 bg-accent text-white p-2 rounded-2xl border-4 border-surface shadow-lg z-20">
              <Shield size={18} fill="currentColor" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold mt-6 tracking-tight relative z-10">{user?.full_name || 'Student User'}</h2>
        <div className="flex items-center gap-2 mt-2 relative z-10">
          <span className="badge-blue whitespace-nowrap">{user?.school}</span>
          <span className="text-[10px] text-muted font-bold uppercase tracking-widest">•</span>
          <span className="text-xs text-muted font-medium">{user?.department}</span>
        </div>
      </header>

      <div className="px-4 sm:px-6 space-y-6 w-full">
        {user?.is_admin && (
          <motion.a 
            href="https://admin.kortexai.online" 
            target="_blank" 
            rel="noopener noreferrer"
            whileTap={{ scale: 0.98 }}
            className="flex flex-col md:flex-row gap-4 bg-gradient-to-br from-[#121212] to-[#1e1e24] dark:from-[#0c0c0e] dark:to-[#17171e] text-white border border-white/10 relative overflow-hidden group cursor-pointer p-6 sm:p-8 rounded-[32px] shadow-2xl"
          >
            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
                    <Shield size={18} fill="currentColor" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">Workspace Management</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  Kortex AI <span className="text-amber-400">Lovable Admin</span>
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed max-w-md">
                  Update courses, view registered student metrics, update curriculum topics, and manage monetization instantly through your custom admin portal.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400/80">
                <span>Access Workspace</span>
                <ExternalLink size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-center self-end md:self-center">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-white">
                <ChevronRight size={20} />
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:scale-115 transition-transform"></div>
          </motion.a>
        )}

        <motion.div 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/billing')}
          className="relative overflow-hidden group cursor-pointer rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-[#0A0D14] via-[#101520] to-[#0E1B29] border border-[#00BFFF]/20 shadow-[0_8px_30px_rgba(0,191,255,0.08)] mt-2"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00BFFF]/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-[#00BFFF]/20 transition-all duration-500 transform group-hover:scale-110" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FFBF00]/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-[#FFBF00]/20 transition-all duration-500" />

          {/* Sparkles icon decorative top right */}
          <div className="absolute top-6 right-6 opacity-40 group-hover:opacity-100 group-hover:rotate-12 transition-all duration-300">
            <Sparkles className="text-[#00BFFF]" size={36} strokeWidth={1} />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-4 pr-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <Crown size={14} className="text-[#FFBF00]" />
                <span className="text-[10px] sm:text-xs font-black uppercase text-white tracking-widest">Premium Plan</span>
              </div>
              
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm font-serif">Go Kortex Pro</h3>
                <p className="text-zinc-400 text-[13px] sm:text-sm mt-1.5 leading-relaxed font-medium">Unlock 24/7 AI tutor, unlimited generations, and premium study tools.</p>
              </div>

              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                  View Benefits <ChevronRight size={14} className="text-[#00BFFF]" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* PWA Installation Bento Card */}
        <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-indigo-500/10 dark:from-purple-500/5 dark:to-indigo-500/5 border border-purple-500/20 dark:border-purple-400/20 shadow-md">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[40px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Smartphone size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="text-[10px] sm:text-xs font-black uppercase text-purple-700 dark:text-purple-300 tracking-widest">Progressive Web App</span>
              </div>
              
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isInstalled ? "App Installed on Device" : "Install Kortex AI App"}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-[13px] leading-relaxed mt-1">
                  Add Kortex AI to your screen as a standalone experience. Supports fast local loading, full-screen study guides, responsive native scrolling, and persistent offline fallbacks.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center md:self-center">
              {isInstalled ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-wider select-none">
                  <CheckCircle2 size={16} />
                  <span>App Installed</span>
                </div>
              ) : isIPhone ? (
                <button
                  onClick={() => setShowInstructions(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-500/25 dark:shadow-purple-500/10 active:scale-95 transition-all text-center justify-center cursor-pointer"
                >
                  <Share size={16} />
                  <span>Install App</span>
                </button>
              ) : installable ? (
                <button
                  onClick={async () => {
                    const success = await triggerInstall();
                    if (success) {
                      toast.success("Thank you for installing Kortex AI!");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-500/25 dark:shadow-purple-500/10 active:scale-95 transition-all text-center justify-center cursor-pointer"
                >
                  <Download size={16} />
                  <span>Install App</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowInstructions(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-500/25 dark:shadow-purple-500/10 active:scale-95 transition-all text-center justify-center cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Manual Install</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* iOS/Browser Manual Installation Instructions Modal */}
        <AnimatePresence>
          {showInstructions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#121218] border border-border dark:border-white/10 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative z-50 text-text"
              >
                {/* Close button */}
                <button
                  onClick={() => setShowInstructions(false)}
                  className="absolute top-4 right-4 p-2 text-muted hover:text-text rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>

                <header className="flex flex-col items-center text-center mt-2 mb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3">
                    <Smartphone size={24} />
                  </div>
                  <h4 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-zinc-100">
                    {isIPhone ? 'Install on iOS Safari' : 'Installation Guide'}
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Add Kortex AI to your Home Screen to unlock a full-screen, native student experience.
                  </p>
                </header>

                <div className="space-y-4">
                  {isIPhone ? (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">1</div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                          Tap the <strong className="text-primary inline-flex items-center gap-0.5"><Share size={12} className="inline" /> Share</strong> button in Safari's bottom toolbar.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">2</div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                          Scroll down and tap <strong className="text-primary inline-flex items-center gap-0.5"><Plus size={12} className="inline" /> Add to Home Screen</strong>.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">3</div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                          Confirm by clicking <strong className="text-primary">Add</strong> in the top right. Kortex AI will appear as a premium app on your home screen!
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">1</div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                          Open your mobile browser or desktop Chrome/Edge settings menu (usually the three dots <strong className="text-primary font-mono font-black">⋮</strong> icon).
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">2</div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                          Select <strong className="text-primary">Install Kortex AI</strong> or <strong className="text-primary">Add to Home Screen</strong>.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">3</div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                          Accept the confirmation popup to create your launch shortcut.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full mt-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Got it, thanks!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary/60">Academic Profile</h3>
          <Shield size={16} className="text-primary/20" />
        </div>
        
        <div className="grid gap-4">
          <div className="card-bento p-1 bg-white dark:bg-surface border-border shadow-sm overflow-hidden group">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-5 border-b md:border-b-0 md:border-r border-border hover:bg-primary/5 transition-colors">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Full Name</p>
                <p className="font-bold text-text tracking-tight">{user?.full_name || 'N/A'}</p>
              </div>
              <div className="p-5 hover:bg-primary/5 transition-colors">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Institution</p>
                <p className="font-bold text-text tracking-tight">{user?.school || 'N/A'}</p>
              </div>
            </div>
            <div className="border-t border-border grid grid-cols-1 md:grid-cols-2">
              <div className="p-5 border-b md:border-b-0 md:border-r border-border hover:bg-primary/5 transition-colors">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Department</p>
                <p className="font-bold text-text tracking-tight">{user?.department || 'N/A'}</p>
              </div>
              <div className="p-5 hover:bg-primary/5 transition-colors">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Current Level</p>
                <p className="font-bold text-text tracking-tight flex items-center gap-2">
                  {user?.level || 'N/A'} <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary/60 px-2">Account settings</h3>
        <div className="grid gap-3">
          {[
            { icon: <Bell size={18} />, label: "Notification Center", value: "Active", color: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
            { icon: <Shield size={18} />, label: "Security & Privacy", value: "Encrypted", color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { icon: <Settings size={18} />, label: "Study Preferences", value: "Balanced", color: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" },
          ].map((item, i) => (
            <button key={i} className="bg-white dark:bg-surface border border-border rounded-[24px] p-4 flex items-center justify-between group hover:shadow-md transition-all active:scale-[0.99] text-left">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="font-bold text-sm text-text tracking-tight">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-muted group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary/60 px-2">Support & Session</h3>
        <div className="grid gap-3">
          <button className="card-bento py-4 flex items-center justify-between text-left group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted/10 rounded-xl flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                <ExternalLink size={20} />
              </div>
              <span className="font-bold text-sm tracking-tight">Help & Support</span>
            </div>
            <ChevronRight size={16} className="text-border group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={signOut}
            className="card-bento py-4 flex items-center gap-4 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all border-dashed"
          >
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <LogOut size={20} />
            </div>
             <span className="font-bold text-sm tracking-tight">Log Out</span>
          </button>
        </div>
      </section>

      <p className="text-center text-[10px] text-muted uppercase tracking-[0.3em] font-bold py-8">
        v1.0.0
      </p>
      </div>
    </div>
  );
}
