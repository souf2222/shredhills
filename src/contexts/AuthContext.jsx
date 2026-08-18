// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { auth, loginWithEmail, logout as firebaseLogout } from "../firebase";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { onIdTokenChanged } from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(() => auth?.currentUser ?? null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [authLoading,  setAuthLoading]  = useState(true);

  useEffect(() => {
    let profileUnsub = () => {};
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      profileUnsub();
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserProfile(null);
        setAuthLoading(false);
        return;
      }
      const token = await fbUser.getIdTokenResult();
      const claims = {
        role: token.claims.role,
        permissions: token.claims.permissions || {},
        supplierId: token.claims.supplierId || null,
      };
      // Profiles contain display data only. Authorization always comes from
      // Firebase Auth custom claims, which clients cannot modify.
      const ref = doc(db, "users", fbUser.uid);
      profileUnsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          setUserProfile({ ...snap.data(), ...claims, id: snap.id });
        } else {
          setUserProfile(null);
        }
        setAuthLoading(false);
      }, () => { setAuthLoading(false); });
    });
    return () => {
      profileUnsub();
      unsub();
    };
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
    // Admin always has all permissions
    if (userProfile.role === "admin") return true;
    return !!userProfile.permissions?.[permission];
  };

  const isAdmin = () => userProfile?.role === "admin";

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, authLoading, login, logout, can, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
