import { useState, useEffect, useRef } from "react";
import { useFirestore } from "./hooks/useFirestore";
import { seedDatabase } from "./seed";
import { initAuth, onAuthStateChanged } from "./firebase";

const Logo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#111"/>
    <g fill="white" opacity=".85">
      <ellipse cx="14" cy="40" rx="3.5" ry="6" transform="rotate(-15 14 40)"/>
      <ellipse cx="12" cy="30" rx="3" ry="5" transform="rotate(-30 12 30)"/>
      <ellipse cx="14" cy="50" rx="3" ry="5" transform="rotate(10 14 50)"/>
      <ellipse cx="66" cy="40" rx="3.5" ry="6" transform="rotate(15 66 40)"/>
      <ellipse cx="68" cy="30" rx="3" ry="5" transform="rotate(30 68 30)"/>
      <ellipse cx="66" cy="50" rx="3" ry="5" transform="rotate(-10 66 50)"/>
    </g>
    <text x="40" y="46" textAnchor="middle" fontSize="19" fontWeight="800"
      fontFamily="Georgia,serif" fill="white" letterSpacing="-0.5">SH</text>
    <ellipse cx="54" cy="26" rx="2.5" ry="3.5" fill="white" opacity=".7"/>
    <ellipse cx="54" cy="24.5" rx="1.2" ry="1.8" fill="white"/>
  </svg>
);

// ─── DONNÉES ──────────────────────────────────────────────────────────────────
const DAY = 86400000;
const N = Date.now();

const INIT_USERS = [
  { id:"ADMIN-000",  name:"Propriétaire", role:"admin",      pin:"1234", color:"#111" },
  { id:"COMPTA-000", name:"Comptable",    role:"accountant", pin:"5678", color:"#007AFF" },
  { id:"EMP-001",    name:"Alexandre",    role:"employee",   pin:"0001", color:"#FF6B35" },
  { id:"EMP-002",    name:"Marika",       role:"employee",   pin:"0002", color:"#007AFF" },
  { id:"EMP-003",    name:"Jordan",       role:"employee",   pin:"0003", color:"#34C759" },
  { id:"LIV-001",    name:"Kevin",        role:"driver",     pin:"9999", color:"#AF52DE" },
];

const INIT_ORDERS = [
  { id:"CMD-001", clientName:"Sophie Tremblay", clientEmail:"sophie@example.com",
    description:"50x t-shirts blanc — logo devant, texte dos",
    assignedTo:"EMP-001", status:"pending", startTime:null, endTime:null,
    elapsed:0, createdAt:N-DAY, deadline:N+4*DAY },
  { id:"CMD-002", clientName:"Marc Bouchard", clientEmail:"marc@example.com",
    description:"12x hoodies noir — impression sérigraphie",
    assignedTo:"EMP-002", status:"inprogress", startTime:N-900000, endTime:null,
    elapsed:0, createdAt:N-2*DAY, deadline:N+1.5*DAY },
  { id:"CMD-003", clientName:"Émilie Roy", clientEmail:"emilie@example.com",
    description:"30x casquettes brodées — logo côté droit",
    assignedTo:"EMP-003", status:"pending", startTime:null, endTime:null,
    elapsed:0, createdAt:N-3*DAY, deadline:N+0.5*DAY },
];

// Arrêts de tournée — assignedTo = id du livreur
const INIT_STOPS = [
  { id:"STOP-001", type:"delivery", assignedTo:"LIV-001",
    clientName:"Sophie Tremblay", clientPhone:"514-555-0101",
    address:"1234 rue Sainte-Catherine, Montréal, QC",
    instructions:"Sonner 2 fois. Laisser au concierge si absent.",
    orderId:"CMD-001", status:"pending",
    completedAt:null, photoUrl:null, signatureUrl:null, note:"" },
  { id:"STOP-002", type:"pickup", assignedTo:"LIV-001",
    clientName:"Marc Bouchard", clientPhone:"514-555-0202",
    address:"567 boul. Saint-Laurent, Montréal, QC",
    instructions:"Ramassage de retour — boîte au nom Bouchard.",
    orderId:null, status:"pending",
    completedAt:null, photoUrl:null, signatureUrl:null, note:"" },
  { id:"STOP-003", type:"delivery", assignedTo:"LIV-001",
    clientName:"Émilie Roy", clientPhone:"438-555-0303",
    address:"890 av. du Parc, Outremont, QC",
    instructions:"Appartement 4B. Code porte : 1234.",
    orderId:"CMD-003", status:"pending",
    completedAt:null, photoUrl:null, signatureUrl:null, note:"" },
];

const INIT_PUNCHES = {
  "EMP-001": [
    { id:"p1", punchIn:N-2*DAY-7*3600000,   punchOut:N-2*DAY-7*3600000+4*3600000,     note:"" },
    { id:"p2", punchIn:N-2*DAY-2.5*3600000, punchOut:N-2*DAY-2.5*3600000+4.5*3600000, note:"" },
    { id:"p3", punchIn:N-DAY-7*3600000,     punchOut:N-DAY-7*3600000+7*3600000,       note:"" },
  ],
  "EMP-002": [
    { id:"p4", punchIn:N-DAY-8*3600000, punchOut:N-DAY-8*3600000+3.5*3600000, note:"" },
    { id:"p5", punchIn:N-DAY-4*3600000, punchOut:N-DAY-4*3600000+4.5*3600000, note:"Repris après dîner" },
  ],
  "EMP-003": [],
  "LIV-001": [],
};

const INIT_PURCHASES = [
  { id:"ACH-001", empId:"EMP-001", empName:"Alexandre", description:"Encre sérigraphie noire 5L",
    amount:87.50, status:"pending", submittedAt:N-3600000*2, photoUrl:"demo", approvedAt:null, refusedReason:"" },
  { id:"ACH-002", empId:"EMP-002", empName:"Marika", description:"Adhésif vinyle blanc 10m",
    amount:43.20, status:"approved", submittedAt:N-DAY, photoUrl:"demo", approvedAt:N-DAY+3600000, refusedReason:"" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtMs    = (ms) => { const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}h ${String(m).padStart(2,"0")}m`:`${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };
const fmtHours = (ms) => { if(!ms||ms<=0)return"0h 00m"; const h=ms/3600000; return `${Math.floor(h)}h ${String(Math.round((h%1)*60)).padStart(2,"0")}m`; };
const fmtDate  = (ts) => new Date(ts).toLocaleDateString("fr-CA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
const fmtShort = (ts) => new Date(ts).toLocaleDateString("fr-CA",{weekday:"short",month:"short",day:"numeric"});
const fmtTime  = (ts) => new Date(ts).toLocaleTimeString("fr-CA",{hour:"2-digit",minute:"2-digit"});
const fmtTimeInput = (ts) => { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const genId    = (p) => `${p}-${Date.now().toString(36).toUpperCase()}`;
const getDL    = (deadline) => { const diff=deadline-Date.now(); if(diff<=0)return{label:"En retard",color:"#FF3B30",urgent:true,overdue:true,days:0,hours:0}; const h=diff/3600000,days=Math.floor(h/24),hours=Math.floor(h%24); return{label:days>0?`${days}j ${hours}h`:`${hours}h`,color:h<24?"#FF3B30":h<48?"#FF9500":"#34C759",urgent:h<24,overdue:false,days,hours}; };
const dayStart = (ts) => { const d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); };
const groupByDay = (sessions) => {
  const map={}; sessions.forEach(s=>{ const k=dayStart(s.punchIn); if(!map[k])map[k]=[]; map[k].push(s); });
  return Object.entries(map).sort(([a],[b])=>Number(b)-Number(a)).map(([dayTs,sess])=>({
    dayTs:Number(dayTs), sessions:sess.sort((a,b)=>a.punchIn-b.punchIn),
    totalMs:sess.reduce((acc,s)=>acc+(s.punchOut?s.punchOut-s.punchIn:0),0),
    hasActive:sess.some(s=>!s.punchOut),
  }));
};
async function sendEmailSimulated(){await new Promise(r=>setTimeout(r,700));}

// ─── PIN PAD ──────────────────────────────────────────────────────────────────
function PinPad({ onSuccess, onBack, userName, userColor }) {
  const [pin,setPin]=useState(""); const [shake,setShake]=useState(false); const MAX=4;
  const press=(d)=>{ if(pin.length>=MAX)return; setPin(p=>p+d); };
  const del=()=>setPin(p=>p.slice(0,-1));
  useEffect(()=>{ if(pin.length===MAX){ const ok=onSuccess(pin); if(!ok){setShake(true);setTimeout(()=>{setShake(false);setPin("");},600);} } },[pin]);
  return (
    <div style={{width:"100%",maxWidth:320,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:60,height:60,borderRadius:18,background:userColor+"20",color:userColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,margin:"0 auto 12px"}}>{userName[0]}</div>
        <p style={{fontSize:18,fontWeight:700,color:"#1C1C1E"}}>{userName}</p>
        <p style={{fontSize:13,color:"#8E8E93",marginTop:4}}>Entrer ton NIP</p>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:36,animation:shake?"shake .4s ease":"none"}}>
        {Array(MAX).fill(0).map((_,i)=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<pin.length?"#1C1C1E":"#E5E5EA",transition:"background .15s",transform:i<pin.length?"scale(1.15)":"scale(1)"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
          <button key={i} onClick={()=>{if(k==="⌫")del();else if(k!=="")press(String(k));}} disabled={k===""}
            style={{height:64,borderRadius:16,border:"none",cursor:k===""?"default":"pointer",background:k===""?"transparent":k==="⌫"?"#F2F2F7":"white",fontSize:k==="⌫"?20:22,fontWeight:600,color:"#1C1C1E",boxShadow:k===""||k==="⌫"?"none":"0 1px 4px rgba(0,0,0,0.08)",transition:"all .1s",fontFamily:"inherit",opacity:k===""?0:1}}
            onMouseDown={e=>{if(k!==""&&k!=="⌫")e.currentTarget.style.background="#F2F2F7";}}
            onMouseUp={e=>{if(k!==""&&k!=="⌫")e.currentTarget.style.background="white";}}>{k}</button>
        ))}
      </div>
      <button onClick={onBack} style={{width:"100%",marginTop:20,padding:"12px",background:"transparent",border:"none",color:"#8E8E93",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>← Changer d'utilisateur</button>
    </div>
  );
}

// ─── SIGNATURE CANVAS ─────────────────────────────────────────────────────────
function SignatureCanvas({ onSave, onCancel }) {
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
    const ctx = canvas.getContext("2d");
    const p = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
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
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    setHasLines(false);
  };

  const save = () => {
    if (!hasLines) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:20,padding:24,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h3 style={{fontSize:18,fontWeight:700}}>✍️ Signature du client</h3>
          <button onClick={onCancel} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#8E8E93"}}>×</button>
        </div>
        <p style={{fontSize:13,color:"#8E8E93",marginBottom:12}}>Le client signe directement sur l'écran.</p>
        <div style={{border:"2px solid #E5E5EA",borderRadius:14,overflow:"hidden",background:"#FAFAFA",position:"relative"}}>
          <canvas ref={canvasRef} width={440} height={200} style={{display:"block",width:"100%",height:200,touchAction:"none",cursor:"crosshair"}}
            onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}/>
          {!hasLines&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><p style={{color:"#C7C7CC",fontSize:14}}>← Signer ici →</p></div>}
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={clear}>🗑 Effacer</button>
          <button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" style={{flex:2,justifyContent:"center",opacity:hasLines?1:.4}} onClick={save}>✅ Confirmer</button>
        </div>
      </div>
    </div>
  );
}

// ─── STOP CONFIRMATION MODAL ──────────────────────────────────────────────────
function StopConfirmModal({ stop, onComplete, onCancel }) {
  const [step,      setStep]      = useState("main"); // main | photo | signature | done
  const [photoTaken,setPhotoTaken]= useState(false);
  const [sigData,   setSigData]   = useState(null);
  const [note,      setNote]      = useState("");
  const [showSig,   setShowSig]   = useState(false);
  const fileRef = useRef(null);

  const canComplete = photoTaken && sigData;

  const complete = () => {
    onComplete({
      ...stop,
      status: "completed",
      completedAt: Date.now(),
      photoUrl: "captured", // en prod: URL du cloud
      signatureUrl: sigData,
      note,
    });
  };

  return (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16}}>
        <div style={{background:"white",borderRadius:"20px 20px 20px 20px",padding:24,width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,.15)"}}>
          <div style={{width:36,height:4,background:"#E5E5EA",borderRadius:2,margin:"0 auto 20px"}}/>

          {/* Infos arrêt */}
          <div style={{background:stop.type==="delivery"?"#EFF6FF":"#FFF8ED",borderRadius:14,padding:"14px 16px",marginBottom:20,borderLeft:`4px solid ${stop.type==="delivery"?"#007AFF":"#FF9500"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:18}}>{stop.type==="delivery"?"📦":"📤"}</span>
              <span style={{fontWeight:700,fontSize:16,color:stop.type==="delivery"?"#007AFF":"#FF9500"}}>{stop.type==="delivery"?"Livraison":"Ramassage"}</span>
            </div>
            <p style={{fontWeight:700,fontSize:15,marginBottom:2}}>{stop.clientName}</p>
            <p style={{fontSize:13,color:"#6D6D72",marginBottom:4}}>📍 {stop.address}</p>
            {stop.clientPhone&&<p style={{fontSize:13,color:"#6D6D72"}}>📞 {stop.clientPhone}</p>}
            {stop.instructions&&<div style={{marginTop:8,background:"rgba(0,0,0,.04)",borderRadius:8,padding:"8px 10px"}}><p style={{fontSize:12,color:"#6D6D72",fontStyle:"italic"}}>💬 {stop.instructions}</p></div>}
          </div>

          <p style={{fontSize:14,fontWeight:600,color:"#1C1C1E",marginBottom:14}}>Confirmation de {stop.type==="delivery"?"livraison":"ramassage"}</p>

          {/* Étape 1 : Photo */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:photoTaken?"#34C759":"#E5E5EA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{photoTaken?"✓":"1"}</div>
                <span style={{fontWeight:600,fontSize:14,color:photoTaken?"#34C759":"#1C1C1E"}}>Photo de preuve</span>
              </div>
              {photoTaken&&<span style={{fontSize:12,color:"#34C759",fontWeight:600}}>✅ Prise</span>}
            </div>
            {!photoTaken&&(
              <button className="btn btn-outline" style={{width:"100%",justifyContent:"center",gap:10}}
                onClick={()=>fileRef.current.click()}>
                <span style={{fontSize:18}}>📸</span> Prendre une photo
              </button>
            )}
            {photoTaken&&(
              <div style={{background:"#EDFFF3",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:"#34C759",fontWeight:600}}>📸 Photo enregistrée</span>
                <button onClick={()=>setPhotoTaken(false)} style={{background:"none",border:"none",fontSize:12,color:"#8E8E93",cursor:"pointer"}}>Reprendre</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) setPhotoTaken(true); }}/>
          </div>

          {/* Étape 2 : Signature */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:sigData?"#34C759":"#E5E5EA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{sigData?"✓":"2"}</div>
                <span style={{fontWeight:600,fontSize:14,color:sigData?"#34C759":"#1C1C1E"}}>Signature du client</span>
              </div>
              {sigData&&<span style={{fontSize:12,color:"#34C759",fontWeight:600}}>✅ Signée</span>}
            </div>
            {!sigData&&(
              <button className="btn btn-outline" style={{width:"100%",justifyContent:"center",gap:10}}
                onClick={()=>setShowSig(true)}>
                <span style={{fontSize:18}}>✍️</span> Faire signer le client
              </button>
            )}
            {sigData&&(
              <div style={{border:"1px solid #E5E5EA",borderRadius:12,overflow:"hidden",background:"#FAFAFA"}}>
                <img src={sigData} alt="Signature" style={{width:"100%",height:80,objectFit:"contain"}}/>
                <div style={{display:"flex",justifyContent:"space-between",padding:"6px 12px",borderTop:"1px solid #F2F2F7"}}>
                  <span style={{fontSize:12,color:"#34C759",fontWeight:600}}>✅ Signature enregistrée</span>
                  <button onClick={()=>setSigData(null)} style={{background:"none",border:"none",fontSize:12,color:"#8E8E93",cursor:"pointer"}}>Resigner</button>
                </div>
              </div>
            )}
          </div>

          {/* Note optionnelle */}
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,color:"#8E8E93",display:"block",marginBottom:6}}>Note (optionnel)</label>
            <input className="inp" placeholder="Ex: Laissé avec le voisin du 3B…" value={note} onChange={e=>setNote(e.target.value)}/>
          </div>

          {/* Boutons */}
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={onCancel}>Annuler</button>
            <button className="btn btn-green" style={{flex:2,justifyContent:"center",opacity:canComplete?1:.4}}
              onClick={()=>canComplete&&complete()}>
              ✅ Confirmer la {stop.type==="delivery"?"livraison":"collecte"}
            </button>
          </div>
          {!canComplete&&<p style={{fontSize:12,color:"#FF9500",textAlign:"center",marginTop:8}}>📸 Photo + ✍️ Signature requis</p>}
        </div>
      </div>
      {showSig&&<SignatureCanvas onSave={d=>{setSigData(d);setShowSig(false);}} onCancel={()=>setShowSig(false)}/>}
    </>
  );
}

// ─── AUTRES SOUS-COMPOSANTS ───────────────────────────────────────────────────
function Chrono({order}) {
  const [el,setEl]=useState(order.elapsed||0); const ref=useRef(null);
  useEffect(()=>{clearInterval(ref.current);if(order.status==="inprogress"&&order.startTime){ref.current=setInterval(()=>setEl(Date.now()-order.startTime+(order.elapsed||0)),1000);}else setEl(order.elapsed||0);return()=>clearInterval(ref.current);},[order.status,order.startTime,order.elapsed]);
  const a=order.status==="inprogress";
  return <span style={{fontFamily:"monospace",fontSize:13,fontWeight:600,color:a?"#FF6B35":"#8E8E93",background:a?"rgba(255,107,53,.1)":"rgba(142,142,147,.08)",padding:"4px 10px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:a?"#FF6B35":"#C7C7CC",...(a?{animation:"blink 1s ease infinite"}:{})}}/>{fmtMs(el)}</span>;
}

function DeadlineRow({deadline,createdAt}) {
  const [,tick]=useState(0); useEffect(()=>{const t=setInterval(()=>tick(x=>x+1),60000);return()=>clearInterval(t);},[]);
  const info=getDL(deadline); const pct=Math.min(100,Math.round((Date.now()-createdAt)/(deadline-createdAt)*100));
  return(<div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{display:"inline-flex",alignItems:"center",gap:5,background:`${info.color}12`,border:`1px solid ${info.color}30`,borderRadius:20,padding:"3px 10px"}}>{info.urgent&&!info.overdue&&<span style={{width:5,height:5,borderRadius:"50%",background:info.color,display:"inline-block",animation:"blink 1s ease infinite"}}/>}<span style={{fontSize:12,fontWeight:600,color:info.color,fontFamily:"monospace"}}>{info.overdue?"EN RETARD":info.days>0?`${info.days}j ${info.hours}h restants`:`${info.hours}h restantes`}</span></div><span style={{fontSize:11,color:"#C7C7CC"}}>{fmtShort(deadline)}</span></div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:10,color:"#C7C7CC",whiteSpace:"nowrap"}}>{fmtShort(createdAt)}</span><div style={{flex:1,height:3,background:"#F2F2F7",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:2,background:`linear-gradient(90deg,${info.color}60,${info.color})`,transition:"width .5s"}}/></div><span style={{fontSize:10,color:info.color,fontWeight:600,whiteSpace:"nowrap"}}>🏁 {fmtShort(deadline)}</span></div></div>);
}

function PunchEditModal({punch,onSave,onClose}) {
  const [pIn,setPIn]=useState(fmtTimeInput(punch.punchIn));const [pOut,setPOut]=useState(punch.punchOut?fmtTimeInput(punch.punchOut):"");const [note,setNote]=useState(punch.note||"");
  const changed=pIn!==fmtTimeInput(punch.punchIn)||(pOut!==(punch.punchOut?fmtTimeInput(punch.punchOut):""));const ok=!changed||note.trim().length>0;
  const save=()=>{const ni=new Date(pIn).getTime(),no=pOut?new Date(pOut).getTime():null;if(isNaN(ni)||no&&no<=ni)return;onSave({...punch,punchIn:ni,punchOut:no,note});};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{background:"white",borderRadius:20,padding:28,width:420,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}><h3 style={{fontSize:18,fontWeight:700,marginBottom:20}}>✏️ Modifier la session</h3><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label className="lbl">Punch in</label><input type="datetime-local" className="inp" value={pIn} onChange={e=>setPIn(e.target.value)}/></div><div><label className="lbl">Punch out</label><input type="datetime-local" className="inp" value={pOut} onChange={e=>setPOut(e.target.value)}/></div><div><label className="lbl">Note {changed&&<span style={{color:"#FF9500"}}>(obligatoire)</span>}</label><input className="inp" placeholder="Ex: Oublié de puncher à 8h30…" value={note} onChange={e=>setNote(e.target.value)}/></div>{changed&&!note.trim()&&<p style={{fontSize:12,color:"#FF9500"}}>⚠️ Note requise.</p>}</div><div style={{display:"flex",gap:10,marginTop:20}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={onClose}>Annuler</button><button className="btn btn-primary" style={{flex:2,justifyContent:"center",opacity:ok?1:.5}} onClick={()=>ok&&save()}>Sauvegarder</button></div></div></div>);
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const {
    users, orders, stops, punches, purchases, loading,
    saveUser, updateUser, deleteUser,
    addOrder: addOrderFB, updateOrder, deleteOrder,
    addStop: addStopFB, updateStop, deleteStop,
    getPunchSessions, addPunchSession, updatePunchSession, closePunchSession,
    addPurchase, updatePurchase,
  } = useFirestore();

  useEffect(() => {
    initAuth().catch(console.error);
  }, []);

  const [companyName, setCompanyName] = useState("Shredhills");
  const [loginStep,   setLoginStep]   = useState("select");
  const [selectedUser,setSelectedUser]= useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [empTab,      setEmpTab]      = useState("timeclock");
  const [driverTab,   setDriverTab]   = useState("route");
  const [adminTab,    setAdminTab]    = useState("orders");
  const [acctTab,     setAcctTab]     = useState("timesheets");
  const [newOrderModal,   setNewOrderModal]   = useState(false);
  const [newStopModal,    setNewStopModal]    = useState(false);
  const [confirmStop,     setConfirmStop]     = useState(null);
  const [newEmpModal,     setNewEmpModal]     = useState(false);
  const [editUserModal,   setEditUserModal]   = useState(null);
  const [editPunch,       setEditPunch]       = useState(null);
  const [viewPhoto,       setViewPhoto]       = useState(false);
  const [refuseModal,     setRefuseModal]     = useState(null);
  const [refuseReason,    setRefuseReason]    = useState("");
  const [newPurchaseModal,setNewPurchaseModal]= useState(false);
  const [newPurchase,     setNewPurchase]     = useState({description:"",amount:"",photoFile:null});
  const [newStop,         setNewStop]         = useState({type:"delivery",clientName:"",clientPhone:"",address:"",instructions:"",assignedTo:"LIV-001"});
  const [newOrder, setNewOrder] = useState({clientName:"",clientEmail:"",description:"",assignedTo:"",deadlineDays:"5"});
  const [newEmp,   setNewEmp]   = useState({name:"",pin:"",color:"#FF6B35",role:"employee"});
  const [toast,    setToast]    = useState(null);
  const [sending,  setSending]  = useState(null);
  const [,clockTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>clockTick(x=>x+1),1000);return()=>clearInterval(t);},[]);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),4000);};
  const employees = users.filter(u=>u.role==="employee");
  const drivers   = users.filter(u=>u.role==="driver");
  const getEmp    = (id) => users.find(u=>u.id===id);

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const selectUser=(user)=>{setSelectedUser(user);setLoginStep("pin");};
  const checkPin=(pin)=>{ if(pin===selectedUser.pin){setCurrentUser(selectedUser);setLoginStep("select");setSelectedUser(null);return true;} return false; };
  const logout=()=>{setCurrentUser(null);setLoginStep("select");setSelectedUser(null);};

  // ── PUNCH ─────────────────────────────────────────────────────────────────
  const emp          = currentUser?.role==="employee"||currentUser?.role==="driver" ? currentUser : null;
  const empSessions  = emp ? (punches[emp.id]||[]) : [];
  const todayStart_  = dayStart(Date.now());
  const todaySess    = empSessions.filter(s=>dayStart(s.punchIn)===todayStart_);
  const activeSess   = todaySess.find(s=>!s.punchOut)||null;
  const isClockedIn  = !!activeSess;
  const todayDoneMs  = todaySess.filter(s=>s.punchOut).reduce((a,s)=>a+(s.punchOut-s.punchIn),0);
  const todayLiveMs  = activeSess ? Date.now() - activeSess.punchIn : 0;
  const todayTotalMs = todayDoneMs + todayLiveMs;
  const wkStart      = Date.now() - (new Date().getDay() || 7) * DAY;
  const totalMsWeek  = empSessions.filter(s => s.punchIn >= wkStart && s.punchOut).reduce((a, s) => a + (s.punchOut - s.punchIn), 0);
  const totalMsAll   = empSessions.filter(s => s.punchOut).reduce((a, s) => a + (s.punchOut - s.punchIn), 0);

  const punchIn = async () => {
    const session = { id: `P-${Date.now().toString(36).toUpperCase()}`, punchIn: Date.now(), punchOut: null, note: "" };
    await addPunchSession(emp.id, session);
    showToast("Punch in !");
  };

  const punchOut_ = async () => {
    if (activeSess) {
      await closePunchSession(emp.id, activeSess.id);
      showToast("Pause !");
    }
  };

  const savePunchEdit = async (updated) => {
    await updatePunchSession(emp.id, updated);
    setEditPunch(null);
    showToast("Session modifiee");
  };

  // ── DRIVER STOPS ──────────────────────────────────────────────────────────
  const driverStops      = currentUser?.role === "driver" ? stops.filter(s => s.assignedTo === currentUser?.id) : [];
  const driverPending    = driverStops.filter(s => s.status === "pending");
  const driverCompleted  = driverStops.filter(s => s.status === "completed");

  const completeStop = async (updated) => {
    await updateStop(updated.id, updated);
    setConfirmStop(null);
    showToast("Livraison confirmee !");
  };

  const addStop = async () => {
    if (!newStop.clientName || !newStop.address) return;
    const s = { id: `STOP-${Date.now().toString(36).toUpperCase()}`, ...newStop, status: "pending", completedAt: null, photoUrl: null, signatureUrl: null, note: "", orderId: null, createdAt: Date.now() };
    await addStopFB(s);
    setNewStop({ type: "delivery", clientName: "", clientPhone: "", address: "", instructions: "", assignedTo: drivers[0]?.id || "LIV-001" });
    setNewStopModal(false);
    showToast("Arret ajoute !");
  };

  const removeStop = async (id) => {
    if (confirm("Supprimer cet arrêt ?")) {
      console.log("Deleting stop:", id);
      try {
        await deleteStop(id);
        showToast("Arrêt supprimé");
      } catch (e) {
        console.error("Delete stop error:", e);
        showToast("Erreur: " + e.message);
      }
    }
  };

  // ── ORDERS ────────────────────────────────────────────────────────────────
  const empActive = (currentUser?.role === "employee") ? orders.filter(o => o.assignedTo === currentUser?.id && o.status !== "done") : [];
  const empDone = (currentUser?.role === "employee") ? orders.filter(o => o.assignedTo === currentUser?.id && o.status === "done") : [];

  const startOrder = async (id) => {
    await updateOrder(id, { status: "inprogress", startTime: Date.now(), elapsed: 0 });
    showToast("⏱ Chrono démarré !");
  };

  const finishOrder = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const elapsed = order.startTime ? Date.now() - order.startTime + (order.elapsed || 0) : (order.elapsed || 0);
    await updateOrder(id, { status: "done", endTime: Date.now(), elapsed });
    setSending(id);
    showToast("Commande terminée");
  };

  const handleDeleteOrder = async (id) => {
    if (confirm("Supprimer cette commande ?")) {
      console.log("Deleting order:", id);
      try {
        await deleteOrder(id);
        showToast("Commande supprimée");
      } catch (e) {
        console.error("Delete error:", e);
        showToast("Erreur: " + e.message);
      }
    }
  };

  const addOrder = async () => {
    if (!newOrder.clientName || !newOrder.assignedTo) return;
    const o = { id: `CMD-${Date.now().toString(36).toUpperCase()}`, ...newOrder, status: "pending", startTime: null, endTime: null, elapsed: 0, createdAt: Date.now(), deadline: Date.now() + parseInt(newOrder.deadlineDays) * DAY };
    await addOrderFB(o);
    setNewOrder({ clientName: "", clientEmail: "", description: "", assignedTo: "", deadlineDays: "5" });
    setNewOrderModal(false);
    showToast("Commande crOe !");
  };

  const reassignOrder = async (orderId, newEmpId) => {
    await updateOrder(orderId, { assignedTo: newEmpId });
    showToast("AssignO !");
  };

  // ── ACHATS ────────────────────────────────────────────────────────────────
  const submitPurchase = async () => {
    if (!newPurchase.description || !newPurchase.amount) return;
    const p = { id: `ACH-${Date.now().toString(36).toUpperCase()}`, empId: emp.id, empName: emp.name, description: newPurchase.description, amount: parseFloat(newPurchase.amount) || 0, status: "pending", submittedAt: Date.now(), photoUrl: "demo", approvedAt: null, refusedReason: "" };
    await addPurchase(p);
    setNewPurchase({ description: "", amount: "", photoFile: null });
    setNewPurchaseModal(false);
    showToast("Demande envoyee !");
  };

  const approvePurchase = async (id) => {
    await updatePurchase(id, { status: "approved", approvedAt: Date.now() });
    showToast("Approuve");
  };
  const refusePurchase = async () => {
    if (!refuseReason.trim()) return;
    await updatePurchase(refuseModal.id, { status: "refused", refusedReason: refuseReason });
    setRefuseModal(null);
    setRefuseReason("");
    showToast("Refuse");
  };

  // ── USERS ─────────────────────────────────────────────────────────────────
  const addUser = async () => {
    if (!newEmp.name || !newEmp.pin || newEmp.pin.length !== 4) return;
    const isDriver = newEmp.role === "driver";
    const prefix = isDriver ? "LIV" : "EMP";
    const existing = users.filter(u => u.role === newEmp.role);
    const num = String(existing.length + 1).padStart(3, "0");
    const u = { id: `${prefix}-${num}`, name: newEmp.name, role: newEmp.role, pin: newEmp.pin, color: newEmp.color };
    await saveUser(u);
    setNewEmp({ name: "", pin: "", color: "#FF6B35", role: "employee" });
    setNewEmpModal(false);
    showToast(`${u.name} -- ${u.id}`);
  };

  const saveUserEdit = async (updated) => {
    await updateUser(updated);
    if (currentUser?.id === updated.id) setCurrentUser(updated);
    setEditUserModal(null);
    showToast("Sauvegarde !");
  };

  const pendingPurchases=purchases.filter(p=>p.status==="pending").length;
  const adminActive=orders.filter(o=>o.status!=="done");
  const adminDone=orders.filter(o=>o.status==="done");

  // ── CSS ───────────────────────────────────────────────────────────────────
  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'DM Sans',sans-serif;}
    ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#D1D1D6;border-radius:2px;}
    .card{background:white;border-radius:16px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:box-shadow .2s;}
    .card:hover{box-shadow:0 4px 16px rgba(0,0,0,.09);}
    .btn{border-radius:12px;padding:11px 20px;font-size:15px;font-weight:600;cursor:pointer;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:6px;font-family:inherit;}
    .btn-primary{background:#111;color:white;}.btn-primary:hover{background:#333;transform:translateY(-1px);}
    .btn-outline{background:white;color:#3A3A3C;border:1.5px solid #E5E5EA;}.btn-outline:hover{border-color:#C7C7CC;}
    .btn-blue{background:#007AFF;color:white;}.btn-blue:hover{background:#0066DD;transform:translateY(-1px);}
    .btn-green{background:#34C759;color:white;}.btn-green:hover{background:#2DB94E;transform:translateY(-1px);}.btn-green:disabled{opacity:.5;cursor:not-allowed;transform:none;}
    .btn-red{background:#FF3B30;color:white;}.btn-red:hover{background:#D93025;}
    .btn-purple{background:#AF52DE;color:white;}.btn-purple:hover{background:#9A3CC7;transform:translateY(-1px);}
    .btn-soft-red{background:transparent;color:#FF3B30;border:1px solid #FFCDD0;font-size:13px;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;transition:all .15s;}.btn-soft-red:hover{background:#FFF5F5;}
    .btn-clock-in{background:linear-gradient(135deg,#34C759,#2DB94E);color:white;border:none;border-radius:20px;padding:18px 48px;font-size:19px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;box-shadow:0 4px 20px rgba(52,199,89,.35);}.btn-clock-in:hover{transform:translateY(-2px);}
    .btn-clock-out{background:linear-gradient(135deg,#FF9500,#FF6B00);color:white;border:none;border-radius:20px;padding:18px 48px;font-size:19px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;box-shadow:0 4px 20px rgba(255,149,0,.35);}.btn-clock-out:hover{transform:translateY(-2px);}
    .inp{background:#F2F2F7;border:1.5px solid transparent;border-radius:12px;color:#1C1C1E;font-size:15px;padding:11px 14px;width:100%;outline:none;font-family:inherit;transition:all .2s;}.inp:focus{background:white;border-color:#007AFF;box-shadow:0 0 0 3px rgba(0,122,255,.12);}
    .sel{background:#F2F2F7;border:1.5px solid transparent;border-radius:12px;color:#1C1C1E;font-size:15px;padding:11px 14px;width:100%;outline:none;cursor:pointer;font-family:inherit;}
    .tabs{display:flex;gap:2px;background:#E5E5EA;border-radius:12px;padding:3px;flex-wrap:wrap;}
    .tab{padding:7px 14px;border-radius:9px;border:none;background:transparent;color:#6D6D72;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit;}
    .tab.on{background:white;color:#1C1C1E;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1);}
    .badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;}
    .bp{background:#F2F2F7;color:#6D6D72;}.bi{background:#EFF6FF;color:#007AFF;}.bd{background:#EDFFF3;color:#34C759;}.ba{background:#EDFFF3;color:#34C759;}.br{background:#FFF5F5;color:#FF3B30;}.bw{background:#FFFBEF;color:#FF9500;}
    .nav{background:rgba(255,255,255,.9);backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(0,0,0,.06);padding:12px 20px;position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:20px;}
    @media(min-width:600px){.overlay{align-items:center;}}
    .sheet{background:white;border-radius:20px;padding:28px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;}
    .handle{width:36px;height:4px;background:#E5E5EA;border-radius:2px;margin:0 auto 20px;}
    .toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#1C1C1E;color:white;padding:12px 20px;border-radius:20px;font-size:14px;font-weight:500;z-index:999;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:tin .3s cubic-bezier(.34,1.56,.64,1);}
    .lbl{font-size:12px;color:#8E8E93;font-weight:500;display:block;margin-bottom:6px;}
    .sec{font-size:12px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}
    .stop-card{background:white;border-radius:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;transition:box-shadow .2s;}
    .stop-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1);}
    .user-card{background:white;border-radius:16px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);cursor:pointer;transition:all .15s;border:2px solid transparent;display:flex;align-items:center;gap:12px;}
    .user-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.12);transform:translateY(-2px);}
    @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(20px) scale(.9);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
    @keyframes fup{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes blink{0%,100%{opacity:.3;}50%{opacity:1;}}
    @keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-8px);}75%{transform:translateX(8px);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    .oc{animation:fup .25s ease;}
    .sp{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .6s linear infinite;}
  `;

  const Nav=({role,badge})=>(<div className="nav"><div style={{display:"flex",alignItems:"center",gap:10}}><Logo size={34}/><div><div style={{fontWeight:700,fontSize:15}}>{companyName}</div><div style={{fontSize:11,color:"#8E8E93"}}>{role}</div></div></div><div style={{display:"flex",gap:8,alignItems:"center"}}>{badge}<button className="btn btn-outline" style={{fontSize:13,padding:"7px 14px"}} onClick={logout}>Déconnexion</button></div></div>);

  // Punch section réutilisable
  const PunchSection = () => (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {[{label:"Aujourd'hui",val:fmtHours(todayTotalMs),c:isClockedIn?"#FF9500":"#34C759"},{label:"Semaine",val:fmtHours(totalMsWeek),c:"#007AFF"},{label:"Total",val:fmtHours(totalMsAll),c:"#6D6D72"}].map(s=>(
          <div key={s.label} className="card" style={{flex:1,textAlign:"center",padding:"14px 8px"}}><div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.val}</div><div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>{s.label}</div></div>
        ))}
      </div>
      <div className="card" style={{textAlign:"center",padding:"30px 20px",marginBottom:20}}>
        {isClockedIn?(
          <>
            {todaySess.filter(s=>s.punchOut).length>0&&(
              <div style={{background:"#F9F9F9",borderRadius:12,padding:"10px 14px",marginBottom:16,textAlign:"left"}}>
                <p style={{fontSize:12,color:"#8E8E93",fontWeight:600,marginBottom:6}}>Sessions d'aujourd'hui :</p>
                {todaySess.filter(s=>s.punchOut).map((s,i)=><div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}><span style={{color:"#6D6D72"}}>Session {i+1} : {fmtTime(s.punchIn)} → {fmtTime(s.punchOut)}</span><span style={{fontFamily:"monospace",color:"#007AFF",fontWeight:600}}>{fmtHours(s.punchOut-s.punchIn)}</span></div>)}
                <div style={{borderTop:"1px solid #E5E5EA",marginTop:6,paddingTop:6,display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:"#8E8E93"}}>Déjà accumulé :</span><span style={{fontFamily:"monospace",fontWeight:700,color:"#34C759"}}>{fmtHours(todayDoneMs)}</span></div>
              </div>
            )}
            <p style={{fontSize:13,color:"#8E8E93",marginBottom:2}}>En cours depuis <strong>{fmtTime(activeSess.punchIn)}</strong></p>
            <div style={{fontFamily:"monospace",fontSize:40,fontWeight:800,color:"#FF9500",letterSpacing:"-2px",margin:"10px 0 6px"}}>{fmtMs(todayLiveMs)}</div>
            <p style={{fontSize:13,fontWeight:700,marginBottom:20}}>Total : <span style={{color:"#34C759"}}>{fmtHours(todayTotalMs)}</span></p>
            <button className="btn-clock-out" onClick={punchOut_}>⏸ Pause / Punch Out</button>
            <p style={{fontSize:12,color:"#C7C7CC",marginTop:10}}>Les heures s'accumulent à chaque retour.</p>
          </>
        ):(
          <>
            {todaySess.length>0&&<div style={{background:"#F0FFF4",borderRadius:12,padding:"10px 14px",marginBottom:16,textAlign:"left",border:"1px solid #BBF7D0"}}><p style={{fontSize:12,color:"#166534",fontWeight:600,marginBottom:4}}>Déjà accumulé aujourd'hui : <span style={{fontFamily:"monospace",fontSize:14}}>{fmtHours(todayTotalMs)}</span></p></div>}
            <div style={{fontSize:44,marginBottom:8}}>👋</div>
            <p style={{fontSize:17,fontWeight:600,marginBottom:4}}>{todaySess.length>0?`Bienvenue de retour !`:`Bonjour, ${emp?.name} !`}</p>
            <p style={{fontSize:14,color:"#8E8E93",marginBottom:22}}>{todaySess.length>0?"Reprends ta journée.":"Prêt à commencer ?"}</p>
            <button className="btn-clock-in" onClick={punchIn}>▶ Punch In</button>
          </>
        )}
      </div>
      {empSessions.length>0&&(
        <div className="card"><p className="sec">Historique</p>
          {groupByDay(empSessions).map(({dayTs,sessions,totalMs,hasActive})=>(
            <div key={dayTs} style={{background:"#F9F9F9",borderRadius:12,padding:"11px 14px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:700,textTransform:"capitalize"}}>{new Date(dayTs).toLocaleDateString("fr-CA",{weekday:"long",month:"long",day:"numeric"})}</span>
                <span style={{fontFamily:"monospace",fontWeight:800,color:hasActive?"#FF9500":"#007AFF",fontSize:14}}>{fmtHours(totalMs+(hasActive?Date.now()-sessions.find(s=>!s.punchOut).punchIn:0))}</span>
              </div>
              {sessions.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #F2F2F7",gap:8}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#E5E5EA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#6D6D72",flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,fontSize:12}}><span style={{color:"#3A3A3C"}}>{fmtTime(s.punchIn)}{s.punchOut&&<span style={{color:"#8E8E93"}}> → {fmtTime(s.punchOut)}</span>}{!s.punchOut&&<span style={{color:"#34C759",fontWeight:600}}> → en cours</span>}</span>{s.note&&<div style={{fontSize:11,color:"#FF9500",marginTop:1}}>✏️ {s.note}</div>}</div>
                  {s.punchOut&&<span style={{fontFamily:"monospace",fontSize:11,fontWeight:600,color:"#6D6D72",flexShrink:0}}>{fmtHours(s.punchOut-s.punchIn)}</span>}
                  <button className="btn btn-outline" style={{fontSize:11,padding:"3px 9px",flexShrink:0}} onClick={()=>setEditPunch(s)}>Modif.</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ══════════ LOGIN ══════════════════════════════════════════════════════════
  if(!currentUser) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#F2F2F7,#E5E5EA)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{display:"inline-block",marginBottom:12}}><Logo size={60}/></div><h1 style={{fontSize:26,fontWeight:700,color:"#1C1C1E"}}>{companyName}</h1></div>
        {loginStep==="select"?(
          <div>
            <p style={{fontSize:13,color:"#8E8E93",textAlign:"center",marginBottom:16}}>Choisir ton profil</p>
            {users.length===0&&<button className="btn btn-primary" style={{marginBottom:20,width:"100%"}} onClick={()=>{seedDatabase();showToast("Base initialisee!");}}>Initialiser la base de donnees</button>}
            {[
              {label:"Gestion",users:users.filter(u=>u.role!=="employee"&&u.role!=="driver")},
              {label:"Employés atelier",users:employees},
              {label:"Livreurs",users:drivers},
            ].map(g=>g.users.length>0&&(
              <div key={g.label} style={{marginBottom:16}}>
                <p className="sec" style={{paddingLeft:4}}>{g.label}</p>
                {g.users.map(u=>(
                  <div key={u.id} className="user-card" style={{marginBottom:8,borderLeft:`3px solid ${u.color}`}} onClick={()=>selectUser(u)}>
                    <div style={{width:44,height:44,borderRadius:14,background:u.color+"18",color:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,flexShrink:0}}>{u.name[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15}}>{u.name}</div>
                      <div style={{fontSize:11,color:"#8E8E93",fontFamily:"monospace"}}>{u.id} · {u.role==="admin"?"Admin":u.role==="accountant"?"Comptable":u.role==="driver"?"🚐 Livreur":"👷 Employé"}</div>
                    </div>
                    {(punches[u.id]||[]).some(s=>dayStart(s.punchIn)===dayStart(Date.now())&&!s.punchOut)&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,color:"#34C759",fontWeight:600}}><span style={{width:5,height:5,borderRadius:"50%",background:"#34C759",display:"inline-block",animation:"blink 1s ease infinite"}}/>Pointé</span>}
                    <span style={{fontSize:20,color:"#C7C7CC",marginLeft:4}}>›</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ):(
          <div className="card" style={{padding:32}}><PinPad userName={selectedUser.name} userColor={selectedUser.color} onSuccess={checkPin} onBack={()=>{setLoginStep("select");setSelectedUser(null);}}/></div>
        )}
      </div>
    </div>
  );

  // ══════════ LIVREUR ════════════════════════════════════════════════════════
  if(currentUser.role==="driver") return (
    <div style={{minHeight:"100vh",background:"#F2F2F7"}}>
      <style>{CSS}</style>
      <Nav role={`${currentUser.name} · Livreur`} badge={
        isClockedIn&&<div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(175,82,222,.1)",border:"1px solid rgba(175,82,222,.3)",borderRadius:20,padding:"4px 12px"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#AF52DE",animation:"blink 1s ease infinite",display:"inline-block"}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#AF52DE",fontFamily:"monospace"}}>{fmtMs(todayTotalMs)}</span>
        </div>
      }/>

      <div style={{padding:"14px 16px 0"}}>
        <div className="tabs" style={{maxWidth:400}}>
          <button className={`tab ${driverTab==="route"?"on":""}`} onClick={()=>setDriverTab("route")}>
            🚐 Ma tournée
            {driverPending.length>0&&<span style={{background:"#AF52DE",color:"white",borderRadius:20,fontSize:10,padding:"1px 6px",marginLeft:4}}>{driverPending.length}</span>}
          </button>
          <button className={`tab ${driverTab==="timeclock"?"on":""}`} onClick={()=>setDriverTab("timeclock")}>🕐 Pointage</button>
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"16px 16px 40px"}}>

        {driverTab==="route"&&(
          <div>
            {/* Résumé tournée */}
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <div className="card" style={{flex:1,textAlign:"center",padding:"14px 10px"}}>
                <div style={{fontSize:26,fontWeight:800,color:"#AF52DE"}}>{driverPending.length}</div>
                <div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>Restants</div>
              </div>
              <div className="card" style={{flex:1,textAlign:"center",padding:"14px 10px"}}>
                <div style={{fontSize:26,fontWeight:800,color:"#007AFF"}}>{driverStops.filter(s=>s.type==="delivery"&&s.status==="pending").length}</div>
                <div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>📦 Livraisons</div>
              </div>
              <div className="card" style={{flex:1,textAlign:"center",padding:"14px 10px"}}>
                <div style={{fontSize:26,fontWeight:800,color:"#FF9500"}}>{driverStops.filter(s=>s.type==="pickup"&&s.status==="pending").length}</div>
                <div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>📤 Ramassages</div>
              </div>
              <div className="card" style={{flex:1,textAlign:"center",padding:"14px 10px"}}>
                <div style={{fontSize:26,fontWeight:800,color:"#34C759"}}>{driverCompleted.length}</div>
                <div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>✅ Complétés</div>
              </div>
            </div>

            {/* Bouton ajouter arrêt (livreur) */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <p className="sec" style={{marginBottom:0}}>Arrêts à faire ({driverPending.length})</p>
              <button className="btn btn-purple" style={{fontSize:13,padding:"8px 14px"}} onClick={()=>{setNewStop(n=>({...n,assignedTo:currentUser.id}));setNewStopModal(true);}}>
                + Ajouter un arrêt
              </button>
            </div>

            {driverPending.length===0&&(
              <div className="card" style={{textAlign:"center",padding:48}}>
                <div style={{fontSize:48,marginBottom:12}}>🎉</div>
                <p style={{fontWeight:700,fontSize:17}}>Tournée complétée !</p>
                <p style={{fontSize:14,color:"#8E8E93",marginTop:4}}>Tous les arrêts sont faits.</p>
              </div>
            )}

            {driverPending.map((stop,idx)=>(
              <div key={stop.id} className="stop-card oc">
                {/* Bande colorée selon type */}
                <div style={{height:4,background:stop.type==="delivery"?"#007AFF":"#FF9500"}}/>
                <div style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:20}}>{stop.type==="delivery"?"📦":"📤"}</span>
                        <span style={{fontWeight:700,fontSize:15,color:stop.type==="delivery"?"#007AFF":"#FF9500"}}>{stop.type==="delivery"?"Livraison":"Ramassage"}</span>
                        <span style={{fontSize:11,color:"#C7C7CC",fontFamily:"monospace"}}>#{idx+1}</span>
                      </div>
                      <p style={{fontWeight:700,fontSize:16,marginBottom:2}}>{stop.clientName}</p>
                      <a href={`tel:${stop.clientPhone}`} style={{fontSize:13,color:"#007AFF",display:"block",marginBottom:6,textDecoration:"none"}}>📞 {stop.clientPhone}</a>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`} target="_blank" rel="noreferrer"
                        style={{fontSize:13,color:"#1C1C1E",display:"flex",alignItems:"flex-start",gap:4,marginBottom:8,textDecoration:"none"}}>
                        <span style={{marginTop:1}}>📍</span><span style={{textDecoration:"underline"}}>{stop.address}</span>
                      </a>
                      {stop.instructions&&(
                        <div style={{background:"#FFFBEF",borderRadius:10,padding:"8px 12px",border:"1px solid #FFE4A0"}}>
                          <p style={{fontSize:12,color:"#92400E"}}>💬 {stop.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{marginTop:14}}>
                    <button className="btn btn-purple" style={{width:"100%",justifyContent:"center",fontSize:15}}
                      onClick={()=>setConfirmStop(stop)}>
                      {stop.type==="delivery"?"📦 Confirmer la livraison":"📤 Confirmer le ramassage"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Arrêts complétés */}
            {driverCompleted.length>0&&(
              <div style={{marginTop:24}}>
                <p className="sec">Complétés ({driverCompleted.length})</p>
                {driverCompleted.map(stop=>(
                  <div key={stop.id} className="stop-card" style={{opacity:.65}}>
                    <div style={{height:3,background:"#34C759"}}/>
                    <div style={{padding:"14px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span style={{fontSize:16}}>{stop.type==="delivery"?"📦":"📤"}</span>
                            <span style={{fontWeight:600,fontSize:14,textDecoration:"line-through",color:"#8E8E93"}}>{stop.clientName}</span>
                            <span className="badge bd">✓ Fait</span>
                          </div>
                          <p style={{fontSize:12,color:"#C7C7CC"}}>📍 {stop.address}</p>
                          {stop.note&&<p style={{fontSize:11,color:"#8E8E93",marginTop:4}}>💬 {stop.note}</p>}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{fontSize:11,color:"#34C759",fontWeight:600}}>{fmtTime(stop.completedAt)}</p>
                          <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"flex-end"}}>
                            {stop.photoUrl&&<span style={{fontSize:11,background:"#F2F2F7",padding:"2px 7px",borderRadius:8,color:"#6D6D72"}}>📸</span>}
                            {stop.signatureUrl&&<span style={{fontSize:11,background:"#F2F2F7",padding:"2px 7px",borderRadius:8,color:"#6D6D72"}}>✍️</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {driverTab==="timeclock"&&<PunchSection/>}
      </div>

      {/* Confirmation livraison/ramassage */}
      {confirmStop&&<StopConfirmModal stop={confirmStop} onComplete={completeStop} onCancel={()=>setConfirmStop(null)}/>}

      {/* Modal ajout arrêt (livreur) */}
      {newStopModal&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setNewStopModal(false)}>
          <div className="sheet">
            <div className="handle"/>
            <h3 style={{fontSize:20,fontWeight:700,marginBottom:20}}>📍 Ajouter un arrêt</h3>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label className="lbl">Type</label>
                <div style={{display:"flex",gap:10}}>
                  {[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setNewStop(n=>({...n,type:v}))}
                      className="btn" style={{flex:1,justifyContent:"center",background:newStop.type===v?"#111":"white",color:newStop.type===v?"white":"#3A3A3C",border:"1.5px solid",borderColor:newStop.type===v?"#111":"#E5E5EA"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="lbl">Nom du client</label><input className="inp" placeholder="Sophie Tremblay" value={newStop.clientName} onChange={e=>setNewStop(n=>({...n,clientName:e.target.value}))}/></div>
              <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={newStop.clientPhone} onChange={e=>setNewStop(n=>({...n,clientPhone:e.target.value}))}/></div>
              <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine, Montréal" value={newStop.address} onChange={e=>setNewStop(n=>({...n,address:e.target.value}))}/></div>
              <div><label className="lbl">Instructions spéciales (optionnel)</label><input className="inp" placeholder="Sonner 2 fois, apt 4B…" value={newStop.instructions} onChange={e=>setNewStop(n=>({...n,instructions:e.target.value}))}/></div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setNewStopModal(false)}>Annuler</button>
                <button className="btn btn-purple" style={{flex:2,justifyContent:"center"}} onClick={addStop}>Ajouter à ma tournée</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editPunch&&<PunchEditModal punch={editPunch} onSave={savePunchEdit} onClose={()=>setEditPunch(null)}/>}
      {toast&&<div className="toast">{toast}</div>}
    </div>
  );

  // ══════════ EMPLOYÉ ════════════════════════════════════════════════════════
  if(currentUser.role==="employee") return (
    <div style={{minHeight:"100vh",background:"#F2F2F7"}}>
      <style>{CSS}</style>
      <Nav role={`${currentUser.name} · ${currentUser.id}`} badge={isClockedIn&&<div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,149,0,.1)",border:"1px solid rgba(255,149,0,.3)",borderRadius:20,padding:"4px 12px"}}><span style={{width:6,height:6,borderRadius:"50%",background:"#FF9500",animation:"blink 1s ease infinite",display:"inline-block"}}/><span style={{fontSize:12,fontWeight:700,color:"#FF9500",fontFamily:"monospace"}}>{fmtMs(todayTotalMs)}</span></div>}/>
      <div style={{padding:"14px 16px 0"}}><div className="tabs" style={{maxWidth:520}}>
        <button className={`tab ${empTab==="timeclock"?"on":""}`} onClick={()=>setEmpTab("timeclock")}>🕐 Pointage</button>
        <button className={`tab ${empTab==="tasks"?"on":""}`} onClick={()=>setEmpTab("tasks")}>📋 Tâches{empActive.length>0&&<span style={{background:"#007AFF",color:"white",borderRadius:20,fontSize:10,padding:"1px 6px",marginLeft:4}}>{empActive.length}</span>}</button>
        <button className={`tab ${empTab==="purchases"?"on":""}`} onClick={()=>setEmpTab("purchases")}>🧾 Achats</button>
      </div></div>
      <div style={{maxWidth:680,margin:"0 auto",padding:"16px 16px 40px"}}>
        {empTab==="timeclock"&&<PunchSection/>}
        {empTab==="tasks"&&(
          <div>
            {empActive.length===0&&<div className="card" style={{textAlign:"center",padding:48}}><div style={{fontSize:44,marginBottom:12}}>🎉</div><p style={{fontWeight:600,fontSize:17}}>Aucune tâche !</p></div>}
            {[...empActive].sort((a,b)=>(a.deadline||9e15)-(b.deadline||9e15)).map(order=>{const dl=getDL(order.deadline),isSend=sending===order.id;return(<div key={order.id} className="oc card" style={{marginBottom:12,borderTop:`3px solid ${dl.color}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#C7C7CC"}}>{order.id}</span><span className={`badge ${order.status==="inprogress"?"bi":"bp"}`}>{order.status==="inprogress"?"⚡ En cours":"⏸ En attente"}</span>{dl.overdue&&<span style={{fontSize:11,color:"#FF3B30",fontWeight:700,background:"#FFF5F5",padding:"2px 8px",borderRadius:10}}>⚠️ En retard</span>}</div><h3 style={{fontSize:17,fontWeight:700,marginBottom:3}}>{order.clientName}</h3><p style={{fontSize:14,color:"#6D6D72",lineHeight:1.4,marginBottom:14}}>{order.description}</p><div style={{marginBottom:14}}><DeadlineRow deadline={order.deadline} createdAt={order.createdAt}/></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><Chrono order={order}/><div>{order.status==="pending"&&<button className="btn btn-blue" onClick={()=>startOrder(order.id)}>▶ Commencer</button>}{order.status==="inprogress"&&<button className="btn btn-green" disabled={isSend} onClick={()=>finishOrder(order.id)}>{isSend?<><span className="sp"/>Envoi…</>:<>✓ Marquer terminé</>}</button>}</div></div></div>);})}
            {empDone.length>0&&<div style={{marginTop:24}}><p className="sec">Terminées ({empDone.length})</p>{empDone.map(o=><div key={o.id} className="card" style={{marginBottom:10,opacity:.6,borderLeft:"3px solid #34C759"}}><div style={{display:"flex",justifyContent:"space-between"}}><div><p style={{fontWeight:600,fontSize:14,textDecoration:"line-through",color:"#8E8E93"}}>{o.clientName}</p><p style={{fontSize:12,color:"#C7C7CC"}}>{o.description}</p></div><div style={{textAlign:"right"}}><div style={{fontFamily:"monospace",fontSize:12,color:"#34C759"}}>⏱ {fmtMs(o.elapsed)}</div></div></div></div>)}</div>}
          </div>
        )}
        {empTab==="purchases"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><p style={{fontSize:14,color:"#8E8E93"}}>Factures pour remboursement.</p><button className="btn btn-primary" style={{padding:"9px 16px",fontSize:13}} onClick={()=>setNewPurchaseModal(true)}>+ Nouvelle</button></div>
            {purchases.filter(p=>p.empId===currentUser.id).length===0&&<div className="card" style={{textAlign:"center",padding:40}}><div style={{fontSize:40,marginBottom:12}}>🧾</div><p style={{fontWeight:600}}>Aucune demande</p></div>}
            {purchases.filter(p=>p.empId===currentUser.id).map(p=>(<div key={p.id} className="oc card" style={{marginBottom:12,borderLeft:`4px solid ${p.status==="approved"?"#34C759":p.status==="refused"?"#FF3B30":"#FF9500"}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}><div style={{flex:1}}><div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#C7C7CC"}}>{p.id}</span><span className={`badge ${p.status==="approved"?"ba":p.status==="refused"?"br":"bw"}`}>{p.status==="approved"?"✅ Approuvé":p.status==="refused"?"❌ Refusé":"⏳ En attente"}</span></div><p style={{fontWeight:700,fontSize:15}}>{p.description}</p><p style={{fontSize:22,fontWeight:800,margin:"4px 0"}}>{p.amount.toFixed(2)} $</p>{p.status==="approved"&&<p style={{fontSize:12,color:"#34C759",marginTop:4}}>💸 Virement approuvé</p>}{p.status==="refused"&&p.refusedReason&&<p style={{fontSize:12,color:"#FF3B30",marginTop:4}}>{p.refusedReason}</p>}</div></div></div>))}
          </div>
        )}
      </div>
      {editPunch&&<PunchEditModal punch={editPunch} onSave={savePunchEdit} onClose={()=>setEditPunch(null)}/>}
      {newPurchaseModal&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setNewPurchaseModal(false)}><div className="sheet"><div className="handle"/><h3 style={{fontSize:20,fontWeight:700,marginBottom:20}}>🧾 Nouvelle demande</h3><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label className="lbl">Description</label><input className="inp" placeholder="Encre sérigraphie noire 5L" value={newPurchase.description} onChange={e=>setNewPurchase(n=>({...n,description:e.target.value}))}/></div><div><label className="lbl">Montant ($)</label><input className="inp" type="number" step="0.01" placeholder="0.00" value={newPurchase.amount} onChange={e=>setNewPurchase(n=>({...n,amount:e.target.value}))}/></div><div><label className="lbl">Photo facture</label><div style={{background:"#F9F9F9",border:"2px dashed #E5E5EA",borderRadius:14,padding:"24px 20px",textAlign:"center",cursor:"pointer"}} onClick={()=>document.getElementById("photoInput2").click()}><div style={{fontSize:32,marginBottom:6}}>📸</div><p style={{fontWeight:600,fontSize:14}}>Prendre / choisir une photo</p><input id="photoInput2" type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])setNewPurchase(n=>({...n,photoFile:e.target.files[0]}));}}/></div>{newPurchase.photoFile&&<div style={{marginTop:8,background:"#EDFFF3",borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}><span>✅</span><span style={{fontSize:13,color:"#34C759",fontWeight:600}}>{newPurchase.photoFile.name}</span></div>}</div><div style={{display:"flex",gap:10,marginTop:4}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setNewPurchaseModal(false)}>Annuler</button><button className="btn btn-primary" style={{flex:2,justifyContent:"center"}} onClick={submitPurchase}>Envoyer</button></div></div></div></div>)}
      {toast&&<div className="toast">{toast}</div>}
    </div>
  );

  // ══════════ COMPTABLE ══════════════════════════════════════════════════════
  if(currentUser.role==="accountant") return (
    <div style={{minHeight:"100vh",background:"#F2F2F7"}}>
      <style>{CSS}</style>
      <Nav role="Comptabilité" badge={pendingPurchases>0&&<div style={{background:"#FF3B30",color:"white",borderRadius:20,padding:"4px 12px",fontSize:13,fontWeight:700}}>{pendingPurchases} en attente</div>}/>
      <div style={{padding:"14px 20px 0"}}><div className="tabs"><button className={`tab ${acctTab==="timesheets"?"on":""}`} onClick={()=>setAcctTab("timesheets")}>🕐 Heures</button><button className={`tab ${acctTab==="purchases"?"on":""}`} onClick={()=>setAcctTab("purchases")}>🧾 Achats{pendingPurchases>0&&<span style={{background:"#FF3B30",color:"white",borderRadius:20,fontSize:10,padding:"1px 6px",marginLeft:4}}>{pendingPurchases}</span>}</button></div></div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 20px 40px"}}>
        {acctTab==="timesheets"&&(<div>
          <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
            {users.filter(u=>u.role==="employee"||u.role==="driver").map(u=>{const eps=punches[u.id]||[];const wk=Date.now()-(new Date().getDay()||7)*DAY;const wkMs=eps.filter(p=>p.punchIn>=wk&&p.punchOut).reduce((a,p)=>a+(p.punchOut-p.punchIn),0);return(<div key={u.id} className="card" style={{flex:1,minWidth:130,padding:"14px",borderTop:`3px solid ${u.color}`}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:26,height:26,borderRadius:9,background:u.color+"18",color:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{u.name[0]}</div><div style={{fontWeight:600,fontSize:13}}>{u.name}{u.role==="driver"&&<span style={{fontSize:10,color:"#8E8E93",marginLeft:4}}>🚐</span>}</div></div><div style={{fontSize:18,fontWeight:700,color:"#007AFF"}}>{fmtHours(wkMs)}</div><div style={{fontSize:10,color:"#8E8E93"}}>cette semaine</div></div>);})}
          </div>
          {users.filter(u=>u.role==="employee"||u.role==="driver").map(u=>{
            const eps=punches[u.id]||[];const totalMs=eps.filter(p=>p.punchOut).reduce((a,p)=>a+(p.punchOut-p.punchIn),0);const wk=Date.now()-(new Date().getDay()||7)*DAY;const wkMs=eps.filter(p=>p.punchIn>=wk&&p.punchOut).reduce((a,p)=>a+(p.punchOut-p.punchIn),0);const active=eps.some(s=>dayStart(s.punchIn)===dayStart(Date.now())&&!s.punchOut);const days=groupByDay(eps);
            return(<div key={u.id} className="card" style={{marginBottom:14,borderLeft:`4px solid ${u.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:44,height:44,borderRadius:14,background:u.color+"18",color:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700}}>{u.name[0]}</div><div><div style={{fontWeight:700,fontSize:16}}>{u.name} {u.role==="driver"&&<span style={{fontSize:12,color:"#AF52DE"}}>🚐</span>}</div><div style={{fontFamily:"monospace",fontSize:11,color:"#8E8E93"}}>{u.id}</div></div>{active&&<span style={{display:"flex",alignItems:"center",gap:4,background:"rgba(52,199,89,.1)",border:"1px solid rgba(52,199,89,.3)",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600,color:"#34C759"}}><span style={{width:5,height:5,borderRadius:"50%",background:"#34C759",display:"inline-block",animation:"blink 1s ease infinite"}}/>Pointé</span>}</div>
                <div style={{display:"flex",gap:14,textAlign:"center"}}><div><div style={{fontSize:18,fontWeight:700,color:"#007AFF"}}>{fmtHours(wkMs)}</div><div style={{fontSize:11,color:"#8E8E93"}}>semaine</div></div><div><div style={{fontSize:18,fontWeight:700,color:u.color}}>{fmtHours(totalMs)}</div><div style={{fontSize:11,color:"#8E8E93"}}>total</div></div></div>
              </div>
              <div style={{borderTop:"1px solid #F2F2F7",paddingTop:12}}><p className="sec">Pointages</p>{days.length===0&&<p style={{fontSize:13,color:"#C7C7CC",textAlign:"center",padding:"8px 0"}}>Aucun pointage</p>}{days.map(({dayTs,sessions,totalMs:dMs,hasActive})=>(<div key={dayTs} style={{marginBottom:8,background:"#F9F9F9",borderRadius:10,padding:"9px 12px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:600,textTransform:"capitalize"}}>{new Date(dayTs).toLocaleDateString("fr-CA",{weekday:"long",month:"long",day:"numeric"})}</span><span style={{fontFamily:"monospace",fontWeight:800,color:hasActive?"#FF9500":"#007AFF",fontSize:13}}>{fmtHours(dMs)}</span></div>{sessions.map((s,i)=><div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#6D6D72",padding:"1px 0"}}><span>Session {i+1} : {fmtTime(s.punchIn)} → {s.punchOut?fmtTime(s.punchOut):"en cours"}{s.note&&<span style={{color:"#FF9500",marginLeft:4}}>✏️ {s.note}</span>}</span>{s.punchOut&&<span style={{fontFamily:"monospace",fontWeight:600}}>{fmtHours(s.punchOut-s.punchIn)}</span>}</div>)}</div>))}</div>
            </div>);
          })}
        </div>)}
        {acctTab==="purchases"&&(<div>
          {purchases.filter(p=>p.status==="pending").length>0&&(<div style={{marginBottom:24}}><p className="sec" style={{color:"#FF9500"}}>⏳ En attente</p>{purchases.filter(p=>p.status==="pending").map(p=>(<div key={p.id} className="oc card" style={{marginBottom:12,borderLeft:"4px solid #FF9500"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div style={{flex:1}}><div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#C7C7CC"}}>{p.id}</span><span className="badge bw">⏳</span><span style={{fontSize:12,color:"#6D6D72"}}>👤 {p.empName}</span></div><p style={{fontWeight:700,fontSize:16}}>{p.description}</p><p style={{fontSize:26,fontWeight:800,margin:"6px 0"}}>{p.amount.toFixed(2)} $</p><p style={{fontSize:12,color:"#8E8E93"}}>{fmtDate(p.submittedAt)}</p></div><div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}><button className="btn btn-outline" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>setViewPhoto(true)}>📸 Facture</button><button className="btn btn-green" style={{padding:"9px 16px",fontSize:13}} onClick={()=>approvePurchase(p.id)}>✅ Approuver</button><button className="btn btn-red" style={{padding:"9px 16px",fontSize:13}} onClick={()=>{setRefuseModal(p);setRefuseReason("");}}>❌ Refuser</button></div></div></div>))}</div>)}
          {purchases.filter(p=>p.status!=="pending").length>0&&(<div><p className="sec">Décisions passées</p>{purchases.filter(p=>p.status!=="pending").map(p=>(<div key={p.id} className="card" style={{marginBottom:10,opacity:.75,borderLeft:`4px solid ${p.status==="approved"?"#34C759":"#FF3B30"}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><div style={{display:"flex",gap:8,marginBottom:4,alignItems:"center"}}><span className={`badge ${p.status==="approved"?"ba":"br"}`}>{p.status==="approved"?"✅":"❌"}</span><span style={{fontSize:12,color:"#8E8E93"}}>{p.empName}</span></div><p style={{fontWeight:600,fontSize:14}}>{p.description}</p>{p.status==="approved"&&<p style={{fontSize:12,color:"#34C759",marginTop:3}}>💸 Virement à effectuer</p>}{p.status==="refused"&&p.refusedReason&&<p style={{fontSize:12,color:"#FF3B30",marginTop:3}}>{p.refusedReason}</p>}</div><span style={{fontSize:22,fontWeight:800}}>{p.amount.toFixed(2)} $</span></div></div>))}</div>)}
          {purchases.length===0&&<div className="card" style={{textAlign:"center",padding:48}}><div style={{fontSize:40,marginBottom:12}}>🎉</div><p style={{fontWeight:600}}>Aucune demande</p></div>}
        </div>)}
      </div>
      {viewPhoto&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setViewPhoto(false)}><div style={{background:"white",borderRadius:20,padding:24,maxWidth:460,width:"100%"}} onClick={e=>e.stopPropagation()}><h3 style={{marginBottom:16,fontSize:17,fontWeight:700}}>📸 Facture</h3><div style={{background:"#F2F2F7",borderRadius:16,height:240,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}><div style={{fontSize:48}}>🧾</div><p style={{color:"#8E8E93",fontSize:14}}>Aperçu de la facture</p></div></div></div>}
      {refuseModal&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setRefuseModal(null)}><div className="sheet"><div className="handle"/><h3 style={{fontSize:20,fontWeight:700,marginBottom:6}}>❌ Refuser</h3><p style={{fontSize:13,color:"#8E8E93",marginBottom:16}}>{refuseModal.empName} — <strong>{refuseModal.amount.toFixed(2)} $</strong></p><label className="lbl">Raison (obligatoire)</label><textarea className="inp" rows={3} placeholder="Ex: Facture illisible…" value={refuseReason} onChange={e=>setRefuseReason(e.target.value)} style={{resize:"none"}}/><div style={{display:"flex",gap:10,marginTop:16}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setRefuseModal(null)}>Annuler</button><button className="btn btn-red" style={{flex:2,justifyContent:"center",opacity:refuseReason.trim()?1:.5}} onClick={refusePurchase}>Confirmer</button></div></div></div>)}
      {toast&&<div className="toast">{toast}</div>}
    </div>
  );

  // ══════════ ADMIN ══════════════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:"#F2F2F7"}}>
      <style>{CSS}</style>
      <div className="nav"><div style={{display:"flex",alignItems:"center",gap:10}}><Logo size={34}/><div><input value={companyName} onChange={e=>setCompanyName(e.target.value)} style={{background:"none",border:"none",color:"#1C1C1E",fontFamily:"inherit",fontSize:17,fontWeight:700,outline:"none",width:220}}/><div style={{fontSize:10,color:"#C7C7CC"}}>Cliquer pour modifier</div></div></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:"#8E8E93",background:"#F2F2F7",padding:"4px 10px",borderRadius:16,fontFamily:"monospace"}}>ADMIN</span><button className="btn btn-outline" style={{fontSize:13,padding:"7px 14px"}} onClick={logout}>Déconnexion</button></div></div>

      <div style={{display:"flex",gap:10,padding:"18px 20px 0",flexWrap:"wrap"}}>
        {[{label:"En attente",val:orders.filter(o=>o.status==="pending").length,c:"#8E8E93"},{label:"En cours",val:orders.filter(o=>o.status==="inprogress").length,c:"#007AFF"},{label:"Terminées",val:adminDone.length,c:"#34C759"},{label:"Livraisons",val:stops.filter(s=>s.status==="pending").length,c:"#AF52DE"},{label:"En retard",val:orders.filter(o=>o.status!=="done"&&o.deadline&&o.deadline<Date.now()).length,c:"#FF3B30"},{label:"Achats",val:pendingPurchases,c:"#FF9500"}].map(s=>(<div key={s.label} className="card" style={{flex:1,minWidth:80,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:"#8E8E93"}}>{s.label}</span><span style={{fontSize:20,fontWeight:700,color:s.c}}>{s.val}</span></div>))}
      </div>

      <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div className="tabs">{[["orders","📦 Commandes"],["deliveries","🚐 Tournées"],["team","👥 Équipe"],["done","✅ Historique"]].map(([id,label])=><button key={id} className={`tab ${adminTab===id?"on":""}`} onClick={()=>setAdminTab(id)}>{label}</button>)}</div>
        <div style={{display:"flex",gap:8}}>
          {adminTab==="team"&&<button className="btn btn-outline" onClick={()=>setNewEmpModal(true)}>+ Membre</button>}
          {adminTab==="orders"&&<button className="btn btn-primary" onClick={()=>setNewOrderModal(true)}>+ Commande</button>}
          {adminTab==="deliveries"&&<button className="btn btn-purple" onClick={()=>{setNewStop(n=>({...n,assignedTo:drivers[0]?.id||""}));setNewStopModal(true);}}>+ Arrêt tournée</button>}
        </div>
      </div>

      <div style={{padding:"0 20px 40px"}}>

        {/* COMMANDES */}
        {adminTab==="orders"&&(<div>
          {adminActive.length===0&&<div className="card" style={{textAlign:"center",padding:48,color:"#8E8E93"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><p style={{fontWeight:600}}>Aucune commande active</p></div>}
          {[...adminActive].sort((a,b)=>(a.deadline||9e15)-(b.deadline||9e15)).map(order=>{const e=getEmp(order.assignedTo),dl=getDL(order.deadline);return(<div key={order.id} className="oc card" style={{marginBottom:12,borderTop:`3px solid ${dl.color}`}}><div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}><div style={{flex:1,minWidth:200}}><div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center",flexWrap:"wrap"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#C7C7CC"}}>{order.id}</span><span className={`badge ${order.status==="inprogress"?"bi":"bp"}`}>{order.status==="inprogress"?"⚡ En cours":"En attente"}</span>{dl.overdue&&<span style={{fontSize:11,color:"#FF3B30",fontWeight:700}}>⚠️ En retard</span>}</div><p style={{fontWeight:700,fontSize:15}}>{order.clientName}<span style={{fontWeight:400,fontSize:13,color:"#8E8E93",marginLeft:8}}>{order.clientEmail}</span></p><p style={{fontSize:13,color:"#6D6D72",marginTop:2,marginBottom:12}}>{order.description}</p><DeadlineRow deadline={order.deadline} createdAt={order.createdAt}/></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"#8E8E93"}}>→</span><select value={order.assignedTo} onChange={ev=>reassignOrder(order.id,ev.target.value)} style={{background:"#F2F2F7",border:"none",borderRadius:8,padding:"5px 10px",fontSize:13,fontWeight:600,color:e?.color||"#1C1C1E",cursor:"pointer",fontFamily:"inherit",outline:"none"}}>{employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div><Chrono order={order}/><button className="btn-soft-red" onClick={() => handleDeleteOrder(order.id)}>Supprimer</button></div></div></div>);})}
        </div>)}

        {/* TOURNÉES */}
        {adminTab==="deliveries"&&(<div>
          {drivers.length===0&&<div className="card" style={{textAlign:"center",padding:40,color:"#8E8E93"}}><div style={{fontSize:40,marginBottom:12}}>🚐</div><p style={{fontWeight:600}}>Aucun livreur encore</p><p style={{fontSize:13,marginTop:4}}>Ajoute un livreur dans l'onglet Équipe.</p></div>}
          {drivers.map(driver=>{
            const dStops=stops.filter(s=>s.assignedTo===driver.id);
            const pending=dStops.filter(s=>s.status==="pending");
            const completed=dStops.filter(s=>s.status==="completed");
            return(<div key={driver.id} className="card" style={{marginBottom:16,borderLeft:`4px solid ${driver.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:44,height:44,borderRadius:14,background:driver.color+"18",color:driver.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700}}>{driver.name[0]}</div>
                  <div><div style={{fontWeight:700,fontSize:16}}>{driver.name} <span style={{fontSize:13,color:"#AF52DE"}}>🚐</span></div><div style={{fontFamily:"monospace",fontSize:11,color:"#8E8E93"}}>{driver.id}</div></div>
                </div>
                <div style={{display:"flex",gap:14,textAlign:"center"}}>
                  <div><div style={{fontSize:20,fontWeight:700,color:"#AF52DE"}}>{pending.length}</div><div style={{fontSize:11,color:"#8E8E93"}}>restants</div></div>
                  <div><div style={{fontSize:20,fontWeight:700,color:"#34C759"}}>{completed.length}</div><div style={{fontSize:11,color:"#8E8E93"}}>complétés</div></div>
                </div>
              </div>
              {dStops.length===0&&<p style={{fontSize:13,color:"#C7C7CC",textAlign:"center",padding:"10px 0"}}>Aucun arrêt pour aujourd'hui</p>}
              {dStops.map((stop,i)=>(
                <div key={stop.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid #F2F2F7"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:stop.status==="completed"?"#34C759":"#E5E5EA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,color:stop.status==="completed"?"white":"#8E8E93",fontWeight:700}}>{stop.status==="completed"?"✓":i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <span style={{fontSize:14}}>{stop.type==="delivery"?"📦":"📤"}</span>
                      <span style={{fontWeight:600,fontSize:14,color:stop.status==="completed"?"#8E8E93":"#1C1C1E",textDecoration:stop.status==="completed"?"line-through":"none"}}>{stop.clientName}</span>
                      {stop.status==="completed"&&<span style={{fontSize:11,color:"#34C759",fontWeight:600}}>✓ {fmtTime(stop.completedAt)}</span>}
                    </div>
                    <p style={{fontSize:12,color:"#6D6D72"}}>📍 {stop.address}</p>
                    {stop.status==="completed"&&stop.signatureUrl&&<span style={{fontSize:11,color:"#8E8E93",marginTop:2,display:"inline-block"}}>✍️ Signature + 📸 Photo</span>}
                  </div>
                  <button className="btn-soft-red" onClick={() => removeStop(stop.id)}>X</button>
                </div>
              ))}
            </div>);
          })}
        </div>)}

        {/* ÉQUIPE */}
        {adminTab==="team"&&(<div>
          <p style={{fontSize:13,color:"#8E8E93",marginBottom:16}}>Gérer les profils, codes et NIP.</p>
          {users.map(u=>{const wk=Date.now()-(new Date().getDay()||7)*DAY;const eps=punches[u.id]||[];const wkMs=(u.role==="employee"||u.role==="driver")?eps.filter(p=>p.punchIn>=wk&&p.punchOut).reduce((a,p)=>a+(p.punchOut-p.punchIn),0):null;const roleLabel=u.role==="admin"?"⚙️ Admin":u.role==="accountant"?"📊 Comptable":u.role==="driver"?"🚐 Livreur":"👷 Employé";return(<div key={u.id} className="card" style={{marginBottom:10,borderLeft:`4px solid ${u.color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:44,height:44,borderRadius:14,background:u.color+"18",color:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,flexShrink:0}}>{u.name[0]}</div><div><div style={{fontWeight:700,fontSize:15}}>{u.name}</div><div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><span style={{fontFamily:"monospace",fontSize:11,color:"#8E8E93",background:"#F2F2F7",padding:"2px 7px",borderRadius:7}}>{u.id}</span><span style={{fontSize:11,color:"#8E8E93"}}>{roleLabel}</span></div><div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}><span style={{fontSize:11,color:"#C7C7CC"}}>NIP :</span><span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,background:"#F2F2F7",padding:"2px 8px",borderRadius:7,letterSpacing:"2px"}}>{"●●●●"}</span>{wkMs!==null&&<span style={{fontSize:11,color:"#8E8E93"}}>· {fmtHours(wkMs)} sem.</span>}</div></div></div><div style={{display:"flex",gap:8}}><button className="btn btn-outline" style={{fontSize:13,padding:"8px 16px",color:"#FF3B30",borderColor:"#FF3B30"}} onClick={()=>{if(confirm(`Supprimer ${u.name} ?`)){console.log("Deleting user:", u.id);deleteUser(u.id).catch(e=>console.error(e));}}}>🗑</button><button className="btn btn-outline" style={{fontSize:13,padding:"8px 16px"}} onClick={()=>setEditUserModal({...u})}>✏️ Modifier</button></div></div></div>);})}
        </div>)}

        {/* HISTORIQUE */}
        {adminTab==="done"&&(<div>{adminDone.length===0&&<div className="card" style={{textAlign:"center",padding:48,color:"#8E8E93"}}><div style={{fontSize:40,marginBottom:12}}>📋</div><p style={{fontWeight:600}}>Aucune commande complétée</p></div>}{adminDone.map(o=>{const e=getEmp(o.assignedTo);return(<div key={o.id} className="card" style={{marginBottom:10,borderLeft:"3px solid #34C759"}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,alignItems:"center"}}><div><div style={{display:"flex",gap:8,marginBottom:4,alignItems:"center"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#C7C7CC"}}>{o.id}</span><span className="badge bd">✓ Terminé</span></div><p style={{fontWeight:600,fontSize:14}}>{o.clientName}<span style={{fontWeight:400,color:"#8E8E93",fontSize:13}}> — {o.description}</span></p></div><div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>{e&&<span style={{fontSize:12,color:"#8E8E93"}}>👤 {e.name}</span>}<span style={{fontFamily:"monospace",fontSize:12,color:"#FF6B35"}}>⏱ {fmtMs(o.elapsed)}</span><span style={{fontSize:12,color:"#8E8E93"}}>{fmtDate(o.endTime)}</span></div></div></div>);})}</div>)}
      </div>

      {/* Modals admin */}
      {newOrderModal&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setNewOrderModal(false)}><div className="sheet"><div className="handle"/><h3 style={{fontSize:20,fontWeight:700,marginBottom:20}}>📦 Nouvelle commande</h3><div style={{display:"flex",flexDirection:"column",gap:14}}><div><label className="lbl">Nom du client</label><input className="inp" placeholder="Sophie Tremblay" value={newOrder.clientName} onChange={e=>setNewOrder(n=>({...n,clientName:e.target.value}))}/></div><div><label className="lbl">Courriel</label><input className="inp" type="email" placeholder="client@exemple.com" value={newOrder.clientEmail} onChange={e=>setNewOrder(n=>({...n,clientEmail:e.target.value}))}/></div><div><label className="lbl">Description</label><input className="inp" placeholder="50x t-shirts…" value={newOrder.description} onChange={e=>setNewOrder(n=>({...n,description:e.target.value}))}/></div><div style={{display:"flex",gap:12}}><div style={{flex:2}}><label className="lbl">Assigner à</label><select className="sel" value={newOrder.assignedTo} onChange={e=>setNewOrder(n=>({...n,assignedTo:e.target.value}))}><option value="">— Choisir —</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></div><div style={{flex:1}}><label className="lbl">Deadline</label><select className="sel" value={newOrder.deadlineDays} onChange={e=>setNewOrder(n=>({...n,deadlineDays:e.target.value}))}>{[1,2,3,4,5,7,10,14,21,30].map(d=><option key={d} value={d}>{d}j</option>)}</select></div></div><div style={{display:"flex",gap:10,marginTop:4}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setNewOrderModal(false)}>Annuler</button><button className="btn btn-primary" style={{flex:2,justifyContent:"center"}} onClick={addOrder}>Créer</button></div></div></div></div>)}

      {newStopModal&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setNewStopModal(false)}><div className="sheet"><div className="handle"/><h3 style={{fontSize:20,fontWeight:700,marginBottom:20}}>📍 Ajouter un arrêt</h3><div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label className="lbl">Type</label><div style={{display:"flex",gap:10}}>{[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l])=><button key={v} onClick={()=>setNewStop(n=>({...n,type:v}))} className="btn" style={{flex:1,justifyContent:"center",background:newStop.type===v?"#111":"white",color:newStop.type===v?"white":"#3A3A3C",border:"1.5px solid",borderColor:newStop.type===v?"#111":"#E5E5EA"}}>{l}</button>)}</div></div>
        {drivers.length>1&&<div><label className="lbl">Livreur</label><select className="sel" value={newStop.assignedTo} onChange={e=>setNewStop(n=>({...n,assignedTo:e.target.value}))}>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
        <div><label className="lbl">Nom du client</label><input className="inp" placeholder="Sophie Tremblay" value={newStop.clientName} onChange={e=>setNewStop(n=>({...n,clientName:e.target.value}))}/></div>
        <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={newStop.clientPhone} onChange={e=>setNewStop(n=>({...n,clientPhone:e.target.value}))}/></div>
        <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine, Montréal" value={newStop.address} onChange={e=>setNewStop(n=>({...n,address:e.target.value}))}/></div>
        <div><label className="lbl">Instructions spéciales</label><input className="inp" placeholder="Sonner 2 fois, apt 4B…" value={newStop.instructions} onChange={e=>setNewStop(n=>({...n,instructions:e.target.value}))}/></div>
        <div style={{display:"flex",gap:10,marginTop:4}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setNewStopModal(false)}>Annuler</button><button className="btn btn-purple" style={{flex:2,justifyContent:"center"}} onClick={addStop}>Ajouter à la tournée</button></div>
      </div></div></div>)}

      {editUserModal&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setEditUserModal(null)}><div className="sheet"><div className="handle"/><h3 style={{fontSize:20,fontWeight:700,marginBottom:6}}>✏️ Modifier le profil</h3><p style={{fontSize:13,color:"#8E8E93",marginBottom:20}}>{editUserModal.id}</p><div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label className="lbl">Nom affiché</label><input className="inp" value={editUserModal.name} onChange={e=>setEditUserModal(u=>({...u,name:e.target.value}))}/></div>
        <div><label className="lbl">NIP (4 chiffres)</label><input className="inp" type="password" maxLength={4} placeholder="••••" value={editUserModal.pin} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,4);setEditUserModal(u=>({...u,pin:v}));}} style={{letterSpacing:"6px",fontSize:20,textAlign:"center"}}/></div>
        <div><label className="lbl">Couleur</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#FF6B35","#007AFF","#34C759","#FF9500","#AF52DE","#FF3B30","#00C7BE","#5856D6","#111"].map(c=><div key={c} onClick={()=>setEditUserModal(u=>({...u,color:c}))} style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:editUserModal.color===c?"3px solid #1C1C1E":"3px solid transparent",transition:"border .15s"}}/>)}</div></div>
        <div style={{background:"#F9F9F9",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:13,background:editUserModal.color+"20",color:editUserModal.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800}}>{editUserModal.name?editUserModal.name[0]:"?"}</div><div><div style={{fontWeight:600}}>{editUserModal.name||"Nom"}</div><div style={{fontFamily:"monospace",fontSize:11,color:"#8E8E93"}}>{editUserModal.id} · NIP: {editUserModal.pin?"●".repeat(editUserModal.pin.length):"----"}</div></div></div></div>
        <div style={{display:"flex",gap:10,marginTop:4}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setEditUserModal(null)}>Annuler</button><button className="btn btn-primary" style={{flex:2,justifyContent:"center",opacity:editUserModal.pin.length===4?1:.5}} onClick={()=>editUserModal.pin.length===4&&saveUserEdit(editUserModal)}>Sauvegarder</button></div>
      </div></div></div>)}

      {newEmpModal&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setNewEmpModal(false)}><div className="sheet"><div className="handle"/><h3 style={{fontSize:20,fontWeight:700,marginBottom:20}}>👤 Nouveau membre</h3><div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label className="lbl">Rôle</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["employee","👷 Employé"],["driver","🚐 Livreur"],["accountant","📊 Comptable"]].map(([v,l])=><button key={v} onClick={()=>setNewEmp(n=>({...n,role:v}))} className="btn" style={{flex:1,justifyContent:"center",fontSize:13,background:newEmp.role===v?"#111":"white",color:newEmp.role===v?"white":"#3A3A3C",border:"1.5px solid",borderColor:newEmp.role===v?"#111":"#E5E5EA"}}>{l}</button>)}</div></div>
        <div><label className="lbl">Prénom</label><input className="inp" placeholder="Kevin" value={newEmp.name} onChange={e=>setNewEmp(n=>({...n,name:e.target.value}))} autoFocus/></div>
        <div><label className="lbl">NIP (4 chiffres)</label><input className="inp" type="password" maxLength={4} placeholder="••••" value={newEmp.pin} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,4);setNewEmp(n=>({...n,pin:v}));}} style={{letterSpacing:"6px",fontSize:20,textAlign:"center"}}/></div>
        <div><label className="lbl">Couleur</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#FF6B35","#007AFF","#34C759","#FF9500","#AF52DE","#FF3B30","#00C7BE","#5856D6"].map(c=><div key={c} onClick={()=>setNewEmp(n=>({...n,color:c}))} style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:newEmp.color===c?"3px solid #1C1C1E":"3px solid transparent",transition:"border .15s"}}/>)}</div></div>
        <div style={{display:"flex",gap:10,marginTop:4}}><button className="btn btn-outline" style={{flex:1,justifyContent:"center"}} onClick={()=>setNewEmpModal(false)}>Annuler</button><button className="btn btn-primary" style={{flex:2,justifyContent:"center",opacity:newEmp.name&&newEmp.pin.length===4?1:.5}} onClick={addUser}>Créer</button></div>
      </div></div></div>)}

      {toast&&<div className="toast">{toast}</div>}
    </div>
  );
}
