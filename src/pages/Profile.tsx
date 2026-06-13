import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut, ChevronRight, ChevronLeft, Shield, Bell, ExternalLink,
  Camera, Loader2, Crown, Download, Smartphone, Share,
  Plus, X, CheckCircle2, GraduationCap, Pencil, BookOpen, Wallet
} from 'lucide-react';
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
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { isInstalled, installable, isIPhone, triggerInstall } = usePWA();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const base64Url = await compressImage(file, 400, 400);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { avatar_url: base64Url });
      toast.success('Profile picture updated!');
      await refreshProfile();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to upload image. Please check file format.');
      try {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      } catch(e) {}
    } finally {
      setUploadingAvatar(false);
    }
  };

  const accountItems = [
    {
      icon: <Pencil size={18} />,
      label: 'Edit Profile',
      color: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
      onClick: () => navigate('/edit-profile'),
    },
    {
      icon: <GraduationCap size={18} />,
      label: 'Academic Profile',
      color: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
      onClick: () => navigate('/academic-profile'),
    },
    {
      icon: <Bell size={18} />,
      label: 'Notifications',
      color: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
      onClick: () => navigate('/notifications'),
    },
    {
      icon: <Shield size={18} />,
      label: 'Security & Privacy',
      color: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      onClick: () => {},
    },
  ];

  const settingsItems = [
    {
      icon: <Smartphone size={18} />,
      label: isInstalled ? 'App Installed' : 'Install App',
      color: 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
      onClick: async () => {
        if (isInstalled) return;
        if (installable) {
          const ok = await triggerInstall();
          if (ok) toast.success('Thank you for installing Kortex AI!');
        } else {
          setShowInstructions(true);
        }
      },
      trailing: isInstalled
        ? <CheckCircle2 size={16} className="text-emerald-500" />
        : undefined,
    },
    {
      icon: <ExternalLink size={18} />,
      label: 'Help & Support',
      color: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
      onClick: () => {},
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0e0e12] pb-28">

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-14 pb-5">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 flex items-center justify-center shadow-sm active:scale-90 hover:scale-[1.03] transition-all"
        >
          <ChevronLeft size={20} className="text-zinc-800 dark:text-zinc-100" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-100 font-sans">Profile</h1>
        <button
          onClick={() => navigate('/edit-profile')}
          className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 flex items-center justify-center shadow-sm active:scale-90 hover:scale-[1.03] transition-all"
          title="Edit Profile"
        >
          <Pencil size={18} className="text-zinc-800 dark:text-zinc-100" />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center pt-3 pb-8 px-3">
        <div className="relative group mb-4">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-md flex items-center justify-center bg-primary text-white text-3xl font-bold relative transition-transform hover:scale-[1.02]"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0).toUpperCase() || 'U'
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {uploadingAvatar
                ? <Loader2 size={24} className="animate-spin text-white" />
                : <Camera size={22} className="text-white" />}
            </div>
          </button>

          {user?.is_pro && (
            <div className="absolute bottom-1 right-1 bg-amber-500 text-white p-1.5 rounded-full border-2 border-white dark:border-[#0e0e12] shadow-sm">
              <Crown size={12} fill="currentColor" />
            </div>
          )}
        </div>

        <input
          type="file"
          ref={avatarInputRef}
          hidden
          accept="image/*"
          onChange={handleAvatarUpload}
        />

        <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          {user?.full_name || 'Student User'}
        </h2>
        <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 mt-1">{user?.email}</p>
        
        {user?.school && (
          <span className="mt-3.5 px-3 py-1 bg-primary/10 text-primary dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary/20">
            {user.school}
          </span>
        )}
      </div>

      <div className="px-3 space-y-6 max-w-lg mx-auto">

        {/* Admin Panel */}
        {user?.is_admin && (
          <motion.button
            onClick={() => navigate('/admin')}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 w-full bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-[24px] p-4.5 border border-amber-500/20 shadow-sm text-left active:scale-[0.99] transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
              <Shield size={18} fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Admin Workspace</p>
              <p className="text-[15px] font-bold text-white truncate">Internal Admin Panel</p>
            </div>
            <ChevronRight size={18} className="text-amber-400 shrink-0" />
          </motion.button>
        )}

        {/* Rep Portal */}
        {user?.is_rep && (
          <motion.button
            onClick={() => navigate('/rep')}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 w-full bg-white dark:bg-zinc-900 rounded-[24px] p-4.5 border border-blue-500/20 shadow-sm text-left active:scale-[0.99] transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Wallet size={18} fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Earnings & Referrals</p>
              <p className="text-[15px] font-bold text-zinc-900 dark:text-white truncate">Rep Portal</p>
            </div>
            <ChevronRight size={18} className="text-zinc-400 shrink-0" />
          </motion.button>
        )}

        {/* Premium / Upgrade Banner */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/billing')}
          className={`w-full flex items-center gap-4 rounded-[24px] p-4.5 shadow-sm text-left active:scale-[0.99] transition-all border ${
            user?.is_pro
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500/20 text-white'
              : 'bg-gradient-to-r from-primary to-primary/80 border-primary/20 text-white'
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/10">
            <Crown size={18} className="text-white" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-black">
              {user?.is_pro ? 'Premium Active 👑' : 'Upgrade to Pro'}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5 leading-tight font-medium">
              {user?.is_pro
                ? 'Your semester/monthly premium pass is fully active'
                : 'Unlock Kortex AI tutor, mock files & smart summaries'}
            </p>
          </div>
          <ChevronRight size={18} className="text-white/80 shrink-0" />
        </motion.button>

        {/* Account Settings Section */}
        <div>
          <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 px-1 mb-3">
            User information
          </p>
          <div className="space-y-3">
            {accountItems.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className="w-full h-16 flex items-center justify-between px-4 bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[20px] shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-zinc-150/50 dark:border-zinc-800/40 ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Academic Details (Disabled Display in clean format) */}
        <div>
          <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 px-1 mb-3">
            Academic Status
          </p>
          <div className="bg-white dark:bg-[#16161c] border border-zinc-200/80 dark:border-zinc-800/80 rounded-[24px] px-5 py-1.5 shadow-sm">
            {[
              { label: 'Department / Course', value: user?.department, color: 'text-violet-500' },
              { label: 'Academic Level', value: user?.level, color: 'text-emerald-500' },
              { label: 'Current State', value: user?.state, color: 'text-rose-500' },
            ].map((item, i, arr) => (
              <div
                key={i}
                className={`flex items-center justify-between py-4 ${
                  i < arr.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800/60' : ''
                }`}
              >
                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">{item.label}</span>
                <span className="text-[14px] font-bold text-zinc-800 dark:text-zinc-100">{item.value || 'Not configured'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div>
          <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 px-1 mb-3">
            Application Settings
          </p>
          <div className="space-y-3">
            {settingsItems.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className="w-full h-16 flex items-center justify-between px-4 bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[20px] shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-zinc-200/30 dark:border-zinc-800/40 ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{item.label}</span>
                </div>
                {item.trailing ?? <ChevronRight size={18} className="text-zinc-400 dark:text-zinc-500 shrink-0" />}
              </button>
            ))}

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="w-full h-16 flex items-center justify-between px-4 bg-white dark:bg-zinc-900/40 border border-red-200/80 dark:border-red-900/30 rounded-[20px] shadow-sm hover:bg-red-50/50 dark:hover:bg-red-950/10 active:scale-[0.99] transition-all text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-500/15 text-red-500 border border-red-200/30 dark:border-red-500/10">
                  <LogOut size={18} />
                </div>
                <span className="text-sm font-bold text-red-500">Log Out</span>
              </div>
              <ChevronRight size={18} className="text-red-300 dark:text-red-900 shrink-0" />
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted/50 uppercase tracking-[0.3em] font-bold pt-2 pb-4">
          Kortex AI · v1.0.0
        </p>
      </div>

      {/* iOS / Browser Install Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#121218] border border-border dark:border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-text"
            >
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-4 right-4 p-2 text-muted hover:text-text rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-90 transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center mt-2 mb-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-3">
                  <Smartphone size={24} />
                </div>
                <h4 className="text-lg font-bold tracking-tight">
                  {isIPhone ? 'Install on iOS Safari' : 'Installation Guide'}
                </h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Add Kortex AI to your Home Screen for a native experience.
                </p>
              </div>

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
                        Tap <strong className="text-primary">Add</strong> in the top right to confirm.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">1</div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                        Open your browser settings menu (the three dots <strong className="text-primary font-mono font-black">⋮</strong>).
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
                        Accept the confirmation popup to finish.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-95 active:scale-[0.98] transition-all"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
