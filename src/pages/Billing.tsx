import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

export default function Billing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semester'>('semester');

  const handleMonnifyPayment = (amount: number, description: string) => {
    toast.success(`Redirecting to Monnify for ${description}...`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#EDF7F7] pb-24 font-sans selection:bg-[#0D4C50]/10 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/40 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-[#D1EDED]/50 blur-[100px]" />
        
        {/* Stripes background like in the inspiration */}
        <div className="absolute inset-0 opacity-[0.05]" 
          style={{ 
            backgroundImage: `linear-gradient(90deg, #0D4C50 1px, transparent 1px)`,
            backgroundSize: '100px 100%',
            maskImage: 'linear-gradient(to bottom, black, transparent)' 
          }} 
        />
      </div>

      <header className="relative pt-12 pb-8 px-6 text-center z-10">
        <button 
          onClick={() => navigate('/profile')}
          className="absolute left-6 top-10 group flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-[#0D4C50]/5 hover:bg-[#0D4C50] hover:text-white transition-all duration-300"
        >
          <ArrowLeft size={20} />
        </button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4"
        >
          <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight text-[#1A2E35] leading-tight flex items-center justify-center gap-3">
            Simple & Flexible <span className="text-[#0D4C50]">Pricing</span>
          </h1>
          <p className="text-[#5E717D] text-sm md:text-base max-w-xl mx-auto font-medium">
            Choose the plan that fits your academic goals and study pace. No hidden fees.
          </p>
        </motion.div>

        {/* Toggle Billing */}
        <div className="mt-12 flex justify-center">
          <div className="p-1 bg-white rounded-full shadow-sm flex items-center border border-[#0D4C50]/10">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                billingCycle === 'monthly' 
                  ? 'bg-[#0D4C50] text-white shadow-lg' 
                  : 'text-[#5E717D] hover:text-[#0D4C50]'
              }`}
            >
              Monthly Billing
            </button>
            <button 
              onClick={() => setBillingCycle('semester')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                billingCycle === 'semester' 
                  ? 'bg-[#0D4C50] text-white shadow-lg' 
                  : 'text-[#5E717D] hover:text-[#0D4C50]'
              }`}
            >
              Semester Billing
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 flex justify-center">
        <div className="w-full max-w-md">
          {/* Premium Plan (Featured) */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0D4C50] rounded-[32px] p-8 md:p-10 shadow-2xl shadow-[#0D4C50]/20 relative overflow-hidden text-white lg:py-14"
          >
            {/* Decoration */}
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-[24px] font-bold tracking-tight">Premium</h3>
                <p className="text-white/60 text-sm font-medium mt-1">Full power study experience</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-[11px] font-black uppercase tracking-widest text-white">Most Popular</span>
              </div>
            </div>

            <div className="mb-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={billingCycle}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="flex items-baseline"
                >
                  <span className="text-[54px] font-bold tracking-tighter">
                    ₦{billingCycle === 'monthly' ? '2,000' : '5,000'}
                  </span>
                  <span className="text-white/60 font-bold text-base ml-2">
                    / {billingCycle === 'monthly' ? 'month' : 'semester'}
                  </span>
                </motion.div>
              </AnimatePresence>
              {billingCycle === 'semester' && (
                <div className="mt-2 inline-flex bg-success/20 text-success-foreground px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-success/30">
                  Save 40%
                </div>
              )}
            </div>

            <div className="space-y-4 mb-12">
              {[
                'Unlimited AI Test Generation',
                'Full Syllabus Mapping',
                '24/7 AI Smart Study Assistant',
                'Performance & Progress Analytics',
                'PDF & Document Analysis (Notes to Tests)',
                'Priority AI Response Times',
                'Early Access to New Features',
                'Ad-free Study Environment'
              ].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[15px] font-semibold text-white/90">{f}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleMonnifyPayment(billingCycle === 'monthly' ? 2000 : 5000, `Premium ${billingCycle}`)}
              className="w-full py-4 rounded-full bg-white text-[#0D4C50] font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-[#F3F4F6] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Get Started <Zap size={16} fill="currentColor" />
            </button>
          </motion.div>
        </div>
      </main>

        {/* Security / FAQ hint */}
        <section className="mt-20 text-center pb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#0D4C50]/5 shadow-sm mb-6">
            <Shield size={16} className="text-[#0D4C50]" />
            <span className="text-[12px] font-bold text-[#5E717D] uppercase tracking-wider">Payments Secured by Monnify</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 opacity-40">
            <div className="text-[11px] font-black uppercase tracking-[0.2em]">Auchi Poly Accredited</div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em]">Kortex © 2026</div>
          </div>
        </section>
    </div>
  );
}



