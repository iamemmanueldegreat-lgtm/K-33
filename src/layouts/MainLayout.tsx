import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Library, User, BookOpen, ShieldAlert, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';
import ThemeToggle from '../components/ThemeToggle';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MainLayout() {
  const { user, simulatedRole, setSimulatedRole } = useAuth();
  const location = useLocation();
  const isNotesPage = location.pathname === '/notes';

  const effectiveIsAdmin = user?.is_admin && simulatedRole === 'admin';

  return (
    <div className={cn(
      "min-h-screen bg-background",
      !isNotesPage && "pb-20"
    )}>
      <main className="max-w-lg mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!isNotesPage && (
        <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 pointer-events-none flex justify-center">
          <nav className="w-[90%] max-w-md h-14 bg-surface/95 backdrop-blur-xl rounded-full flex items-center justify-between px-1.5 shadow-lg shadow-black/5 border border-border pointer-events-auto">
            <NavLink to="/" className={({ isActive }) => cn(
              "h-11 flex items-center gap-2 px-3.5 rounded-full transition-all duration-300",
              isActive ? "bg-primary text-white" : "text-muted hover:text-text"
            )}>
              {({ isActive }) => (
                <>
                  <Home size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.span 
                      layoutId="nav-label-1"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      Home
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>

            <NavLink to="/library" className={({ isActive }) => cn(
              "h-11 flex items-center gap-2 px-3.5 rounded-full transition-all duration-300",
              isActive ? "bg-primary text-white" : "text-muted hover:text-text"
            )}>
              {({ isActive }) => (
                <>
                  <Library size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.span 
                      layoutId="nav-label-1"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      Library
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>

            {effectiveIsAdmin ? (
              <NavLink to="/admin" className={({ isActive }) => cn(
                "h-11 flex items-center gap-2 px-3.5 rounded-full transition-all duration-300",
                isActive ? "bg-primary text-white" : "text-muted hover:text-text"
              )}>
                {({ isActive }) => (
                  <>
                    <ShieldAlert size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.span 
                        layoutId="nav-label-1"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                      >
                        Admin
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            ) : (
              <NavLink to="/practice" className={({ isActive }) => cn(
                "h-11 flex items-center gap-2 px-3.5 rounded-full transition-all duration-300",
                isActive ? "bg-primary text-white" : "text-muted hover:text-text"
              )}>
                {({ isActive }) => (
                  <>
                    <BookOpen size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.span 
                        layoutId="nav-label-1"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                      >
                        Practice
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            )}

            <NavLink to="/notes" className={({ isActive }) => cn(
              "h-11 flex items-center gap-2 px-3.5 rounded-full transition-all duration-300",
              isActive ? "bg-primary text-white" : "text-muted hover:text-text"
            )}>
              {({ isActive }) => (
                <>
                  <FileText size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.span 
                      layoutId="nav-label-1"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      Notes
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>
            
            <NavLink to="/profile" className={({ isActive }) => cn(
              "h-11 flex items-center gap-2 px-3.5 rounded-full transition-all duration-300",
              isActive ? "bg-primary text-white" : "text-muted hover:text-text"
            )}>
              {({ isActive }) => (
                <>
                  <User size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.span 
                      layoutId="nav-label-1"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      Profile
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>
          </nav>
        </div>
      )}

      {user?.is_admin && simulatedRole === 'student' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <button 
            onClick={() => setSimulatedRole('admin')}
            className="bg-[#0F0F0F] text-white px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-2xl hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
          >
            <ShieldAlert size={14} className="text-red-500" />
            Return to Admin View
          </button>
        </div>
      )}
    </div>
  );
}
