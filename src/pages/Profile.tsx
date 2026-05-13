import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Settings, LogOut, ChevronRight, Shield, Bell, CreditCard, ExternalLink, GraduationCap, Camera, Loader2, User, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="space-y-6 pb-24">
      <header className="flex flex-col items-center py-10 bg-gradient-to-b from-surface to-background border-b border-border relative overflow-hidden">
        {/* Cover Image Background */}
        <div className="absolute inset-0 z-0 opacity-40 dark:opacity-30">
          <img 
            src={user?.cover_url || "https://picsum.photos/seed/kortex-profile-banner/1200/400?blur=2"} 
            alt="Cover" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-surface/50 to-transparent"></div>
        </div>

        <button 
           onClick={() => coverInputRef.current?.click()}
           className="absolute top-4 right-4 z-20 p-2 bg-background/50 hover:bg-background backdrop-blur-md rounded-full shadow-sm transition-colors text-text/80 pointer-events-auto border border-border"
           title="Change Cover Photo"
        >
            {uploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
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
        <motion.div 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/billing')}
          className="card-bento !bg-primary text-white border-none relative overflow-hidden group cursor-pointer p-8"
        >
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <CreditCard size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Membership</span>
            </div>
            <h3 className="text-2xl font-bold">Go Kortex Pro</h3>
            <p className="text-blue-100 text-sm opacity-90 leading-relaxed max-w-[200px]">Unlock unlimited AI analysis and test generation.</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <ChevronRight size={24} />
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
      </motion.div>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted px-4">Personal Details</h3>
        <div className="grid gap-3">
           <div className="card-bento py-4 flex flex-col gap-4">
             <div className="flex px-4 items-center gap-4">
               <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                 <User size={20} className="text-accent" />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Full Name</span>
                 <span className="font-bold text-sm tracking-tight text-text">{user?.full_name || 'N/A'}</span>
               </div>
             </div>
             
             <div className="h-px bg-border/50 mx-4" />
             
             <div className="flex px-4 items-center gap-4">
               <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <Mail size={20} className="text-primary" />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Email Address</span>
                 <span className="font-bold text-sm tracking-tight text-text line-clamp-1">{user?.email || 'N/A'}</span>
               </div>
             </div>

             <div className="h-px bg-border/50 mx-4" />
             
             <div className="flex px-4 items-center gap-4">
               <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                 <MapPin size={20} className="text-warning" />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted uppercase tracking-widest">State / Region</span>
                 <span className="font-bold text-sm tracking-tight text-text">{user?.state || 'N/A'}</span>
               </div>
             </div>
           </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted px-4">Account</h3>
        <div className="grid gap-3">
          {[
            { icon: <GraduationCap size={20} className="text-primary"/>, label: "Academic Info", value: `${user?.level} Level`, color: "bg-primary/10" },
            { icon: <Bell size={20} className="text-warning"/>, label: "Notifications", value: "Enabled", color: "bg-warning/10" },
            { icon: <Shield size={20} className="text-success"/>, label: "Privacy", value: "Secure", color: "bg-success/10" },
          ].map((item, i) => (
            <div key={i} className="card-bento py-4 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted">{item.value}</span>
                <ChevronRight size={16} className="text-border group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted px-4">Preference</h3>
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
