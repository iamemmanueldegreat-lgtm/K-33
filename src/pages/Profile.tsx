import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut, ChevronRight, Shield, Bell, ExternalLink,
  Camera, Loader2, Crown, Download, Smartphone, Share,
  Plus, X, CheckCircle2, GraduationCap, Pencil, BookOpen,
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
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const accountItems = [
    {
      icon: <GraduationCap size={18} />,
      label: 'Academic Profile',
      color: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
      onClick: () => {},
    },
    {
      icon: <Bell size={18} />,
      label: 'Notifications',
      color: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
      onClick: () => {},
    },
    {
      icon: <Shield size={18} />,
      label: 'Security & Privacy',
      color: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      onClick: () => {},
    },
    {
      icon: <BookOpen size={18} />,
      label: 'Study Preferences',
      color: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
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
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white dark:bg-surface border border-border flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <ChevronRight size={18} className="rotate-180 text-text" />
        </button>
        <h1 className="text-base font-bold tracking-tight text-text">Profile</h1>
        <button
          onClick={() => avatarInputRef.current?.click()}
          className="w-9 h-9 rounded-full bg-white dark:bg-surface border border-border flex items-center justify-center shadow-sm active:scale-90 transition-transform"
          title="Edit profile photo"
        >
          <Pencil size={15} className="text-text" />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center pt-4 pb-6 px-5">
        <div className="relative group">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-surface shadow-lg flex items-center justify-center bg-primary text-white text-3xl font-bold"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0).toUpperCase() || 'U'
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {uploadingAvatar
                ? <Loader2 size={22} className="animate-spin text-white" />
                : <Camera size={20} className="text-white" />}
            </div>
          </button>

          {user?.is_pro && (
            <div className="absolute -bottom-1 -right-1 bg-accent text-white p-1.5 rounded-full border-2 border-white dark:border-surface shadow">
              <Shield size={12} fill="currentColor" />
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

        <h2 className="text-xl font-bold mt-4 tracking-tight text-text">
          {user?.full_name || 'Student User'}
        </h2>
        <p className="text-sm text-muted mt-0.5">{user?.email}</p>
        {user?.school && (
          <span className="mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
            {user.school}
          </span>
        )}
      </div>

      <div className="px-4 space-y-5">

        {/* Admin Panel */}
        {user?.is_admin && (
          <motion.a
            href="https://admin.kortexai.online"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-4 w-full bg-gradient-to-r from-[#1a1a20] to-[#22222c] text-white rounded-2xl p-4 border border-amber-500/20 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Shield size={18} fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">Admin Workspace</p>
              <p className="text-sm font-bold text-white truncate">Kortex AI Admin Portal</p>
            </div>
            <ChevronRight size={16} className="text-amber-400 shrink-0" />
          </motion.a>
        )}

        {/* Premium / Upgrade Banner */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/billing')}
          className={`w-full flex items-center gap-4 rounded-2xl p-4 shadow-md text-left ${
            user?.is_pro
              ? 'bg-gradient-to-r from-violet-600 to-purple-600'
              : 'bg-gradient-to-r from-primary to-primary/80'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Crown size={18} className="text-white" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">
              {user?.is_pro ? 'Premium Account' : 'Upgrade to Pro'}
            </p>
            <p className="text-[11px] text-white/75 mt-0.5">
              {user?.is_pro
                ? 'Enjoy all your premium features'
                : 'Unlock AI tutor & unlimited tools'}
            </p>
          </div>
          <ChevronRight size={16} className="text-white/70 shrink-0" />
        </motion.button>

        {/* Account Settings Section */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted px-1 mb-2">
            Account Settings
          </p>
          <div className="bg-white dark:bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            {accountItems.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-white/5 active:bg-neutral-100 dark:active:bg-white/10 transition-colors ${
                  i < accountItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  {item.icon}
                </div>
                <span className="flex-1 text-sm font-semibold text-text">{item.label}</span>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Academic Info */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted px-1 mb-2">
            Academic Info
          </p>
          <div className="bg-white dark:bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            {[
              { label: 'Department', value: user?.department },
              { label: 'Level', value: user?.level },
              { label: 'State', value: user?.state },
            ].map((item, i, arr) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i < arr.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="text-sm text-muted font-medium">{item.label}</span>
                <span className="text-sm font-semibold text-text">{item.value || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted px-1 mb-2">
            Settings
          </p>
          <div className="bg-white dark:bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            {settingsItems.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-white/5 active:bg-neutral-100 dark:active:bg-white/10 transition-colors ${
                  i < settingsItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  {item.icon}
                </div>
                <span className="flex-1 text-sm font-semibold text-text">{item.label}</span>
                {item.trailing ?? <ChevronRight size={16} className="text-muted shrink-0" />}
              </button>
            ))}

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-t border-border hover:bg-red-50 dark:hover:bg-red-500/5 active:bg-red-100 dark:active:bg-red-500/10 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-500/15 text-red-500">
                <LogOut size={18} />
              </div>
              <span className="flex-1 text-sm font-semibold text-red-500">Log Out</span>
              <ChevronRight size={16} className="text-red-300 shrink-0" />
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
