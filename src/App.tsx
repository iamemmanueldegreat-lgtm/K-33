import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import MainLayout from './layouts/MainLayout';
import type { UserProfile } from './types';

const Home = lazy(() => import('./pages/Home'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const Study = lazy(() => import('./pages/Study'));
const Auth = lazy(() => import('./pages/Auth'));
const Admin = lazy(() => import('./pages/Admin'));
const Practice = lazy(() => import('./pages/Practice'));
const PracticeSession = lazy(() => import('./pages/PracticeSession'));
const Notes = lazy(() => import('./pages/Notes'));

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
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<'admin' | 'student'>('admin');

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
        setLoading(false);
        
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
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching profile", error);
      setLoading(false);
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
        setLoading(false);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile, simulatedRole, setSimulatedRole }}>
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        }>
          <Routes>
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
            <Route element={user ? <MainLayout /> : <Navigate to="/auth" />}>
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<Library />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/practice/:courseId" element={<PracticeSession />} />
              <Route path="/notes" element={<Notes />} />
            </Route>
            <Route path="/study/:courseId/:topicId" element={user ? <Study /> : <Navigate to="/auth" />} />

          </Routes>
        </Suspense>
        <Toaster position="top-center" />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

