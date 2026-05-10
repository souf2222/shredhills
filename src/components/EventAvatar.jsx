import { CountryFlag } from "../utils/countries";

export function EventAvatar({ event, size = 44 }) {
  if (event.icon) {
    return (
      <div style={{
        width:size, height:size, borderRadius:"50%",
        background:(event.color || "#007AFF") + "20",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:Math.round(size * 0.46), flexShrink:0,
      }}>
        {event.icon}
      </div>
    );
  }
  if (event.country) {
    return <CountryFlag code={event.country} size={size}/>;
  }
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:(event.color || "#007AFF") + "20",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:Math.round(size * 0.46), flexShrink:0,
    }}>
      📅
    </div>
  );
}
