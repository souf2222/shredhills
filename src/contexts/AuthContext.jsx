// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { auth, onAuthStateChanged, loginWithEmail, logout as firebaseLogout } from "../firebase";
import { db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [authLoading,  setAuthLoading]  = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserProfile(null);
        setAuthLoading(false);
        return;
      }
      // Listen to profile in Firestore in real-time
      const ref = doc(db, "users", fbUser.uid);
      const profileUnsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          setUserProfile({ ...snap.data(), id: snap.id });
        } else {
          setUserProfile(null);
        }
        setAuthLoading(false);
      }, () => { setAuthLoading(false); });

      return () => profileUnsub();
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    const cred = await loginWithEmail(email, password);
    // Profile will be set via onAuthStateChanged listener
    return cred;
  };

  const logout = async () => {
    await firebaseLogout();
    setUserProfile(null);
    setFirebaseUser(null);
  };

  const can = (permission) => {
    if (!userProfile) return false;
    if (userProfile.role === "admin") return true;
    return !!userProfile.permissions?.[permission];
  };

  const isAdmin = () => userProfile?.role === "admin";
  const hasJob  = (job) => userProfile?.jobs?.includes(job) || false;

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, authLoading, login, logout, can, isAdmin, hasJob }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
