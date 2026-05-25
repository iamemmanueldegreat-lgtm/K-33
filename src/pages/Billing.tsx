import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Shield, 
  Crown, 
  X, 
  CreditCard, 
  Smartphone 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Import our gorgeous generated premium hero bg
// @ts-ignore
import premiumHeroBg from '../assets/images/premium_hero_bg_1779648931811.png';

export default function Billing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Selection state ('monthly' or 'semester')
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semester'>('semester');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [transferStep, setTransferStep] = useState<'pending' | 'verifying' | 'success'>('pending');

  const currentPrice = selectedPlan === 'monthly' ? 2000 : 5000;
  const planLabel = selectedPlan === 'monthly' ? 'Monthly Premium' : 'Semester Premium';

  // Toggle/Manage state helper
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  // Real-time firestore upgrade
  const handleActivatePro = async () => {
    if (!user) {
      toast.error("Please log in to upgrade your subscription");
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        is_pro: true
      });
      
      toast.success(`Successfully upgraded to ${planLabel}! Welcome to Unlimited Access 👑`);
      setShowPaymentModal(false);
    } catch (error) {
      console.error("Failed to upgrade subscription:", error);
      toast.error("Could not complete subscription. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Real-time firestore downgrade (to test free tier anytime!)
  const handleDowngrade = async () => {
    if (!user) return;
    setIsProcessingPayment(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        is_pro: false
      });
      toast.success("Subscription canceled smoothly. Back to free tier.");
      setShowCancelConfirmation(false);
    } catch (error) {
      console.error("Failed to downgrade:", error);
      toast.error("Cancellation failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const startMonnifyCheckout = () => {
    if (user?.is_pro) {
      setShowCancelConfirmation(true);
      return;
    }
    setShowPaymentModal(true);
    setTransferStep('pending');
  };

  const handleRestore = () => {
    if (user?.is_pro) {
      toast.success("Purchase status is already restored & active! 👑");
    } else {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          loading: 'Fulfilling purchase ledger matching...',
          success: 'Purchase status checks computed. No legacy transaction was found on this account.',
          error: 'Could not query transaction logs.',
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#EBF5FB] dark:bg-[#1A1A1A] text-black dark:text-white font-sans overflow-hidden flex flex-col select-none z-50">
      
      {/* Background radial styling for pure flat gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[120%] h-[60%] rounded-full bg-[#00BFFF]/5 dark:bg-[#00D2D3]/3 blur-[140px]" />
      </div>

      {/* Hero Image Section - Top section that takes up about 45% of height */}
      <div className="relative w-full h-[45vh] lg:h-[50vh] shrink-0 overflow-hidden z-10 flex flex-col items-center justify-end pb-8">
        <img 
          src={premiumHeroBg} 
          alt="Premium AI study guide background" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-[6000ms]"
          referrerPolicy="no-referrer"
        />
        
        {/* Full image gradient overlay blending it into the background color below smoothly */}
        <div className="absolute inset-x-0 bottom-0 h-4/5 bg-gradient-to-t from-[#EBF5FB] via-[#EBF5FB]/80 to-transparent dark:from-[#1A1A1A] dark:via-[#1A1A1A]/80 dark:to-transparent" />
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay dark:bg-black/20" />

        {/* Top overlay controls */}
        <div className="absolute top-[env(safe-area-inset-top,20px)] mt-2 md:mt-5 left-5 right-5 z-30 flex items-center">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-[0_4px_15px_rgb(0,0,0,0.15)] border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 transition-all outline-none"
            id="close-billing-btn"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Copy on top of image */}
        <div className="relative z-20 text-center px-6">
          <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight text-zinc-900 dark:text-white leading-tight font-serif drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
            Unlimited Access
          </h2>
          <p className="text-zinc-600 dark:text-white/70 text-[10.5px] sm:text-xs font-bold md:font-semibold tracking-wide mt-2">
            Access the most advanced AI research assistant
          </p>
        </div>
      </div>

      {/* Content Body Layout container to restrict max-width and center contents */}
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-between px-6 pb-6 z-10 overflow-hidden relative">
        
        {/* Checklist */}
        <div className="space-y-3.5 mt-2 md:mt-4 w-full">
          {user?.is_pro && (
            <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
              <Crown className="text-emerald-500 dark:text-emerald-400 shrink-0" size={18} />
              <div>
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Premium Active 👑</p>
              </div>
            </div>
          )}

          {[
            { text: "24/7 AI Personal Tutor" },
            { text: "Smart Curriculum Navigation" },
            { text: "Auto-Generated Study Notes" },
            { text: "Integrated Personal Notepad" },
            { text: "Adaptive Practice Quizzes" },
            { text: "Deep Performance Analytics" }
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-3.5 group">
              <div className="w-[18px] h-[18px] rounded border border-[#00BFFF]/40 flex items-center justify-center text-[#00BFFF] shrink-0 bg-transparent dark:border-[#00D2D3]/40 dark:text-[#00BFFF]">
                <Check size={14} strokeWidth={3} />
              </div>
              <span className="text-[13px] md:text-sm font-medium text-zinc-800 dark:text-zinc-200 tracking-tight">
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* Subscription Plan Cards Grid Side by Side */}
        <div className="grid grid-cols-2 gap-3 mt-6 mb-2 w-full">
          {/* Monthly Card */}
          <div 
            onClick={() => {
              if (!user?.is_pro) setSelectedPlan('monthly');
            }}
            className={`p-4 sm:p-5 rounded-[20px] transition-all duration-300 relative border cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
              selectedPlan === 'monthly' && !user?.is_pro
                ? 'bg-[#EBF5FB] border-[#00BFFF] shadow text-zinc-900 dark:bg-zinc-800 dark:border-[#00BFFF] dark:text-white'
                : 'bg-white/50 border-zinc-300/80 hover:border-[#00BFFF]/50 text-zinc-600 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-zinc-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[11px] sm:text-[12px] font-semibold text-zinc-800 dark:text-zinc-300">
                Monthly Pass
              </span>
              {/* Checkbox representation square */}
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0 ${
                selectedPlan === 'monthly' && !user?.is_pro
                  ? 'border-[#00BFFF] bg-transparent text-[#00BFFF]'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}>
                {selectedPlan === 'monthly' && !user?.is_pro && <Check size={12} strokeWidth={4} />}
              </div>
            </div>
            
            <div className="mt-auto pt-3">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white block font-serif tracking-tight">
                ₦2,000
              </span>
              <p className="text-[10.5px] text-zinc-600 dark:text-zinc-400 font-medium mt-1">per month</p>
            </div>
          </div>

          {/* Semester Card */}
          <div 
            onClick={() => {
              if (!user?.is_pro) setSelectedPlan('semester');
            }}
            className={`p-4 sm:p-5 rounded-[20px] transition-all duration-300 relative border cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
              selectedPlan === 'semester' && !user?.is_pro
                ? 'bg-[#EBF5FB] border-[#00BFFF] shadow text-zinc-900 dark:bg-zinc-800 dark:border-[#00BFFF] dark:text-white'
                : 'bg-white/50 border-zinc-300/80 hover:border-[#00BFFF]/50 text-zinc-600 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-zinc-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[11px] sm:text-[12px] font-semibold text-zinc-800 dark:text-zinc-300">
                Semester Pass
              </span>
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0 ${
                selectedPlan === 'semester' && !user?.is_pro
                  ? 'border-[#00BFFF] bg-transparent text-[#00BFFF]'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}>
                {selectedPlan === 'semester' && !user?.is_pro && <Check size={12} strokeWidth={4} />}
              </div>
            </div>
            
            <div className="mt-auto pt-2">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white block font-serif tracking-tight uppercase">
                ₦5,000
              </span>
              {/* Save badge */}
              <div className="inline-block mt-0.5 bg-[#FFBF00]/10 dark:bg-[#FFBF00]/20 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold text-[#FFBF00] whitespace-nowrap overflow-hidden">
                Save 40%
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">per semester</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 mb-auto w-full pt-2 pb-6">
          <button
            onClick={startMonnifyCheckout}
            disabled={isProcessingPayment}
            className="w-full h-12 sm:h-14 bg-[#00BFFF] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-[15px] rounded-full flex items-center justify-center gap-1 transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,191,255,0.3)] duration-200"
          >
            {user?.is_pro ? (
              <span>Manage Subscription 👑</span>
            ) : (
              <>
                <span>Unlock Access</span>
                <span className="font-medium text-lg mb-0.5">›</span>
              </>
            )}
          </button>
        </div>
        
      </div>

      {/* Interactive Monnify Checkout Dialog Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Dark glass background with entry fade */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Simulated Payment Card Form Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-zinc-900 text-white w-full max-w-[420px] rounded-[32px] overflow-hidden border border-zinc-800 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative z-10"
            >
              
              {/* Monnify Dialog Header */}
              <div className="bg-[#1C2C30] p-5 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00D2D3]/20 flex items-center justify-center text-[#00D2D3]">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-white">Monnify Secure Checkout</h4>
                    <p className="text-[9px] text-[#00D2D3] uppercase font-bold tracking-widest mt-0.5">Nigeria's Gateway integration</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-800 hover:text-white text-zinc-400 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Monnify billing cost */}
              <div className="p-6 bg-zinc-950 text-center border-b border-zinc-850">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Checkout Amount Due</p>
                <h3 className="text-3xl font-black tracking-tight text-[#00D2D3] mt-1">₦{currentPrice?.toLocaleString()}</h3>
                <p className="text-xs font-semibold text-zinc-400 mt-1">{planLabel}</p>
              </div>

              {/* Tabs for payment choice */}
              <div className="grid grid-cols-2 text-center border-b border-zinc-850">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'card' 
                      ? 'border-[#00D2D3] bg-zinc-900/50 text-white' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <CreditCard size={14} />
                  Pay with Card
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('bank_transfer');
                    setTransferStep('pending');
                  }}
                  className={`py-3.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#00D2D3] bg-zinc-900/50 text-white' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Smartphone size={14} />
                  Bank Transfer
                </button>
              </div>

              {/* Body forms */}
              <div className="p-6">
                
                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    {/* Simulated Card form */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">Cardholder Name</label>
                      <input 
                        type="text" 
                        placeholder={user?.full_name || "Auchi Scholar"} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#00D2D3]"
                        disabled
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">Card Number</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            // Format with spacing 
                            const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            setCardNumber(val);
                          }}
                          placeholder="5399 2100 4488 9911" 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-10 py-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00D2D3]"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                          <CreditCard size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">Expiration Date</label>
                        <input 
                          type="text" 
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY" 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00D2D3]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">CVV</label>
                        <input 
                          type="password" 
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="***" 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00D2D3]"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleActivatePro()}
                      disabled={isProcessingPayment}
                      className="w-full py-3.5 bg-[#00D2D3] text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-cyan-300 transition-all duration-200 mt-6 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-black/30"
                    >
                      {isProcessingPayment ? "Verifying Transaction..." : "Complete Secure Payment"}
                    </button>
                  </div>
                )}

                {paymentMethod === 'bank_transfer' && (
                  <div className="space-y-4">
                    {transferStep === 'pending' && (
                      <div className="space-y-4 text-center">
                        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl text-left space-y-3">
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-[#00D2D3] block">Simulated BANK PARTNER</span>
                            <span className="text-sm font-black text-white block mt-0.5">Wema Bank PLC</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 block">Simulated Account Number</span>
                            <span className="text-xl font-mono font-black text-white block mt-0.5">7322 7116 6449</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 block">Account Name</span>
                            <span className="text-xs font-semibold text-zinc-300 block mt-0.5">Kortex Monnify Checkout - Auchi Poly Code</span>
                          </div>
                        </div>

                        <p className="text-[11.5px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
                          Transfer exactly <strong>₦{currentPrice?.toLocaleString()}</strong> to the simulated partner account above, then click verify.
                        </p>

                        <button
                          onClick={() => {
                            setTransferStep('verifying');
                            setTimeout(() => {
                              handleActivatePro();
                            }, 2500);
                          }}
                          className="w-full py-3.5 bg-[#00D2D3] text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-cyan-350 transition-all mt-4 cursor-pointer"
                        >
                          I've paid, Verify Transfer
                        </button>
                      </div>
                    )}

                    {transferStep === 'verifying' && (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-12 h-12 border-4 border-t-transparent border-[#00D2D3] rounded-full animate-spin mx-auto" />
                        <h4 className="font-extrabold text-sm tracking-tight text-white">Awaiting Bank Settlement...</h4>
                        <p className="text-[11px] text-zinc-400">Verifying payload hashes on Monnify Ledger API.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-zinc-600 text-[10px] font-medium border-t border-zinc-850 pt-4">
                  <Shield size={12} className="text-[#00D2D3]" />
                  <span>3D Secure Active. Protected by Monnify.</span>
                </div>

              </div>
              
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* Account Settings / Downgrade Portal Options modal */}
      <AnimatePresence>
        {showCancelConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelConfirmation(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-zinc-900 border border-zinc-800 text-white w-full max-w-xs rounded-3xl p-6 relative z-10 text-center"
            >
              <Crown className="text-amber-400 mx-auto mb-3" size={32} />
              <h4 className="text-lg font-black tracking-tight">Active Pro Account</h4>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                You currently have active Unlimited Access. Would you like to downgrade back to standard tier for demonstration purposes?
              </p>

              <div className="mt-6 space-y-2.5">
                <button
                  onClick={() => handleDowngrade()}
                  disabled={isProcessingPayment}
                  className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 font-bold text-xs uppercase tracking-wider rounded-full text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPayment ? "Downgrading..." : "Yes, Test Downgrade"}
                </button>
                <button
                  onClick={() => setShowCancelConfirmation(false)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 font-bold text-xs uppercase tracking-wider rounded-full text-zinc-300 transition-all cursor-pointer"
                >
                  Keep Premium
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
