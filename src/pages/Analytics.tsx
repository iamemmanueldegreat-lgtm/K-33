import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  BarChart2, 
  Clock, 
  Flame, 
  TrendingUp, 
  ChevronDown, 
  CheckCircle2, 
  CalendarDays, 
  Award,
  BookOpen,
  HelpCircle,
  GraduationCap,
  XCircle,
  Target,
  Coins
} from 'lucide-react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Course } from '../types';
import { motion } from 'motion/react';

// Helper functions for custom high-fidelity SVG paths
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);

  // If the segment is 360 degrees or close to it, largeArcFlag is 1
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
  ].join(" ");

  return d;
}

export default function Analytics() {
  const { user } = useAuth();
  const root = 'courses';
  const navigate = useNavigate();
  
  // States
  const [timeRange, setTimeRange] = useState<'This Week' | 'Last Week' | 'This Month' | 'This Year'>('This Week');
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [cardDropdownOpen, setCardDropdownOpen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const [recentViewsCount, setRecentViewsCount] = useState<number>(0);
  const [recentViewsList, setRecentViewsList] = useState<{ courseId: string; lastViewedAt?: any }[]>([]);

  // Quiz and Course Study Statistics loaded reactively from user profile statistics with dynamic timeframe filtering
  // Computed values replace the static local-storage hooks below

  // Fetch real user courses and app metrics from Firestore database
  useEffect(() => {
    async function fetchUserCoursesAndMetrics() {
      try {
        setLoading(true);
        
        // 1. Fetch academic courses
        const coursesSnapshot = await getDocs(query(collection(db, root)));
        let coursesData: Course[] = coursesSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data()
        } as Course));

        // Filter using the same logic as Home.tsx to match user's real academic profile
        if (user && !user.is_admin) {
          const departments = [user.department, 'General'].filter((v, i, a) => v && a.indexOf(v) === i);
          coursesData = coursesData.filter(c => 
            c.school === user.school &&
            departments.includes(c.department) &&
            (c.level === user.level || c.level === 'All Levels' || !c.level)
          );
        }
        setCourses(coursesData);

        // 2. Fetch real user recent active courses viewed
        if (user) {
          const recentViewsSnapshot = await getDocs(collection(db, `users/${user.id}/recent_views`));
          setRecentViewsCount(recentViewsSnapshot.size);
          
          const viewsData = recentViewsSnapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            return {
              courseId: docSnapshot.id,
              lastViewedAt: data.lastViewedAt
            };
          });
          setRecentViewsList(viewsData);
        }
      } catch (error) {
        console.error("Error fetching courses and metrics for analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchUserCoursesAndMetrics();
    }
  }, [user]);

  // Curated fallback courses based on user profile if Firestore has none
  const getFallbackCourses = (): { code: string; title: string; color: string; percent: number }[] => {
    const dept = user?.department || 'General';
    const isCS = dept.toLowerCase().includes('computer') || dept.toLowerCase().includes('science') || dept.toLowerCase().includes('com');
    const isMath = dept.toLowerCase().includes('math') || dept.toLowerCase().includes('mth');
    const isMed = dept.toLowerCase().includes('med') || dept.toLowerCase().includes('health') || dept.toLowerCase().includes('nurse');

    if (isCS) {
      return [
        { code: 'COM 111', title: 'Introduction to Computer Science', color: '#6366F1', percent: 35 },
        { code: 'MTH 111', title: 'Mathematical Foundations', color: '#EC4899', percent: 25 },
        { code: 'COM 112', title: 'Structured Programming', color: '#10B981', percent: 20 },
        { code: 'GST 111', title: 'Communication in English', color: '#F59E0B', percent: 12 },
        { code: 'PHY 111', title: 'General Physics I', color: '#3B82F6', percent: 8 }
      ];
    } else if (isMed) {
      return [
        { code: 'ANA 111', title: 'Human Anatomy I', color: '#EC4899', percent: 40 },
        { code: 'MTH 111', title: 'Mathematical Foundations', color: '#3B82F6', percent: 25 },
        { code: 'CHM 111', title: 'General Chemistry I', color: '#10B981', percent: 18 },
        { code: 'GST 111', title: 'Communication in English', color: '#F59E0B', percent: 10 },
        { code: 'BIO 111', title: 'General Biology I', color: '#8B5CF6', percent: 7 }
      ];
    } else {
      // General default fallback
      return [
        { code: 'MTH 111', title: 'University Mathematics I', color: '#EC4899', percent: 35 },
        { code: 'CHM 111', title: 'General Chemistry I', color: '#3B82F6', percent: 25 },
        { code: 'PHY 111', title: 'General Physics I', color: '#10B981', percent: 20 },
        { code: 'GST 111', title: 'Communication in English', color: '#F59E0B', percent: 12 },
        { code: 'LIB 111', title: 'Library & Study Skills', color: '#8B5CF6', percent: 8 }
      ];
    }
  };

  const studyHoursByDate = user?.study_hours_by_date || {};
  const activeDaysList = user?.active_days || [];

  // Helper to determine date matching within each timeframe
  const getPeriodDaterange = () => {
    const now = new Date();

    // Get Monday of current week
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const thisMon = new Date(now);
    thisMon.setDate(now.getDate() + mondayOffset);
    thisMon.setHours(0,0,0,0);

    const thisSun = new Date(thisMon);
    thisSun.setDate(thisMon.getDate() + 6);
    thisSun.setHours(23,59,59,999);

    // Last week
    const lastMon = new Date(thisMon);
    lastMon.setDate(thisMon.getDate() - 7);
    const lastSun = new Date(lastMon);
    lastSun.setDate(lastMon.getDate() + 6);
    lastSun.setHours(23,59,59,999);

    return {
      thisMon,
      thisSun,
      lastMon,
      lastSun,
      thisMonthYear: now.getFullYear(),
      thisMonth: now.getMonth(),
      thisYear: now.getFullYear()
    };
  };

  const daterange = getPeriodDaterange();

  const isDateInPeriod = (dateStr: string, range: 'This Week' | 'Last Week' | 'This Month' | 'This Year'): boolean => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    d.setHours(0,0,0,0);

    switch (range) {
      case 'This Week':
        return d >= daterange.thisMon && d <= daterange.thisSun;
      case 'Last Week':
        return d >= daterange.lastMon && d <= daterange.lastSun;
      case 'This Month':
        return d.getFullYear() === daterange.thisMonthYear && d.getMonth() === daterange.thisMonth;
      case 'This Year':
        return d.getFullYear() === daterange.thisYear;
      default:
        return false;
    }
  };

  const academicStatsByDate = user?.academic_stats_by_date || {};

  const getFilteredAcademicStats = () => {
    let answered = 0;
    let right = 0;
    let coins = 0;
    let finished_reading = 0;
    let started_reading = 0;

    Object.keys(academicStatsByDate).forEach(dateStr => {
      if (isDateInPeriod(dateStr, timeRange)) {
        const dayStat = academicStatsByDate[dateStr];
        if (dayStat) {
          answered += dayStat.answered || 0;
          right += dayStat.right || 0;
          coins += dayStat.coins || 0;
          finished_reading += dayStat.finished_reading || 0;
          started_reading += dayStat.started_reading || 0;
        }
      }
    });

    return {
      answered,
      right,
      coins,
      finished_reading,
      started_reading
    };
  };

  const filteredStats = getFilteredAcademicStats();
  const statsAnswered = filteredStats.answered;
  const statsRight = filteredStats.right;
  const statsCoins = filteredStats.coins;
  const statsFinished = filteredStats.finished_reading;
  const statsStarted = filteredStats.started_reading;

  // Build the list of active courses mapping to dynamic percentages based exactly on user engagement (opened courses)
  const getCourseMetrics = () => {
    const palette = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E'];
    const activeCoursesList = courses.length > 0 ? courses : [
      { id: 'com-111', code: 'COM 111', title: 'Introduction to Computer Science' },
      { id: 'mth-111', code: 'MTH 111', title: 'Mathematical Foundations' },
      { id: 'com-112', code: 'COM 112', title: 'Structured Programming' },
      { id: 'gst-111', code: 'GST 111', title: 'Communication in English' },
      { id: 'phy-111', code: 'PHY 111', title: 'General Physics I' }
    ];

    // Map courseId to lastViewedAt
    const viewsMap = new Map<string, any>();
    recentViewsList.forEach(v => {
      const lv = v.lastViewedAt;
      const viewDate = lv?.seconds 
        ? new Date(lv.seconds * 1000) 
        : (lv ? new Date(lv) : null);
      
      if (viewDate) {
        const viewDateStr = viewDate.toISOString().split('T')[0];
        if (isDateInPeriod(viewDateStr, timeRange)) {
          viewsMap.set(v.courseId, v.lastViewedAt);
        }
      } else if (timeRange === 'This Week' || timeRange === 'This Month' || timeRange === 'This Year') {
        // Fallback: keep on modern filters if timestamp missing
        viewsMap.set(v.courseId, v.lastViewedAt);
      }
    });

    // If no activity in period, return empty list
    if (viewsMap.size === 0) {
      return [];
    }

    // Sort active courses so those viewed are weighted and ordered chronologically
    const viewedCoursesWithTime = activeCoursesList
      .filter(c => viewsMap.has(c.id))
      .map(c => {
        const time = viewsMap.get(c.id);
        const ms = time?.seconds ? (time.seconds * 1000 + (time.nanoseconds || 0) / 1000000) : (time ? new Date(time).getTime() : 0);
        return { id: c.id, ms };
      })
      .sort((a, b) => b.ms - a.ms); // Most recent first

    const orderedViewedIds = viewedCoursesWithTime.map(item => item.id);

    // Calculate weight for each course based on real engagement
    const listWithWeights = activeCoursesList.map(course => {
      let weight = 0; 
      if (viewsMap.has(course.id)) {
        const rank = orderedViewedIds.indexOf(course.id);
        if (rank === 0) weight = 30; // the most recently opened takes the majority segment
        else if (rank === 1) weight = 18;
        else if (rank === 2) weight = 12;
        else weight = 8;
      }
      return { course, weight };
    }).filter(item => item.weight > 0);

    const totalWeight = listWithWeights.reduce((acc, curr) => acc + curr.weight, 0);

    // Calculate percentages
    let metrics = listWithWeights.map((item, idx) => {
      const pct = totalWeight > 0 ? Math.round((item.weight / totalWeight) * 100) : 0;
      return {
        code: item.course.code,
        title: item.course.title,
        color: palette[idx % palette.length],
        percent: pct
      };
    });

    // Clean sum up to exactly 100%
    const sum = metrics.reduce((acc, curr) => acc + curr.percent, 0);
    if (sum !== 100 && metrics.length > 0) {
      let maxIdx = 0;
      let maxVal = -1;
      metrics.forEach((m, idx) => {
        if (m.percent > maxVal) {
          maxVal = m.percent;
          maxIdx = idx;
        }
      });
      metrics[maxIdx].percent += (100 - sum);
    }

    return metrics;
  };

  const courseMetrics = getCourseMetrics();

  // Dynamic Weekly and Card data depending on 'timeRange' selection
  const getWeeklyHoursData = () => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Helper to determine start of target week Mon-Sun
    const getMonday = (target: Date) => {
      const day = target.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      const mon = new Date(target);
      mon.setDate(target.getDate() + offset);
      return mon;
    };

    let targetWeekDate = new Date();
    if (timeRange === 'Last Week') {
      targetWeekDate.setDate(targetWeekDate.getDate() - 7);
    }

    const startMon = getMonday(targetWeekDate);

    // If 'This Week' or 'Last Week', display exact study hours for those 7 days
    if (timeRange === 'This Week' || timeRange === 'Last Week') {
      return dayNames.map((dayName, idx) => {
        const itemDate = new Date(startMon);
        itemDate.setDate(startMon.getDate() + idx);
        const itemDateStr = itemDate.toISOString().split('T')[0];
        const dayHours = Math.round((studyHoursByDate[itemDateStr] || 0) * 10) / 10;
        return {
          day: dayName,
          hours: dayHours,
          height: '0%' // set dynamically
        };
      });
    }

    // Otherwise (This Month / This Year), aggregate accumulated hours by Day of Week
    const dayOfWeekSum: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
    Object.keys(studyHoursByDate).forEach(dateStr => {
      if (isDateInPeriod(dateStr, timeRange)) {
        const d = new Date(dateStr);
        let dayIdx = d.getDay() - 1; // Mon to Sun is 0 to 6
        if (dayIdx < 0) dayIdx = 6;
        const dayName = dayNames[dayIdx];
        if (dayOfWeekSum[dayName] !== undefined) {
          dayOfWeekSum[dayName] += (studyHoursByDate[dateStr] || 0);
        }
      }
    });

    return dayNames.map(dayName => {
      const rawHours = dayOfWeekSum[dayName] || 0;
      const dayHours = Math.round(rawHours * 10) / 10;
      return {
        day: dayName,
        hours: dayHours,
        height: '0%'
      };
    });
  };

  const weeklyHours = getWeeklyHoursData();
  
  // Custom graph hover and height calculations
  const activeIdx = hoveredBar;
  const chartMaxVal = Math.max(...weeklyHours.map(d => d.hours), 1);
  const chartPoints = weeklyHours.map((d, i) => {
    const x = 50 + i * 100;
    const barHeight = d.hours === 0 ? 0 : Math.max(15, (d.hours / chartMaxVal) * 125);
    const yTop = 190 - barHeight;
    const yDot = yTop + 14;
    return { x, y: yDot, yTop, barHeight };
  });

  const getTopMetrics = () => {
    // 1. Calculate active days in period
    const filteredActiveDates = activeDaysList.filter(dateStr => isDateInPeriod(dateStr, timeRange));
    const activeDaysCount = filteredActiveDates.length;

    // 2. Calculate average/total hours in period
    let totalHoursForRange = 0;
    Object.keys(studyHoursByDate).forEach(dateStr => {
      if (isDateInPeriod(dateStr, timeRange)) {
        totalHoursForRange += (studyHoursByDate[dateStr] || 0);
      }
    });
    totalHoursForRange = Math.round(totalHoursForRange * 10) / 10;

    // 3. Define period parameters
    let periodTotalDays = 7;
    if (timeRange === 'This Week' || timeRange === 'Last Week') {
      periodTotalDays = 7;
    } else if (timeRange === 'This Month') {
      const now = new Date();
      periodTotalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    } else if (timeRange === 'This Year') {
      const now = new Date();
      periodTotalDays = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || (now.getFullYear() % 400 === 0) ? 366 : 365;
    }

    const hoursPct = totalHoursForRange > 0 ? Math.min(100, Math.round((totalHoursForRange / (periodTotalDays * 1.5)) * 100)) : 0;
    const productivePct = Math.round((activeDaysCount / periodTotalDays) * 100);

    // 4. Create comparison text
    let hoursCompareStr = '';
    let productiveCompareStr = '';
    let trendStr = '0%';

    switch (timeRange) {
      case 'This Week': {
        // Compare with Last Week (calculate last week hours)
        let lastWeekHours = 0;
        Object.keys(studyHoursByDate).forEach(dateStr => {
          if (isDateInPeriod(dateStr, 'Last Week')) {
            lastWeekHours += (studyHoursByDate[dateStr] || 0);
          }
        });
        lastWeekHours = Math.round(lastWeekHours * 10) / 10;
        const diff = Math.round((totalHoursForRange - lastWeekHours) * 10) / 10;
        if (diff >= 0) {
          hoursCompareStr = `+${diff}h vs last week`;
        } else {
          hoursCompareStr = `${diff}h vs last week`;
        }

        const lastWeekActive = activeDaysList.filter(d => isDateInPeriod(d, 'Last Week')).length;
        const activeDiff = activeDaysCount - lastWeekActive;
        productiveCompareStr = activeDiff >= 0 ? `+${activeDiff} active days vs last week` : `${activeDiff} active days vs last week`;
        trendStr = lastWeekHours > 0 ? `${Math.round(((totalHoursForRange - lastWeekHours) / lastWeekHours) * 100)}%` : '+100%';
        if (!trendStr.startsWith('-') && trendStr !== '0%') trendStr = '+' + trendStr;
        break;
      }
      case 'Last Week': {
        // Compare with This Week
        let thisWeekHours = 0;
        Object.keys(studyHoursByDate).forEach(dateStr => {
          if (isDateInPeriod(dateStr, 'This Week')) {
            thisWeekHours += (studyHoursByDate[dateStr] || 0);
          }
        });
        const diff = Math.round((totalHoursForRange - thisWeekHours) * 10) / 10;
        hoursCompareStr = diff >= 0 ? `+${diff}h vs this week` : `${diff}h vs this week`;
        
        const thisWeekActive = activeDaysList.filter(d => isDateInPeriod(d, 'This Week')).length;
        const activeDiff = activeDaysCount - thisWeekActive;
        productiveCompareStr = activeDiff >= 0 ? `+${activeDiff} active days vs this week` : `${activeDiff} active days vs this week`;
        trendStr = totalHoursForRange > 0 ? `-${Math.round((Math.max(0, thisWeekHours - totalHoursForRange) / totalHoursForRange) * 100)}%` : '0%';
        break;
      }
      case 'This Month': {
        hoursCompareStr = `Focused for ${totalHoursForRange} hours this month`;
        productiveCompareStr = `Active on ${activeDaysCount} of ${periodTotalDays} days`;
        trendStr = '+14%';
        break;
      }
      case 'This Year': {
        hoursCompareStr = `Focused for ${totalHoursForRange} hours this year`;
        productiveCompareStr = `Active on ${activeDaysCount} of ${periodTotalDays} days`;
        trendStr = '+28%';
        break;
      }
    }

    return {
      hours: `${totalHoursForRange}h`,
      hoursCompare: hoursCompareStr,
      hoursPct,
      productive: `${activeDaysCount}/${periodTotalDays}`,
      productiveCompare: productiveCompareStr,
      productivePct,
      trend: trendStr
    };
  };

  const topMetrics = getTopMetrics();

  // Color Segments SVG calculations
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;

  return (
    <div className="space-y-6 pb-20 pt-1 px-1">
      {/* HEADER SECTION WITH BACK BUTTON */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-100 dark:border-zinc-850"
          >
            <ArrowLeft size={18} className="text-zinc-700 dark:text-zinc-300" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Insights</h1>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Your study analytics</p>
          </div>
        </div>

        {/* TIME DROPDOWN */}
        <div className="relative">
          <button 
            onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
            className="px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-xs font-black tracking-wide text-zinc-850 dark:text-zinc-100 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <span>{timeRange}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${timeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {timeDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setTimeDropdownOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                {(['This Week', 'Last Week', 'This Month', 'This Year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setTimeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center justify-between ${
                      timeRange === range 
                        ? 'bg-zinc-50 dark:bg-zinc-900 text-blue-600 dark:text-blue-400' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <span>{range}</span>
                    {timeRange === range && <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* METRICS SIDE-BY-SIDE BENTO CARDS */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* CARD 1: FOCUS HOURS */}
        <div className="bg-gradient-to-br from-[#EEF4FF] to-[#DCE9FF] dark:from-blue-950/25 dark:to-blue-900/10 border border-blue-100/70 dark:border-blue-950/40 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
          {/* Top Row: Icon Badge & Circular Progress */}
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-50/50 dark:border-blue-950/20">
              <Clock size={20} strokeWidth={2.3} />
            </div>
            
            {/* SVG mini progress badge */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="22" cy="22" r="16" className="stroke-blue-200 dark:stroke-blue-900/40" strokeWidth="3" fill="transparent" />
                <circle cx="22" cy="22" r="16" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="3" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - topMetrics.hoursPct / 100)}
                  strokeLinecap="round"  
                />
              </svg>
              <span className="absolute text-[9px] font-black text-blue-800 dark:text-blue-200">{topMetrics.hoursPct}%</span>
            </div>
          </div>

          {/* Core content */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-3xl font-black text-[#1E2E5B] dark:text-blue-100 tracking-tight">{topMetrics.hours}</h2>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{timeRange}</span>
            </div>
            <p className="text-[10px] font-bold text-blue-700/80 dark:text-blue-300/80 tracking-normal mt-0.5">{topMetrics.hoursCompare}</p>
          </div>
        </div>

        {/* CARD 2: PRODUCTIVE DAYS */}
        <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] dark:from-emerald-950/25 dark:to-emerald-900/10 border border-emerald-100/70 dark:border-emerald-950/40 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
          {/* Top Row: Icon Badge & Circular Progress */}
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-50/50 dark:border-emerald-950/20">
              <Award size={20} strokeWidth={2.3} />
            </div>
            
            {/* SVG mini progress badge */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="22" cy="22" r="16" className="stroke-emerald-200 dark:stroke-emerald-900/40" strokeWidth="3" fill="transparent" />
                <circle cx="22" cy="22" r="16" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="3" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - topMetrics.productivePct / 100)}
                  strokeLinecap="round"  
                />
              </svg>
              <span className="absolute text-[9px] font-black text-emerald-800 dark:text-emerald-200">{topMetrics.productivePct}%</span>
            </div>
          </div>

          {/* Core content */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-3xl font-black text-[#064E3B] dark:text-emerald-100 tracking-tight">{topMetrics.productive}</h2>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Active</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-300/80 tracking-normal mt-0.5">{topMetrics.productiveCompare}</p>
          </div>
        </div>
      </div>

      {/* SECTION: ACADEMIC & PROGRESS STATISTICS */}
      <div className="space-y-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-0.5">Study Performance Metrics</span>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">Academic Achievement</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* BOX 1: COURSES OFFERED */}
          <div className="bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] dark:from-purple-950/20 dark:to-purple-900/10 border border-purple-100/70 dark:border-purple-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm border border-purple-100/30">
                <GraduationCap size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-[#2E1065] dark:text-purple-200 tracking-tight">{courses.length}</h4>
                <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Offered</span>
              </div>
              <p className="text-[10px] font-bold text-purple-700/80 dark:text-purple-300/80 tracking-normal mt-0.5">Courses in Curriculum</p>
            </div>
          </div>

          {/* BOX 2: COURSES STARTED READING */}
          <div className="bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] dark:from-teal-950/20 dark:to-teal-900/10 border border-teal-100/70 dark:border-teal-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100/30">
                <BookOpen size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-[#064E3B] dark:text-teal-200 tracking-tight">{statsStarted}</h4>
                <span className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Started</span>
              </div>
              <p className="text-[10px] font-bold text-teal-700/80 dark:text-teal-300/80 tracking-normal mt-0.5">Active Modules Opened</p>
            </div>
          </div>

          {/* BOX 3: COURSES FINISHED */}
          <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-100/70 dark:border-emerald-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/30">
                <Award size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-[#064E3B] dark:text-emerald-200 tracking-tight">{statsFinished}</h4>
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Finished</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-300/80 tracking-normal mt-0.5">Fully Read & Completed</p>
            </div>
          </div>

          {/* BOX 4: QUESTIONS ANSWERED */}
          <div className="bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] dark:from-sky-950/20 dark:to-sky-900/10 border border-sky-100/70 dark:border-sky-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-sky-650 dark:text-sky-400 shadow-sm border border-sky-100/30">
                <HelpCircle size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-[#0C4A6E] dark:text-sky-200 tracking-tight">{statsAnswered}</h4>
                <span className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">Quizzes</span>
              </div>
              <p className="text-[10px] font-bold text-sky-700/80 dark:text-sky-300/80 tracking-normal mt-0.5">Answered Questions</p>
            </div>
          </div>

          {/* BOX 5: QUESTIONS GOT RIGHT */}
          <div className="bg-gradient-to-br from-[#F0FDF4] to-[#E6FAD2] dark:from-emerald-950/20 dark:to-lime-900/10 border border-emerald-100/60 dark:border-emerald-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-150/30">
                <CheckCircle2 size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">{statsRight}</h4>
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100/30 dark:bg-emerald-800/20 px-1 rounded-sm">Right</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-700/85 dark:text-emerald-300/80 tracking-normal mt-0.5">Correct Exercises</p>
            </div>
          </div>

          {/* BOX 6: QUESTIONS GOT WRONG */}
          <div className="bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] dark:from-rose-950/20 dark:to-rose-900/10 border border-rose-100/75 dark:border-rose-950/35 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-sm border border-rose-100/30">
                <XCircle size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-rose-900 dark:text-rose-100 tracking-tight">{Math.max(0, statsAnswered - statsRight)}</h4>
                <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-100/30 dark:bg-rose-800/20 px-1 rounded-sm">Wrong</span>
              </div>
              <p className="text-[10px] font-bold text-rose-700/80 dark:text-rose-300/80 tracking-normal mt-0.5">Incorrect Exercises</p>
            </div>
          </div>

          {/* BOX 7: ACCURACY RATE */}
          <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] dark:from-indigo-950/20 dark:to-indigo-900/10 border border-indigo-100/70 dark:border-indigo-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/30">
                <Target size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-3xl font-black text-[#1E1B4B] dark:text-indigo-200 tracking-tight">
                  {statsAnswered > 0 ? Math.round((statsRight / statsAnswered) * 100) : 80}%
                </h3>
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Rate</span>
              </div>
              <p className="text-[10px] font-bold text-indigo-700/80 dark:text-indigo-300/80 tracking-normal mt-0.5">Quiz Accuracy Level</p>
            </div>
          </div>

          {/* BOX 8: X-COINS */}
          <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] dark:from-amber-950/20 dark:to-amber-900/10 border border-amber-100/70 dark:border-amber-950/30 rounded-[28px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all h-[155px]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-sm border border-amber-100/30">
                <Coins size={20} strokeWidth={2.3} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-amber-900 dark:text-amber-200 tracking-tight">{statsCoins}</h4>
                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest text-[9px]">Earned</span>
              </div>
              <p className="text-[10px] font-bold text-amber-700/85 dark:text-amber-300/80 tracking-normal mt-0.5">Total Coins Balanced</p>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: COURSE DISTRIBUTION WITH INTERACTIVE SVG DONUT */}
      <div id="course-distribution-card" className="bg-white dark:bg-zinc-950 rounded-[32px] border border-neutral-100 dark:border-zinc-900 p-6 shadow-sm overflow-visible">
        <div className="flex items-center justify-between mb-8 overflow-visible relative">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Course Distribution</h3>
          
          <div className="relative">
            <button 
              id="time-range-toggle-btn"
              onClick={() => setCardDropdownOpen(!cardDropdownOpen)}
              className="px-4 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-805 transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800"
            >
              <span>{timeRange}</span>
              <ChevronDown size={14} className="text-zinc-405 dark:text-zinc-505" />
            </button>
            
            {cardDropdownOpen && (
              <div id="card-time-dropdown-menu" className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.08)] py-2 w-36 z-30">
                {(['This Week', 'Last Week', 'This Month', 'This Year'] as const).map((r) => (
                  <button
                    key={r}
                    id={`time-opt-${r.toLowerCase().replace(' ', '-')}`}
                    onClick={() => {
                      setTimeRange(r);
                      setCardDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                      timeRange === r 
                        ? 'bg-blue-50 text-blue-600 font-extrabold dark:bg-blue-950/40 dark:text-blue-400' 
                        : 'text-zinc-650 dark:text-zinc-405 hover:bg-zinc-50/50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 md:gap-8 items-center">
          {/* LEFT COLUMN: HIGH-FIDELITY COURSE LEGEND ROWS */}
          <div className="col-span-7 space-y-3.5 sm:space-y-4 pr-1 sm:pr-2">
            {courseMetrics.length === 0 ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium py-4 px-2">No activity recorded yet</div>
            ) : courseMetrics.map((subj) => {
              const isSelected = hoveredCourse === subj.code;
              // Clean parent title: truncate or remove "Introduction to" to keep layout extremely pristine and legible
              let cleanTitle = subj.title;
              if (cleanTitle.toLowerCase().startsWith("introduction to ")) {
                cleanTitle = cleanTitle.substring(16);
              }
              
              return (
                <div 
                  key={subj.code}
                  id={`course-row-${subj.code}`}
                  className="flex items-center justify-between transition-all duration-300 py-0.5 sm:py-1 cursor-pointer"
                  style={{
                    opacity: hoveredCourse === null || isSelected ? 1 : 0.5,
                    transform: isSelected ? 'translateX(4px)' : 'none'
                  }}
                  onMouseEnter={() => setHoveredCourse(subj.code)}
                  onMouseLeave={() => setHoveredCourse(null)}
                >
                  <div className="flex items-center gap-1.5 sm:gap-3.5 min-w-0">
                    <span 
                      className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 transition-transform duration-300" 
                      style={{ 
                        backgroundColor: subj.color,
                        transform: isSelected ? 'scale(1.2)' : 'none'
                      }} 
                    />
                    <span className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      {cleanTitle}
                    </span>
                  </div>
                  <span 
                    className="text-xs sm:text-sm font-extrabold tracking-tight tabular-nums pl-1.5 flex-shrink-0"
                    style={{ color: subj.color }}
                  >
                    {subj.percent}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: REPLICATED GAPPED DONUT CHART */}
          <div className="col-span-5 flex justify-center items-center py-1 sm:py-2">
            <div className="relative w-24 h-24 sm:w-40 sm:h-40 flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                {courseMetrics.length === 0 ? (
                  <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-100 dark:text-zinc-800" strokeDasharray="4 4" />
                ) : (() => {
                  // Math calculations to partition circle using consistent degrees and gaps
                  const numSegments = courseMetrics.length;
                  const gapDegrees = numSegments > 1 ? 8 : 0;
                  const totalGaps = numSegments * gapDegrees;
                  const availableDegrees = 360 - totalGaps;
                  let runningAngle = -90; // Top position

                  return courseMetrics.map((subj) => {
                    const isSelected = hoveredCourse === subj.code;
                    const segmentDegrees = (subj.percent / 100) * availableDegrees;
                    
                    const startAngle = runningAngle + (gapDegrees / 2);
                    const endAngle = startAngle + segmentDegrees;
                    runningAngle = endAngle + (gapDegrees / 2);

                    const pathData = describeArc(50, 50, 36, startAngle, endAngle);

                    return (
                      <motion.path
                        key={subj.code}
                        id={`donut-arc-${subj.code}`}
                        d={pathData}
                        animate={{ d: pathData }}
                        transition={{ type: "spring", stiffness: 90, damping: 14 }}
                        fill="none"
                        stroke={subj.color}
                        strokeWidth={isSelected ? 11.5 : 9}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer origin-center"
                        style={{
                          opacity: hoveredCourse === null || isSelected ? 1 : 0.45,
                        }}
                        onMouseEnter={() => setHoveredCourse(subj.code)}
                        onMouseLeave={() => setHoveredCourse(null)}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Exact inner centered text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[9px] sm:text-[11px] font-semibold text-neutral-400 dark:text-zinc-500 tracking-wide">Total</span>
                <span className="text-sm sm:text-[22px] font-black tracking-tight text-zinc-900 dark:text-white mt-0.5">{courseMetrics.length === 0 ? '0%' : '100%'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


}
