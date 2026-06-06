import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'dots' | 'merge' | 'logo'>('dots');

  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    const runSequence = () => {
      setPhase('dots');
      t1 = setTimeout(() => setPhase('merge'), 1500); // dots swirling for 1.5s
      t2 = setTimeout(() => setPhase('logo'), 2200); // then they merge
      t3 = setTimeout(() => runSequence(), 3500); // loop the animation instantly after logo shows
    };

    runSequence();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="fixed inset-0 min-h-[100dvh] flex items-center justify-center bg-[#1A1A1A] z-[9999] overflow-hidden">
      <div className="relative w-32 h-32 flex items-center justify-center">
        
        {/* Swirling dots phase */}
        <AnimatePresence>
          {(phase === 'dots' || phase === 'merge') && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ rotate: 0 }}
              animate={{ 
                rotate: 360,
                scale: phase === 'merge' ? 0.2 : 1
              }}
              transition={{ 
                rotate: { duration: 2, ease: "easeInOut" },
                scale: { duration: 0.7, ease: "anticipate" }
              }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {/* Top Left - Light Grey */}
              <motion.div 
                className="absolute w-6 h-6 rounded-full bg-[#D1D1D1]"
                animate={{
                  x: phase === 'merge' ? 0 : [-30, -20, -30],
                  y: phase === 'merge' ? 0 : [-30, -40, -30],
                  scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                  rotate: [0, 45, 90]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {/* Top Right - Red */}
              <motion.div 
                className="absolute w-6 h-6 rounded-full bg-[#D34645]"
                animate={{
                  x: phase === 'merge' ? 0 : [30, 40, 30],
                  y: phase === 'merge' ? 0 : [-30, -20, -30],
                  scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                  rotate: [0, 45, 90]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
              />
              {/* Bottom Right - Blue */}
              <motion.div 
                className="absolute w-6 h-6 rounded-full bg-[#4A79D3]"
                animate={{
                  x: phase === 'merge' ? 0 : [30, 20, 30],
                  y: phase === 'merge' ? 0 : [30, 40, 30],
                  scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                  rotate: [0, 45, 90]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              {/* Bottom Left - Yellow/Orange */}
              <motion.div 
                className="absolute w-6 h-6 rounded-full bg-[#C89B66]"
                animate={{
                  x: phase === 'merge' ? 0 : [-30, -40, -30],
                  y: phase === 'merge' ? 0 : [30, 20, 30],
                  scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                  rotate: [0, 45, 90]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final Logo Phase */}
        <AnimatePresence>
          {phase === 'logo' && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#2A2A2A] border-2 border-[#3A3A3A] shadow-xl flex items-center justify-center overflow-hidden">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-full h-full"
                >
                  <img src="/logo.png" alt="KortexAi Logo" className="w-full h-full object-cover scale-110" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  const [phase, setPhase] = useState<'dots' | 'merge' | 'logo'>('dots');

  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    const runSequence = () => {
      setPhase('dots');
      t1 = setTimeout(() => setPhase('merge'), 1500); 
      t2 = setTimeout(() => setPhase('logo'), 2200); 
      t3 = setTimeout(() => runSequence(), 3500); 
    };

    runSequence();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Swirling dots phase */}
      <AnimatePresence>
        {(phase === 'dots' || phase === 'merge') && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 0 }}
            animate={{ 
              rotate: 360,
              scale: phase === 'merge' ? 0.2 : 1
            }}
            transition={{ 
              rotate: { duration: 2, ease: "easeInOut" },
              scale: { duration: 0.7, ease: "anticipate" }
            }}
            exit={{ opacity: 0, scale: 0 }}
          >
            {/* Top Left - Light Grey */}
            <motion.div 
              className="absolute w-4 h-4 rounded-full bg-[#D1D1D1]"
              animate={{
                x: phase === 'merge' ? 0 : [-20, -10, -20],
                y: phase === 'merge' ? 0 : [-20, -30, -20],
                scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                rotate: [0, 45, 90]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {/* Top Right - Red */}
            <motion.div 
              className="absolute w-4 h-4 rounded-full bg-[#D34645]"
              animate={{
                x: phase === 'merge' ? 0 : [20, 30, 20],
                y: phase === 'merge' ? 0 : [-20, -10, -20],
                scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                rotate: [0, 45, 90]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            />
            {/* Bottom Right - Blue */}
            <motion.div 
              className="absolute w-4 h-4 rounded-full bg-[#4A79D3]"
              animate={{
                x: phase === 'merge' ? 0 : [20, 10, 20],
                y: phase === 'merge' ? 0 : [20, 30, 20],
                scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                rotate: [0, 45, 90]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            {/* Bottom Left - Yellow/Orange */}
            <motion.div 
              className="absolute w-4 h-4 rounded-full bg-[#C89B66]"
              animate={{
                x: phase === 'merge' ? 0 : [-20, -30, -20],
                y: phase === 'merge' ? 0 : [20, 10, 20],
                scaleX: phase === 'merge' ? 1 : [1, 1.5, 1],
                rotate: [0, 45, 90]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Logo Phase */}
      <AnimatePresence>
        {phase === 'logo' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-[#2A2A2A] border-2 border-[#3A3A3A] shadow-xl flex items-center justify-center overflow-hidden">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.2 }}
                 className="w-full h-full"
               >
                 <img src="/logo.png" alt="KortexAi Logo" className="w-full h-full object-cover scale-110" />
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
