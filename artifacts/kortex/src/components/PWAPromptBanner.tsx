import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, Share, X, Plus } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { toast } from 'react-hot-toast';

export default function PWAPromptBanner() {
  const { isInstalled, installable, isIPhone, triggerInstall } = usePWA();
  const [visible, setVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // If already installed, never show
    if (isInstalled) {
      setVisible(false);
      return;
    }

    // Occasional reminder check: check if dismissed within past 2 days
    const dismissedTimestamp = localStorage.getItem('pwa_reminder_dismissed_at');
    const now = Date.now();
    
    if (dismissedTimestamp) {
      const elapsed = now - parseInt(dismissedTimestamp, 10);
      const limit = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
      
      if (elapsed < limit) {
        setVisible(false);
        return;
      }
    }

    // Delay showing the banner for 3 seconds on load to make it feel non-intrusive
    const timer = setTimeout(() => {
      setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleDismiss = () => {
    localStorage.setItem('pwa_reminder_dismissed_at', Date.now().toString());
    setVisible(false);
  };

  const handleInstallClick = async () => {
    if (isIPhone) {
      // Show iOS step instructions
      setShowIosGuide(true);
    } else if (installable) {
      // Trigger native promt
      const success = await triggerInstall();
      if (success) {
        toast.success("Welcome aboard! Kortex AI is now installed.");
        setVisible(false);
      }
    } else {
      // Generic browser popup
      setShowIosGuide(true);
    }
  };

  if (!visible) return null;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[999] bg-white dark:bg-[#121218] border border-purple-500/30 rounded-[28px] p-4 flex gap-4 shadow-2xl backdrop-blur-md text-text"
          >
            {/* Left Brand Icon */}
            <div className="w-10 h-10 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>

            {/* Middle Message */}
            <div className="flex-1 min-w-0 pr-2">
              <h5 className="text-[13px] font-black tracking-tight text-neutral-900 dark:text-white">
                Learn Standalone
              </h5>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                Install Kortex AI for faster load speeds, native screen views, and complete offline guides.
              </p>
              
              <div className="flex gap-3 mt-2.5">
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-neutral-200 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            {/* Right Close Button */}
            <button
              onClick={handleDismiss}
              className="p-1 text-muted hover:text-text rounded-full h-fit hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Modal for instruction guides */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#121218] border border-border dark:border-white/10 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative text-text"
            >
              {/* Close button */}
              <button
                onClick={() => setShowIosGuide(false)}
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
                onClick={() => {
                  setShowIosGuide(false);
                  handleDismiss(); // Dismiss reminder since they are in progress
                }}
                className="w-full mt-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-opacity-95 active:scale-[0.98] transition-all cursor-pointer"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
