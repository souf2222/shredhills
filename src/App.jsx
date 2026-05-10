// src/App.jsx
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useRoute } from "./hooks/useRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { Logo } from "./components/Logo";
import "./styles/globals.css";
import "./seed"; // exposes window.seedDatabase()

function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F2F2F7,#E5E5EA)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <Logo size={60}/>
        <p style={{ marginTop:20, color:"#8E8E93", fontSize:14 }}>Chargement…</p>
      </div>
    </div>
  );
}

function AppRouter() {
  const { userProfile, authLoading } = useAuth();
  const { section, replace } = useRoute();

  // Redirect unauthenticated users to /login and authenticated users away from /login
  useEffect(() => {
    if (authLoading) return;
    if (!userProfile && section !== "login") {
      replace("login");
    } else if (userProfile && section === "login") {
      replace("");
    }
  }, [userProfile, authLoading, section, replace]);

  if (authLoading) return <LoadingScreen/>;
  if (!userProfile) return <LoginPage/>;

  return <DashboardPage/>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter/>
    </AuthProvider>
  );
}
