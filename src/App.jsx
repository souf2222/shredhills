// src/App.jsx
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useFirestore } from "./hooks/useFirestore";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { EmployeePage } from "./pages/EmployeePage";
import { DriverPage } from "./pages/DriverPage";
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
  const fsData = useFirestore();

  if (authLoading) return <LoadingScreen/>;
  if (!userProfile) return <LoginPage/>;

  // Choose page based on primary function / role.
  // Priority: admin > (has any management perm) → AdminPage; driver-only → DriverPage; else EmployeePage
  const isAdmin = userProfile.role === "admin";
  const hasMgmt = ["canManageUsers","canManageOrders","canManageEvents","canManagePurchases","canManageDeliveries","canViewReports"]
    .some(p => userProfile.permissions?.[p]);
  const jobs = userProfile.jobs || [];
  const isPrimarilyDriver = jobs.includes("driver") && !jobs.includes("employee") && !hasMgmt && !isAdmin;

  if (isAdmin || hasMgmt) return <AdminPage db={fsData}/>;
  if (isPrimarilyDriver)  return <DriverPage db={fsData}/>;
  return <EmployeePage db={fsData}/>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter/>
    </AuthProvider>
  );
}
