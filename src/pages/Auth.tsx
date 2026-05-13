import { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { BookOpen, AlertCircle, ChevronRight, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { EDO_STATE_SCHOOLS, AUCHI_POLY_DEPARTMENTS } from '../lib/constants';

import { useAuth } from '../App';

const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kaduna", "Kano", "Enugu", "Delta", "Edo", "Anambra", "Ogun", "Ondo", "Kwara", "Plateau", "Bauchi", "Sokoto", "Imo", "Abia"
].sort();

export default function Auth() {
  const { refreshProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    state: '',
    school: '',
    department: '',
    level: '100L'
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
              full_name: formData.fullName,
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

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row items-center justify-center overflow-hidden">
      {/* Left side: Hero Image (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[60%] h-screen relative items-center justify-center overflow-hidden bg-primary/5">
        <img 
          src="https://picsum.photos/seed/kortex-auth-hero/1200/1200?blur=1" 
          alt="Learning Hub" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 saturate-50"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background"></div>
        
        <div className="relative z-10 px-12 lg:px-24">
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="max-w-xl"
           >
             <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-text leading-[0.9]">
               Revolutionizing <span className="text-primary italic">Education</span> in Nigeria.
             </h2>
             <p className="mt-8 text-xl text-muted font-medium max-w-md leading-relaxed">
               Access AI-powered course materials, personalized practice tests, and a smarter way to study.
             </p>
             
             <div className="mt-12 flex gap-8">
                <div className="space-y-1">
                   <p className="text-3xl font-black">10k+</p>
                   <p className="text-xs uppercase font-bold tracking-widest text-muted">Active Students</p>
                </div>
                <div className="space-y-1">
                   <p className="text-3xl font-black">100%</p>
                   <p className="text-xs uppercase font-bold tracking-widest text-muted">AI Personalized</p>
                </div>
             </div>
           </motion.div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full md:w-1/2 lg:w-[40%] flex flex-col items-center justify-center p-6 md:p-12 relative z-20">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center md:items-start mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 bg-surface p-1 overflow-hidden">
            <img src="/logo.png" alt="KortexAi Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-text">KortexAi</h1>
          <p className="text-muted mt-2 text-center">
            Empowering Nigerian students with AI
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isLogin ? (
            <div className="space-y-4 card-bento p-6 shadow-sm">
              <div>
                <label className="block text-sm font-bold mb-1.5 opacity-80">Email Address</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="e.g. student@uni.edu.ng"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 opacity-80">Password</label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <button disabled={loading} className="btn-primary w-full mt-4">
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </div>
          ) : (
            <div className="card-bento p-6 min-h-[400px] flex flex-col shadow-sm">
              <div className="mb-6 flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>

              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1">
                  <h2 className="text-xl font-bold mb-4">Personal Details</h2>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Full Name</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Email Address</label>
                    <input
                      type="email"
                      required
                      className="input-field"
                      placeholder="student@uni.edu.ng"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Password</label>
                    <input
                      type="password"
                      required
                      className="input-field"
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <button type="button" onClick={nextStep} className="btn-primary w-full mt-auto flex items-center justify-center gap-2">
                    Next <ChevronRight size={18} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1">
                  <h2 className="text-xl font-bold mb-4">School Selection</h2>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">State of Institution</label>
                    <select
                      className="input-field"
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                    >
                      <option value="">Select State</option>
                      {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Name of Institution</label>
                    {formData.state === 'Edo' ? (
                      <select
                        required
                        className="input-field"
                        value={formData.school}
                        onChange={e => setFormData({ ...formData, school: e.target.value })}
                      >
                        <option value="" disabled>Select a school in Edo State</option>
                        {EDO_STATE_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. UNILAG, UI, UNIBEN"
                        value={formData.school}
                        onChange={e => setFormData({ ...formData, school: e.target.value })}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 mt-auto">
                    <button type="button" onClick={prevStep} className="bg-border px-6 py-3 rounded-xl font-medium w-full text-text">Back</button>
                    <button type="button" onClick={nextStep} className="btn-primary w-full flex items-center justify-center gap-2">Next <ChevronRight size={18} /></button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1">
                  <h2 className="text-xl font-bold mb-4">Academic Details</h2>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Department</label>
                    {formData.school === 'Auchi Polytechnic' ? (
                      <select
                        required
                        className="input-field"
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="" disabled>Select your department</option>
                        {AUCHI_POLY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. Computer Science"
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Current Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['100L', '200L', '300L', '400L', '500L', 'ND 1', 'ND 2', 'HND 1', 'HND 2'].map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setFormData({ ...formData, level: l })}
                          className={`py-2 rounded-[12px] border text-xs xl:text-sm font-medium transition-all ${formData.level === l ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-auto">
                    <button type="button" onClick={prevStep} className="bg-border px-6 py-3 rounded-xl font-medium w-full text-text">Back</button>
                    <button disabled={loading} className="btn-primary w-full">
                      {loading ? "Joining..." : "Finalize"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-muted">
          {isLogin ? "New to KortexAi?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setIsLogin(!isLogin); setStep(1); }}
            className="text-primary font-bold hover:underline"
          >
            {isLogin ? "Create Account" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
    </div>
  );
}
