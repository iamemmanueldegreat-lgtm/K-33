import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, GraduationCap, BookOpen, Layers, MapPin, Globe, Lock } from 'lucide-react';

export default function AcademicProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const school = user?.school || '';
  const department = user?.department || '';
  const level = user?.level || '';
  const state = user?.state || '';
  const country = (user as any)?.country || 'Nigeria';

  return (
    <div className="h-screen bg-neutral-50 dark:bg-[#0e0e12] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-14 pb-4 shrink-0">
        <button
          onClick={() => navigate('/profile')}
          className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} className="text-zinc-800 dark:text-zinc-100" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-100 font-sans">Academic Profile</h1>
        <div className="w-12" /> {/* alignment spacer */}
      </div>

      <div className="flex-1 w-full px-3 pt-4 pb-10 flex flex-col items-center max-w-lg mx-auto overflow-hidden">
        
        {/* Profile Avatar / Graduation Icon Badge matching EditProfile avatar styling */}
        <div className="relative mb-8 shrink-0">
          <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-md flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <GraduationCap size={44} className="stroke-[1.75]" />
          </div>
        </div>

        {/* Form representation matching input mockup but read-only */}
        <div className="w-full space-y-4 flex-1 overflow-hidden flex flex-col justify-start">
          
          <div className="space-y-1.5 shrink-0">
            <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 block px-1">
              University / School
            </label>
            <div className="w-full bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between shadow-sm">
              <span className="truncate pr-4">{school || 'No school provided'}</span>
              <Lock size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
            </div>
          </div>

          <div className="space-y-1.5 shrink-0">
            <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 block px-1">
              Department / Course
            </label>
            <div className="w-full bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between shadow-sm">
              <span className="truncate pr-4">{department || 'No department provided'}</span>
              <Lock size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
            </div>
          </div>

          <div className="space-y-1.5 shrink-0">
            <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 block px-1">
              Academic Level
            </label>
            <div className="w-full bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between shadow-sm">
              <span>{level || 'No level configured'}</span>
              <Lock size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 block px-1">
                State
              </label>
              <div className="w-full bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between shadow-sm">
                <span className="truncate">{state || 'No state'}</span>
                <Lock size={12} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 block px-1">
                Country
              </label>
              <div className="w-full bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between shadow-sm">
                <span className="truncate">{country || 'Nigeria'}</span>
                <Lock size={12} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
