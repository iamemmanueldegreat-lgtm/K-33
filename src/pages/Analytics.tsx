import { useState } from 'react';
import { BarChart2, TrendingUp, Clock, Target, CalendarDays } from 'lucide-react';
import { useAuth } from '../App';

export default function Analytics() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6 pb-6 pt-2 h-full flex flex-col">
      <header className="mb-6 px-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <BarChart2 size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <p className="text-muted text-sm px-1">Track your progress and learning patterns.</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-24 h-24 bg-surface border-2 border-border border-dashed rounded-full flex items-center justify-center text-muted mb-6">
          <TrendingUp size={40} className="opacity-50" />
        </div>
        <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
        <p className="text-muted max-w-sm mb-8">
          Detailed analytics on your study time, quiz accuracy, and subject mastery are currently in development.
        </p>

        <div className="w-full max-w-md bg-surface p-6 rounded-2xl border border-border shadow-sm text-left">
           <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4 px-1">Preview of metrics</h3>
           <div className="space-y-4">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                 <Clock size={20} />
               </div>
               <div>
                 <p className="font-bold">Study Time</p>
                 <p className="text-xs text-muted">Track hours spent learning</p>
               </div>
             </div>
             
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                 <Target size={20} />
               </div>
               <div>
                 <p className="font-bold">Quiz Performance</p>
                 <p className="text-xs text-muted">Accuracy across tests</p>
               </div>
             </div>

             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center">
                 <CalendarDays size={20} />
               </div>
               <div>
                 <p className="font-bold">Learning Streak</p>
                 <p className="text-xs text-muted">Consistency over time</p>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
