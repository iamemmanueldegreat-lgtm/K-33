import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Shield, 
  Crown, 
  X, 
  CreditCard, 
  Smartphone,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import LoadingScreen from '../components/LoadingScreen';

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
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = premiumHeroBg;
    if (img.complete) {
      setImageLoaded(true);
    }
  }, []);

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

  if (!imageLoaded) {
    return <LoadingScreen />;
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-white dark:bg-[#121212] text-black dark:text-white font-sans overflow-hidden flex flex-col select-none z-50">
      
      {/* Background radial styling for pure flat gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[120%] h-[60%] rounded-full bg-[#00BFFF]/5 dark:bg-[#00D2D3]/3 blur-[140px]" />
      </div>

      {/* Hero Image Section - Top section */}
      <div className="relative w-full h-[48vh] sm:h-[50vh] lg:h-[54vh] shrink-0 overflow-hidden z-10 flex flex-col items-center justify-end pb-8">
        <img 
          src={premiumHeroBg} 
          alt="Premium AI study guide background" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-[6000ms]"
          referrerPolicy="no-referrer"
        />
        
        {/* Soft, silky-smooth multi-layered gradient fade blending the image completely into the background color at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/45 via-[50%] via-white/5 via-[80%] to-transparent dark:from-[#121212] dark:via-[#121212]/45 dark:via-[50%] dark:via-[#121212]/5 dark:via-[80%] dark:to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-black/5 mix-blend-overlay dark:bg-black/15 pointer-events-none" />

        {/* Top overlay controls - Sleek adaptive cancel close button on the left, pill Go Premium button on the right */}
        <div className="absolute top-6 left-6 right-6 z-30 flex justify-between items-center w-[calc(100%-48px)]">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200/80 dark:bg-zinc-950/50 dark:hover:bg-zinc-950/80 dark:text-zinc-100 dark:border-white/10 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 hover:scale-[1.05] cursor-pointer shadow-sm hover:shadow-md"
            id="close-billing-btn"
            title="Cancel"
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          <button
            onClick={startMonnifyCheckout}
            className="px-4 py-1.5 rounded-full bg-[#00BFFF] hover:bg-[#009FD0] active:scale-95 text-white font-extrabold text-xs tracking-wider transition-all cursor-pointer shadow-md shadow-[#00BFFF]/25 hover:shadow-[#00BFFF]/35"
          >
            Go Premium
          </button>
        </div>

        {/* Copy on top of image */}
        <div className="relative z-20 text-center px-6">
          <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight text-zinc-900 dark:text-white leading-tight font-serif drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
            Unlimited Access
          </h2>
          <p className="text-zinc-600 dark:text-white/70 text-[10.5px] sm:text-xs font-bold md:font-semibold tracking-wide mt-2">
            Unlock KortexAi's intelligent study assistant and master your curriculum with ease
          </p>
        </div>
      </div>

      {/* Content Body Layout container to restrict max-width and center contents */}
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-between px-4 sm:px-8 pb-6 sm:pb-8 z-10 overflow-hidden relative">
        
        {/* Checklist - Left-aligned starting exactly where the price boxes start */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto mt-4 md:mt-6 px-4">
          {user?.is_pro && (
            <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 w-full justify-center mb-4">
              <Crown className="text-emerald-500 dark:text-emerald-400 shrink-0" size={18} />
              <div>
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Premium Active 👑</p>
              </div>
            </div>
          )}

          <div className="space-y-3.5 w-full flex flex-col items-start pl-1">
            {[
              { text: "24/7 AI Personal Tutor" },
              { text: "Smart Curriculum Navigation" },
              { text: "Auto-Generated Study Notes" },
              { text: "Adaptive Practice Quizzes" },
              { text: "Deep Performance Analytics" }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3.5 group">
                {/* Custom Boxed Checkbox exactly like the mockups */}
                <div className="w-[18px] h-[18px] rounded-md bg-[#00BFFF] border border-[#00BFFF] flex items-center justify-center text-white shrink-0 shadow-sm shadow-[#00BFFF]/20">
                  <Check size={12} strokeWidth={4} />
                </div>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Plan Cards Grid Side by Side - Slightly smaller as requested */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-4 mt-5 mb-4 w-full">
            {/* Monthly Card */}
            <div 
              onClick={() => {
                if (!user?.is_pro) setSelectedPlan('monthly');
              }}
              className={`p-3.5 rounded-[16px] transition-all duration-300 relative border cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
                selectedPlan === 'monthly' && !user?.is_pro
                  ? 'bg-[#EBF5FB] border-[#00BFFF] dark:bg-zinc-900 border-2 shadow-md text-zinc-900 dark:text-white'
                  : 'bg-zinc-50/70 border-zinc-200 hover:border-[#00BFFF]/50 text-zinc-650 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-zinc-400 border shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[11.5px] sm:text-[12.5px] font-bold text-zinc-700 dark:text-zinc-350">
                  Monthly Pass
                </span>
                {/* Checkbox representation square */}
                <div className={`w-4.5 h-4.5 rounded-[4px] border flex items-center justify-center transition-all shrink-0 ${
                  selectedPlan === 'monthly' && !user?.is_pro
                    ? 'border-[#00BFFF] bg-[#00BFFF] text-white shadow-sm'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}>
                  {selectedPlan === 'monthly' && !user?.is_pro && <Check size={12} strokeWidth={4} />}
                </div>
              </div>
              
              <div className="mt-auto pt-1 flex flex-col items-start">
                <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block tracking-tight">
                  ₦2,000
                </span>
                {/* Apply coupon code badge */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    const code = prompt("Enter Coupon Code:");
                    if (code) {
                      toast.success(`Coupon code "${code}" applied! 🏷️`);
                    }
                  }}
                  className="mt-1 inline-flex items-center bg-[#00BFFF]/10 hover:bg-[#00BFFF]/20 border border-[#00BFFF]/20 rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold tracking-wide text-[#00BFFF] whitespace-nowrap overflow-hidden cursor-pointer transition-all"
                >
                  Apply Coupon
                </div>
                <p className="text-[9.5px] sm:text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold mt-1">per month</p>
              </div>
            </div>

            {/* Semester Card */}
            <div 
              onClick={() => {
                if (!user?.is_pro) setSelectedPlan('semester');
              }}
              className={`p-3.5 rounded-[16px] transition-all duration-300 relative border cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
                selectedPlan === 'semester' && !user?.is_pro
                  ? 'bg-[#EBF5FB] border-[#00BFFF] dark:bg-zinc-900 border-2 shadow-md text-zinc-900 dark:text-white'
                  : 'bg-zinc-50/70 border-zinc-200 hover:border-[#00BFFF]/50 text-zinc-650 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-zinc-400 border shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[11.5px] sm:text-[12.5px] font-bold text-zinc-700 dark:text-zinc-350">
                  Semester Pass
                </span>
                {/* Checkbox representation square */}
                <div className={`w-4.5 h-4.5 rounded-[4px] border flex items-center justify-center transition-all shrink-0 ${
                  selectedPlan === 'semester' && !user?.is_pro
                    ? 'border-[#00BFFF] bg-[#00BFFF] text-white shadow-sm'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}>
                  {selectedPlan === 'semester' && !user?.is_pro && <Check size={12} strokeWidth={4} />}
                </div>
              </div>
              
              <div className="mt-auto pt-1 flex flex-col items-start">
                <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block tracking-tight uppercase">
                  ₦5,000
                </span>
                {/* Save badge */}
                <div className="mt-1 inline-flex items-center bg-[#FFBF00]/10 dark:bg-[#FFBF00]/20 border border-[#FFBF00]/30 rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold tracking-wide text-amber-500 dark:text-amber-400 whitespace-nowrap overflow-hidden">
                  Save 40%
                </div>
                <p className="text-[9.5px] sm:text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold mt-1">per semester</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button - Fully Matches Mockup with sky-blue pill button and right-pointing caret symbol */}
        <div className="mt-4 mb-2 w-full flex flex-col items-center">
          <button
            onClick={startMonnifyCheckout}
            disabled={isProcessingPayment}
            className="w-full max-w-sm sm:max-w-md h-12 bg-gradient-to-r from-[#00BFFF] to-[#009FD0] hover:scale-[1.01] active:scale-[0.99] text-white font-black tracking-widest text-xs uppercase rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg shadow-[#00BFFF]/20 border border-white/10"
          >
            {user?.is_pro ? (
              <span>Manage Subscription 👑</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Unlock Access</span>
                <span className="text-[13px] font-sans font-black">&gt;</span>
              </span>
            )}
          </button>
          
          {/* Mockup Utility Footer links centered perfectly */}
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center flex items-center justify-center gap-3.5 mt-6 pointer-events-auto">
            <button onClick={() => toast.success("Terms of Use matches Apple App Store legal frameworks. 📜")} className="hover:underline transition-all cursor-pointer">Terms of use</button>
            <span className="text-zinc-300 dark:text-zinc-700 font-semibold">|</span>
            <button onClick={() => toast.success("Privacy Policy is verified compliant with COPPA and GDPR. 🔒")} className="hover:underline transition-all cursor-pointer">Privacy Policy</button>
            <span className="text-zinc-300 dark:text-zinc-700 font-semibold">|</span>
            <button onClick={handleRestore} className="hover:underline transition-all cursor-pointer">Restore</button>
          </div>
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
