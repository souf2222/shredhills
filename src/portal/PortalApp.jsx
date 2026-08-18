// src/portal/PortalApp.jsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePortalOrders } from "./usePortalOrders";
import { PortalOrders } from "./PortalOrders";
import { PortalOrderDetail } from "./PortalOrderDetail";
import { Logo } from "../components/Logo";
import { Toast } from "../components/Toast";

export function PortalApp() {
  const { userProfile, firebaseUser, logout } = useAuth();
  const { orders, loading } = usePortalOrders(firebaseUser, userProfile?.supplierId);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", paddingBottom: 40 }}>
      <header style={{ background: "#111", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={40} tone="light" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.3 }}>SHREDHILLS</div>
            <div style={{ fontSize: 11, color: "#8E8E93" }}>Supplier Portal · {userProfile?.displayName}</div>
          </div>
        </div>
        <button onClick={logout} style={{ background: "transparent", color: "white", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
          Sign out
        </button>
      </header>

      <main style={{ padding: "16px 20px" }}>
        <PortalOrders
          orders={orders}
          loading={loading}
          onToast={setToast}
          onSelect={(o) => setSelectedOrder(o)}
        />
        {selectedOrder && (
          <PortalOrderDetail
            order={orders.find((o) => o.id === selectedOrder.id) || selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onToast={setToast}
          />
        )}
      </main>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
