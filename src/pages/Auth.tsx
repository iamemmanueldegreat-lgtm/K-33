import { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EDO_STATE_SCHOOLS, AUCHI_POLY_DEPARTMENTS, NIGERIAN_SCHOOLS, STANDARD_DEPARTMENTS } from '../lib/constants';

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// For testing purposes, we limit to Edo State & Auchi Polytechnic under ND1/ND2 Computer Science
const NIGERIAN_STATES = ["Edo"];
const REGISTER_SCHOOLS: Record<string, string[]> = {
  'Edo': ['Auchi Polytechnic']
};

export default function Auth() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    password: '',
    firstName: '',
    lastName: '',
    state: 'Edo',
    school: 'Auchi Polytechnic',
    department: 'Computer Science',
    level: 'ND1'
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (step < 3) {
        nextStep();
        return;
      }
      if (formData.password !== confirmPassword) {
        toast.error("Passwords do not match!");
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success("Welcome back!");
        await refreshProfile();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        
        if (user) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              id: user.uid,
              email: formData.email,
              phone_number: formData.phoneNumber,
              full_name: `${formData.firstName} ${formData.lastName}`.trim(),
              state: formData.state,
              school: formData.school,
              department: formData.department,
              level: formData.level,
              is_pro: false
            });
            await refreshProfile();
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
          }
        }
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName.trim()) {
        toast.error("Please enter first name");
        return;
      }
      if (!formData.lastName.trim()) {
        toast.error("Please enter last name");
        return;
      }
      if (!formData.email.trim()) {
        toast.error("Please enter an email address");
        return;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error("Please enter your phone number");
        return;
      }
      if (!formData.password) {
        toast.error("Please enter a password");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (formData.password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    } else if (step === 2) {
      if (!formData.state) {
        toast.error("Please select state of institution");
        return;
      }
      if (!formData.school) {
        toast.error("Please enter or select institution name");
        return;
      }
    }
    setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-[100dvh] bg-background md:bg-[#F3F4F6] flex justify-center items-center font-sans overflow-hidden">
      <div className="w-full h-[100dvh] md:h-[85vh] md:max-h-[850px] md:max-w-[400px] md:rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex flex-col bg-[#14333c] relative overflow-hidden">
        
        {/* Elegant rounded-corner tile grid background inspired by the design */}
        <div className="absolute top-[-2%] left-[-2%] right-[-2%] h-[48%] overflow-hidden pointer-events-none z-0">
          <div className="grid grid-cols-4 gap-3.5 p-6">
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i} 
                className="aspect-square rounded-[22px] border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.035)]"
              />
            ))}
          </div>
        </div>

        {/* Header Section (Dark Phase) */}
        <div className="px-6 pt-14 pb-20 flex flex-col z-0 transition-all duration-500 text-white relative">
          <button 
            onClick={() => {
              if (!isLogin && step > 1) {
                prevStep();
              } else {
                navigate(-1);
              }
            }}
            className="w-11 h-11 bg-white/[0.04] border border-white/10 rounded-[16px] flex items-center justify-center mb-8 transition-colors hover:bg-white/[0.08]"
          >
            <ArrowLeft size={18} className="text-white/90" />
          </button>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={isLogin ? 'login' : `signup-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.18] tracking-tight">
                {isLogin 
                  ? "Go ahead and complete your account and setup" 
                  : step === 1 
                    ? "Sign up now to access your personal account"
                    : step === 2
                      ? "Select your institution for a tailored experience"
                      : "Finalizing your academic profile"
                }
              </h1>
              <p className="text-white/60 text-[14px] sm:text-[15px] font-medium leading-snug">
                {isLogin 
                  ? "Create your account and simplify your workflow instantly."
                  : step === 1 
                    ? "Sign up to access your account and exclusive features."
                    : step === 2
                      ? "Help us find the best resources for your school."
                      : "We'll customize your dashboard based on this."
                }
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Form Section (Theme-Aware) */}
        <div className="flex-1 bg-background dark:bg-card rounded-t-[36px] px-6 pt-8 pb-10 flex flex-col z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative overflow-y-auto custom-scrollbar border-t border-white/10">
          
          {/* Toggle Switch */}
          <div className="bg-muted/10 dark:bg-white/5 rounded-2xl p-1.5 flex mb-8 border border-border/50">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setStep(1); setConfirmPassword(''); }}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 ${isLogin ? 'bg-white shadow-md text-[#14333c] font-black' : 'text-muted/60 dark:text-white/40 hover:text-text/80'}`}
            >
              Log In
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setConfirmPassword(''); }}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 ${!isLogin ? 'bg-white shadow-md text-[#14333c] font-black' : 'text-muted/60 dark:text-white/40 hover:text-text/80'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="flex-1 flex flex-col">
            {isLogin ? (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-5 flex-1 flex flex-col"
              >
                <div>
                  <label className="block text-[12px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-5 py-4 text-[15px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all placeholder:text-muted/40"
                    placeholder="student@uni.edu.ng"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl pl-5 pr-12 py-4 text-[15px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all placeholder:text-muted/40"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-[#14333c] transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 pb-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="w-5 h-5 rounded-lg border-border text-[#14333c] cursor-pointer focus:ring-[#14333c]/20 accent-[#14333c]" />
                    </div>
                    <span className="text-[13px] font-bold text-muted group-hover:text-text transition-colors">Stay Logged In</span>
                  </label>
                  <button type="button" onClick={() => navigate('/forgot-password')} className="text-[13px] font-black text-[#14333c] hover:underline transition-colors">
                    Reset Access
                  </button>
                </div>

                <button disabled={loading} className="w-full bg-[#14333c] hover:opacity-95 active:scale-[0.98] text-white rounded-2xl py-4.5 font-black text-[16px] transition-all shadow-xl shadow-[#14333c]/15 disabled:opacity-70 mt-auto">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       Authenticating...
                    </div>
                  ) : "Enter Dashboard"}
                </button>

                <div className="flex items-center gap-4 mt-6 mb-2">
                  <div className="h-px flex-1 bg-border/60"></div>
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Or login with</span>
                  <div className="h-px flex-1 bg-border/60"></div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                  <button type="button" className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border bg-surface hover:bg-border/30 transition-colors shadow-sm">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    <span className="text-[14px] font-semibold text-text">Google</span>
                  </button>
                  <button type="button" className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border bg-surface hover:bg-border/30 transition-colors shadow-sm">
                    <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" className="w-5 h-5" />
                    <span className="text-[14px] font-semibold text-text">Facebook</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col">
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="Wade"
                          value={formData.firstName}
                          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="Warren"
                          value={formData.lastName}
                          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                        <input
                          type="email"
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="student@uni.edu.ng"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="08012345678"
                          value={formData.phoneNumber}
                          onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl pl-4 pr-12 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-[#14333c] transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl pl-4 pr-12 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <button type="button" onClick={nextStep} className="w-full bg-[#14333c] hover:opacity-95 active:scale-[0.98] text-white rounded-2xl py-4 font-black text-[15px] transition-all shadow-xl mt-auto mt-6">
                      Create Profile
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">State of Institution</label>
                      <select
                        className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230D4C50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .75rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                      >
                        <option value="">Select State</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Institution Name</label>
                      {REGISTER_SCHOOLS[formData.state] ? (
                        <select
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230D4C50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .75rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                          value={formData.school}
                          onChange={e => setFormData({ ...formData, school: e.target.value })}
                        >
                          <option value="" disabled>Select your institution</option>
                          {REGISTER_SCHOOLS[formData.state].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all"
                          placeholder="e.g. UNILAG, UI"
                          value={formData.school}
                          onChange={e => setFormData({ ...formData, school: e.target.value })}
                        />
                      )}
                    </div>
                    <button type="button" onClick={nextStep} className="w-full bg-[#14333c] hover:opacity-95 active:scale-[0.98] text-white rounded-2xl py-4 font-black text-[15px] transition-all shadow-xl mt-auto mt-6">
                      Continue Step 2/3
                    </button>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Academic Department</label>
                      <select
                        required
                        className="w-full bg-surface dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 py-4 text-[14px] font-semibold text-text outline-none focus:border-[#14333c] focus:ring-4 focus:ring-[#14333c]/10 transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230D4C50' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .75rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="" disabled>Select your department</option>
                        {(formData.school === 'Auchi Polytechnic' ? ['Computer Science'] : STANDARD_DEPARTMENTS).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[#14333c]/80 dark:text-teal-400 uppercase tracking-widest mb-1.5 ml-1">Current Level</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['ND1', 'ND2'].map(l => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setFormData({ ...formData, level: l })}
                            className={`py-2.5 rounded-xl border text-[11px] font-black transition-all ${formData.level === l ? 'bg-[#14333c] text-white border-[#14333c] shadow-lg' : 'bg-surface dark:bg-white/5 border-border dark:border-white/10 text-text hover:border-[#14333c]/50'}`}
                          >
                            {l === 'ND1' ? 'ND 1' : l === 'ND2' ? 'ND 2' : l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button disabled={loading} className="w-full bg-[#14333c] hover:opacity-95 active:scale-[0.98] text-white rounded-2xl py-4.5 font-black text-[16px] transition-all shadow-xl disabled:opacity-70 mt-auto mt-6">
                       {loading ? "Registering..." : "Finalize & Join Platform"}
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

