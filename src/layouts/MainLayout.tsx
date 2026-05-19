import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Library, User, BarChart2, ShieldAlert, FileText, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';
import { useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MainLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isNotesPage = location.pathname === '/notes';
  const isChatPage = location.pathname === '/chat';
  const isProfilePage = location.pathname === '/profile';
  const hideTabBar = isNotesPage || isChatPage;
  const navigate = useNavigate();

  return (
    <div className={cn(
      "min-h-[100dvh] flex flex-col bg-background",
      !hideTabBar && "pb-20",
      isChatPage && "h-[100dvh] overflow-hidden !pb-0" // override for chat to prevent main page scroll
    )}>
      <main className={cn(
        "flex-1 flex flex-col w-full min-h-0",
        (!isChatPage && !isProfilePage) ? "p-4 sm:p-6 xl:p-8" : "p-0"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className={cn(isChatPage && "flex-1 flex flex-col min-h-0")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!hideTabBar && (
        <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 pointer-events-none flex justify-center">
          <nav className="w-[90%] max-w-md h-16 bg-[#0a0a0a] dark:bg-[#0a0a0a] rounded-full flex items-center justify-between px-2 sm:px-4 shadow-2xl border border-white/5 pointer-events-auto">
            {/* Student Navigation */}
            <>
              <NavLink to="/" className={({ isActive }) => cn(
                "h-12 flex items-center gap-2 px-4 rounded-full transition-all duration-300",
                isActive ? "bg-[#2A2A2A] text-white" : "text-zinc-500 hover:text-zinc-300"
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
                "h-12 flex items-center gap-2 px-4 rounded-full transition-all duration-300",
                isActive ? "bg-[#2A2A2A] text-white" : "text-zinc-500 hover:text-zinc-300"
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

              <NavLink to="/chat" className={({ isActive }) => cn(
                "h-12 flex items-center gap-2 px-4 rounded-full transition-all duration-300",
                isActive ? "bg-[#2A2A2A] text-white" : "text-zinc-500 hover:text-zinc-300"
              )}>
                {({ isActive }) => (
                  <>
                    <MessageSquare size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.span 
                        layoutId="nav-label-1"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                      >
                        Chat
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
              
              <NavLink to="/profile" className={({ isActive }) => cn(
                "h-12 flex items-center gap-2 px-4 rounded-full transition-all duration-300",
                isActive ? "bg-[#2A2A2A] text-white" : "text-zinc-500 hover:text-zinc-300"
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
            </>
          </nav>
        </div>
      )}
    </div>
  );
}
