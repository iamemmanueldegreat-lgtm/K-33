import { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import MainLayout from './layouts/MainLayout';
import type { UserProfile } from './types';
import LoadingScreen from './components/LoadingScreen';
// @ts-ignore
import premiumHeroBg from './assets/images/premium_hero_bg_1779648931811.png';

import { CurriculumProvider } from './contexts/CurriculumContext';
import { AuthContext } from './contexts/AuthContext';

import Home from './pages/Home';
import Library from './pages/Library';
import Profile from './pages/Profile';
import Study from './pages/Study';
import Auth from './pages/Auth';
import Analytics from './pages/Analytics';
import Chat from './pages/Chat';
import Course from './pages/Course';
import Billing from './pages/Billing';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';


export default function App() {
  useEffect(() => {
    const img = new Image();
    img.src = premiumHeroBg;
  }, []);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<'admin' | 'student'>('admin');

  // Enforce minimum splash screen duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 100); // Super fast fade-in transition
    return () => clearTimeout(timer);
  }, []);

  const loading = !(dataLoaded && minTimeElapsed);

  const fetchProfile = (id: string) => {
    const docRef = doc(db, 'users', id);
    
    // Use onSnapshot for instant local cache hit and real-time updates
    const unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        profile.id = id;
        if (profile.email === 'alijiojisi73@gmail.com') {
          profile.is_admin = true;
        } else if (profile.email === 'alijiojisi@gmail.com') {
          profile.is_admin = false;
        }

        // Streak logic
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let updatedStreak = profile.streak || 0;
        let requiresUpdate = false;

        if (profile.last_login_date !== todayStr) {
          if (profile.last_login_date === yesterdayStr) {
            updatedStreak += 1;
          } else {
            updatedStreak = 1; // missed a day, reset. Or 1 since today is first day back
          }
          profile.streak = updatedStreak;
          profile.last_login_date = todayStr;
          requiresUpdate = true;
        }

        // Initialize active_days and study_hours_by_date if not present
        let updatedActiveDays = [...(profile.active_days || [])];
        let updatedStudyHours = { ...(profile.study_hours_by_date || {}) };
        let updatedAcademicStats = { ...(profile.academic_stats_by_date || {}) };

        // Do NOT push today into active_days on every login.
        // active_days is only updated by the study-time tracker (when actual study occurs).
        // Analytics derives active days from study_hours_by_date keys with hours > 0.
        if (updatedStudyHours[todayStr] === undefined) {
          updatedStudyHours[todayStr] = 0; // Starts at 0 to track actual real study time
          requiresUpdate = true;
        }
        if (updatedAcademicStats[todayStr] === undefined) {
          updatedAcademicStats[todayStr] = {
            answered: 0,
            right: 0,
            coins: 0,
            finished_reading: 0,
            started_reading: 0
          };
          requiresUpdate = true;
        }

        profile.active_days = updatedActiveDays;
        profile.study_hours_by_date = updatedStudyHours;
        profile.academic_stats_by_date = updatedAcademicStats;

        setUser(profile);
        setDataLoaded(true);
        
        if (requiresUpdate) {
          try {
            await updateDoc(docRef, {
              streak: updatedStreak,
              last_login_date: todayStr,
              active_days: updatedActiveDays,
              study_hours_by_date: updatedStudyHours,
              academic_stats_by_date: updatedAcademicStats
            });
          } catch (e) {
            console.error("Failed to update streak and analytics profile data:", e);
          }
        }
      } else {
        // Initial setup might be writing, ignore or default
        setDataLoaded(true);
      }
    }, (error) => {
      console.error("Error fetching profile", error);
      setDataLoaded(true);
    });

    return unsubscribeProfile;
  };

  useEffect(() => {
    let unsubscribeProfile: () => void;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeProfile = fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setDataLoaded(true);
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Live Study Focus Time tracking (updates active_days & focus hours in real-time)
  useEffect(() => {
    if (!user || !user.id) return;

    let accumulatedSeconds = 0;
    const intervalTime = 15000; // Track every 15 seconds
    const saveThreshold = 45000; // Write to Firestore every 45 seconds of continuous active usage

    const saveActivity = async () => {
      if (accumulatedSeconds <= 0) return;
      if (!auth.currentUser) return;
      const hoursEarned = accumulatedSeconds / 3600;
      accumulatedSeconds = 0; // reset

      const todayStr = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'users', user.id);

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profile = docSnap.data();
          const activeDays: string[] = [...(profile.active_days || [])];
          const studyHours = { ...(profile.study_hours_by_date || {}) };
          const MAX_DAILY_HOURS = 16; // prevent absurd values from open tabs
          studyHours[todayStr] = Math.min(
            MAX_DAILY_HOURS,
            Math.round(((studyHours[todayStr] || 0) + hoursEarned) * 100) / 100
          );

          // Only mark a day as active when actual study time is recorded
          if (!activeDays.includes(todayStr)) {
            activeDays.push(todayStr);
          }

          await updateDoc(docRef, {
            active_days: activeDays,
            study_hours_by_date: studyHours
          });
        }
      } catch (err) {
        console.error("Failed to persist live study time:", err);
      }
    };

    const interval = setInterval(() => {
      // Only count time when the tab is actually visible (not hidden/background)
      if (document.visibilityState !== 'visible') return;
      accumulatedSeconds += intervalTime / 1000;
      if (accumulatedSeconds >= saveThreshold / 1000) {
        saveActivity();
      }
    }, intervalTime);

    // Save activity on unmount / visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveActivity();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveActivity(); // final save on unmount
    };
  }, [user?.id]);

  const refreshProfile = async () => {
    // onSnapshot handles refresh automatically, but we can keep this for manual triggers
    if (auth.currentUser) {
      // Just re-fetch manually if needed, or rely on snapshot
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        profile.id = auth.currentUser.uid;
        if (profile.email === 'alijiojisi73@gmail.com') {
          profile.is_admin = true;
        } else if (profile.email === 'alijiojisi@gmail.com') {
          profile.is_admin = false;
        }
        setUser(profile);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile, simulatedRole, setSimulatedRole }}>
      <CurriculumProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={user ? <MainLayout /> : <Navigate to="/auth" />}>
                <Route path="/" element={<Home />} />
                <Route path="/library" element={<Library />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/course/:courseId" element={<Course />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/billing" element={<Billing />} />
              </Route>
              <Route path="/study/:courseId/:topicId" element={user ? <Study /> : <Navigate to="/auth" />} />
            </Routes>
          </Suspense>
          <Toaster position="top-center" />
        </BrowserRouter>
      </CurriculumProvider>
    </AuthContext.Provider>
  );
}

