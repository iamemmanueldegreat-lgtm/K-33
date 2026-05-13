import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Crown, Sparkles, Zap, Shield, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

export default function Billing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly Pass',
      price: 2500,
      period: 'month',
      description: 'Flexible access for intensive study periods.',
      features: [
        'Unlimited AI Test generation',
        'Full syllabus mapping',
        'Detailed performance analytics',
        'Remove all advertisements',
        'Priority support'
      ],
      popular: false,
      color: 'primary'
    },
    {
      id: 'semester',
      name: 'Semester Pro',
      price: 10000,
      period: 'semester',
      description: 'The best value for a complete academic semester.',
      features: [
        'Everything in Monthly',
        'Full 4-month access',
        'Save ₦2,000 vs monthly',
        'Early access to beta tools',
        'Exclusive premium badges'
      ],
      popular: true,
      color: 'accent'
    }
  ];

  const handleMonnifyPayment = (amount: number, description: string) => {
    toast.success(`Redirecting to Monnify for ${description}...`);
  };

  return (
    <div className="min-h-[100dvh] bg-background dark:bg-dark-background text-text dark:text-dark-text pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="relative pt-8 pb-16 px-6">
        <div className="w-full flex items-center justify-between relative z-10 px-4 sm:px-6 xl:px-8">
          <button 
            onClick={() => navigate('/profile')}
            className="group flex items-center gap-2 text-sm font-bold bg-surface dark:bg-dark-surface p-2 px-4 rounded-2xl border border-border dark:border-dark-border shadow-sm hover:border-primary/50 transition-all"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Profile</span>
          </button>
          <div className="flex flex-col items-center">
             <h1 className="text-sm font-black uppercase tracking-[0.3em] text-primary opacity-80">Membership</h1>
          </div>
          <div className="w-[88px]"></div> 
        </div>

        <div className="flex flex-col items-center mt-12 relative z-10 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center mb-6 relative"
          >
            <Crown size={40} className="text-primary" fill="currentColor" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white border-2 border-background">
               <Sparkles size={12} fill="currentColor" />
            </div>
          </motion.div>
          <h2 className="text-4xl font-black tracking-tight leading-tight">Pick Your Path</h2>
          <p className="text-muted text-sm mt-3 font-medium max-w-sm mx-auto leading-relaxed">
            Choose between flexible monthly access or a full semester boost to fuel your studies.
          </p>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/15 via-background to-transparent -z-10 blur-[120px] opacity-60"></div>
      </header>

      <main className="w-full px-4 sm:px-6 xl:px-8">
        <div className="grid md:grid-cols-2 gap-8 items-stretch pt-4">
          {subscriptionPlans.map((plan) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -6 }}
              className={`card-bento p-8 md:p-12 flex flex-col relative overflow-hidden transition-all border-2 ${
                plan.id === 'semester' 
                  ? "border-accent shadow-2xl shadow-accent/10 bg-surface dark:bg-dark-surface" 
                  : "border-primary/20 bg-surface/50 dark:bg-dark-surface/50"
              }`}
            >
              {/* Background Accent Image */}
              <img 
                src={`https://picsum.photos/seed/plan-${plan.id}/800/800?blur=4`} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                referrerPolicy="no-referrer"
              />
              
              {plan.id === 'semester' && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-black uppercase px-6 py-2 rounded-bl-3xl tracking-widest">
                  Best Value
                </div>
              )}
              
              <div className="mb-10">
                <h3 className={`text-3xl font-black italic mb-2 ${plan.popular ? "text-accent" : "text-primary"}`}>
                  {plan.name}
                </h3>
                <p className="text-sm text-muted font-medium">{plan.description}</p>
                <div className="mt-8 flex items-baseline gap-2">
                   <span className="text-5xl font-black tracking-tighter">₦{plan.price.toLocaleString()}</span>
                   <span className="text-muted font-bold">/ {plan.period}</span>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div className="w-full h-px opacity-10 bg-current border-dashed border-t mb-6"></div>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      plan.popular ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-bold tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => handleMonnifyPayment(plan.price, plan.name)}
                className={`mt-12 w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                  plan.popular 
                    ? "bg-accent text-white shadow-accent/30 hover:bg-accent/90" 
                    : "bg-primary text-white shadow-primary/30 hover:bg-primary/90"
                }`}
              >
                Enroll in {plan.name} <Zap size={16} fill="currentColor" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Global Footer */}
        <div className="flex flex-col items-center text-center space-y-10 py-24">
          <div className="space-y-4">
             <button className="group relative">
               <span className="text-sm font-black text-text dark:text-dark-text opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                 <Shield size={16} /> Already paid? Refresh Subscription Status
               </span>
               <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
             </button>
             <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em] leading-relaxed max-w-sm">
               Payments secured by <span className="text-text dark:text-white underline decoration-primary decoration-4 underline-offset-4">Monnify</span>
             </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-10 opacity-30 grayscale saturate-0 pointer-events-none">
             <div className="font-black text-xs italic">Auchi Poly Accredited</div>
             <div className="font-black text-xs italic">Secured by Monnify</div>
             <div className="font-black text-xs italic">Kortex © 2026</div>
          </div>
        </div>
      </main>
    </div>
  );
}


