// src/dashboard/sections/TourneesSection.jsx
import { PageHeader } from "../../components/PageHeader";

export function TourneesSection({ drivers, onNewStop }) {
  return (
    <div>
      <PageHeader title="🚐 Tournées"
        button={{ label: "+ Arrêt", onClick: onNewStop }}
      />
      <div className="card" style={{ textAlign:"center", padding:40, color:"#8E8E93" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🚐</div>
        <p style={{ fontWeight:600 }}>Vue tournées</p>
        <p style={{ fontSize:12, marginTop:4 }}>La gestion complète des routes se trouve dans l'onglet Tournées.</p>
      </div>
    </div>
  );
}
