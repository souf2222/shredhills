// src/components/SignatureCanvas.jsx
import { useRef, useState } from "react";

export function SignatureCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [hasLines, setHasLines] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const p = getPos(e, canvas);
    canvas.getContext("2d").beginPath();
    canvas.getContext("2d").moveTo(p.x, p.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const p = getPos(e, canvas);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#1C1C1E"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    setHasLines(true);
  };

  const stop = (e) => { e?.preventDefault(); drawing.current = false; };

  const clear = () => {
    canvasRef.current.getContext("2d").clearRect(0,0,440,200);
    setHasLines(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"white", borderRadius:20, padding:24, width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h3 style={{ fontSize:18, fontWeight:700 }}>✍️ Signature du client</h3>
          <button onClick={onCancel} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#8E8E93" }}>×</button>
        </div>
        <p style={{ fontSize:13, color:"#8E8E93", marginBottom:12 }}>Le client signe directement sur l'écran.</p>
        <div style={{ border:"2px solid #E5E5EA", borderRadius:14, overflow:"hidden", background:"#FAFAFA", position:"relative" }}>
          <canvas ref={canvasRef} width={440} height={200}
            style={{ display:"block", width:"100%", height:200, touchAction:"none", cursor:"crosshair" }}
            onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}/>
          {!hasLines && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <p style={{ color:"#C7C7CC", fontSize:14 }}>← Signer ici →</p>
          </div>}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={clear}>🗑 Effacer</button>
          <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" style={{ flex:2, justifyContent:"center", opacity:hasLines?1:.4 }}
            onClick={() => hasLines && onSave(canvasRef.current.toDataURL("image/png"))}>
            ✅ Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
