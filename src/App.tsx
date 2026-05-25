import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Analytics } from '@vercel/analytics/react';
import MainLayout from './layouts/MainLayout';
import type { UserProfile } from './types';
import LoadingScreen from './components/LoadingScreen';

const Home = lazy(() => import('./pages/Home'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const Study = lazy(() => import('./pages/Study'));
const Auth = lazy(() => import('./pages/Auth'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Chat = lazy(() => import('./pages/Chat'));
const Course = lazy(() => import('./pages/Course'));
const Billing = lazy(() => import('./pages/Billing'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const AdminRedirect = () => {
  useEffect(() => {
    window.location.href = 'https://admin.kortexai.online';
  }, []);
  return <LoadingScreen />;
};

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  simulatedRole: 'admin' | 'student';
  setSimulatedRole: (role: 'admin' | 'student') => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  signOut: async () => {},
  refreshProfile: async () => {},
  simulatedRole: 'admin',
  setSimulatedRole: () => {}
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<'admin' | 'student'>('admin');

  // Enforce minimum splash screen duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2800); // Wait for the whole animation (dots -> merge -> logo) to have time to finish
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

        setUser(profile);
        setDataLoaded(true);
        
        if (requiresUpdate) {
          try {
            await updateDoc(docRef, {
              streak: updatedStreak,
              last_login_date: todayStr
            });
          } catch (e) {
            console.error("Failed to update streak", e);
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
              <Route path="/admin" element={<AdminRedirect />} />
              <Route path="/course/:courseId" element={<Course />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/billing" element={<Billing />} />
            </Route>
            <Route path="/study/:courseId/:topicId" element={user ? <Study /> : <Navigate to="/auth" />} />

          </Routes>
        </Suspense>
        <Toaster position="top-center" />
        <Analytics />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

