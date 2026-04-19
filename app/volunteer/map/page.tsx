"use client";
import { useEffect, useState, useMemo } from "react";
import { subscribeToNeeds, createTask } from "@/lib/firestore";
import { Need } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
const priorityBorderColors: Record<string, string> = { critical: "border-red-500", high: "border-orange-500", medium: "border-amber-500", low: "border-green-500" };
const priorityBgColors: Record<string, string> = { critical: "bg-red-500/10", high: "bg-orange-500/10", medium: "bg-amber-500/10", low: "bg-green-500/10" };

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 13.0827, lng: 80.2707 };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function MapPage() {
  const { profile } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [acceptedEta, setAcceptedEta] = useState<{ km: string; minutes: string } | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently fail
      );
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeToNeeds((data) => {
      setNeeds(data.filter(n => n.status === "open"));
    });
    return () => unsub();
  }, []);

  const selectedMarker = needs.find((m) => m.id === selected);

  const handleAccept = async (need: Need) => {
    if (!profile) return;
    try {
      await createTask({
        needId: need.id,
        volunteerId: profile.uid,
        volunteerName: profile.firstName,
        ngoId: need.ngoId,
        title: need.title,
        description: need.description,
        status: "pending",
        points: 50,
        estimatedHours: 2,
      });
      if (userCoords && need.location?.lat && need.location?.lng) {
        const km = haversineKm(userCoords.lat, userCoords.lng, need.location.lat, need.location.lng);
        const minutes = Math.round((km / 30) * 60);
        setAcceptedEta({ km: km.toFixed(1), minutes: minutes.toString() });
      }
      setSelected(null);
    } catch (e) {
      console.error(e);
      alert("Failed to accept task.");
    }
  };

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    ],
  }), []);

  return (
    <div className="space-y-6 lg:space-y-8 pb-32">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-[#f0f9fa] tracking-tight">Live Map View</h1>
        <p className="text-sm md:text-base text-[#94a3b8] font-medium tracking-wide">Real-time rescue requests in your vicinity</p>
      </div>

      {/* ETA Banner */}
      {acceptedEta && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center shadow-xl shadow-green-500/5">
          <span className="text-4xl">🚗</span>
          <div className="text-center sm:text-left">
            <div className="font-black text-green-500 text-base md:text-lg tracking-tight uppercase">Task Accepted! En Route</div>
            <div className="text-xs md:text-sm text-[#94a3b8] font-bold mt-1">
              Dist: <strong className="text-[#f0f9fa]">{acceptedEta.km} km</strong> · Arr. <strong className="text-amber-500">{acceptedEta.minutes} min</strong>
            </div>
          </div>
          <button onClick={() => setAcceptedEta(null)} className="sm:ml-auto p-2 text-[#64748b] hover:text-white transition-colors">✕</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Map Container */}
        <div className="flex-1 glass-card p-0 relative min-h-[400px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden group">
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && isLoaded ? (
            <GoogleMap mapContainerStyle={mapContainerStyle} zoom={11} center={defaultCenter} options={mapOptions}>
              {needs.map((m) => (
                m.location?.lat && m.location?.lng ? (
                  <Marker
                    key={m.id}
                    position={{ lat: m.location.lat, lng: m.location.lng }}
                    onClick={() => setSelected(m.id)}
                    icon={{
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="${priorityColors[m.priority] || '#fff'}" stroke="white" stroke-width="2"/>
                        </svg>
                      `)}`,
                      scaledSize: new window.google.maps.Size(24, 24),
                    }}
                  />
                ) : null
              ))}
              
              <Marker
                position={defaultCenter}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" fill="#6366f1" stroke="white" stroke-width="3"/>
                    </svg>
                  `)}`,
                  scaledSize: new window.google.maps.Size(24, 24),
                }}
              />

              {selectedMarker && selectedMarker.location?.lat && (
                <InfoWindow position={{ lat: selectedMarker.location.lat, lng: selectedMarker.location.lng }} onCloseClick={() => setSelected(null)}>
                  <div className="p-3 max-w-[200px] bg-slate-900">
                     <div className="font-black text-sm text-slate-100 mb-1">{selectedMarker.title}</div>
                     <div className="text-[10px] text-slate-400 font-bold mb-3">{selectedMarker.location?.address}</div>
                     <button onClick={() => handleAccept(selectedMarker)} className="w-full py-2 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform">
                        Accept Help Request
                     </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d2b1d] via-[#0f3a3e] to-[#0d2b3a] flex flex-col items-center justify-center p-8 text-center gap-6">
              <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                <div className="grid grid-cols-10 grid-rows-10 h-full w-full">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-[#14b8c4]/20" />
                  ))}
                </div>
              </div>
              <div className="z-10 bg-slate-900/40 p-10 rounded-[40px] backdrop-blur-xl border border-white/5 ring-1 ring-white/10">
                <div className="text-6xl mb-6 drop-shadow-2xl">🗺️</div>
                <div className="text-xl md:text-2xl font-black text-cyan-400 mb-2 uppercase tracking-tighter">Maps Disabled</div>
                <p className="text-sm md:text-base text-[#94a3b8] font-medium max-w-xs leading-relaxed">
                  Real-time GPS tracking requires a valid API key. Add it to your configs to unlock.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Bottom List */}
        <div className="w-full lg:w-[320px] flex flex-col gap-4">
          <div className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-2 px-1">
            {needs.length} Active Requests
          </div>
          
          <div className="flex flex-col gap-3 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {needs.map((m) => {
              const distKm = userCoords && m.location?.lat && m.location?.lng
                ? haversineKm(userCoords.lat, userCoords.lng, m.location.lat, m.location.lng).toFixed(1)
                : null;
              const isActive = selected === m.id;
              
              return (
                <button 
                  key={m.id} 
                  onClick={() => setSelected(isActive ? null : m.id)} 
                  className={`
                    p-5 rounded-2xl border transition-all text-left shadow-lg
                    ${isActive 
                      ? `${priorityBorderColors[m.priority] || "border-white/20"} ${priorityBgColors[m.priority] || "bg-white/5"} ring-1 ring-white/10 scale-[1.02]` 
                      : "border-white/5 bg-[#0d1f24]/80 hover:bg-white/5"}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl drop-shadow-md">🤝</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-[#f0f9fa] truncate tracking-tight">{m.title}</div>
                      <div className="text-[11px] font-medium text-[#64748b] mt-1 truncate">
                        {m.location?.address}
                      </div>
                      {distKm && (
                        <div className="inline-flex items-center gap-2 mt-3 text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-400/5 px-2 py-1 rounded">
                          📍 {distKm} km · {Math.round(Number(distKm) / 30 * 60)}m
                        </div>
                      )}
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse mt-1 shadow-[0_0_8px]`} 
                         style={{ backgroundColor: priorityColors[m.priority] || '#fff', boxShadow: `0 0 10px ${priorityColors[m.priority] || '#fff'}44` }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="glass-card p-6 mt-2 border-white/5 ring-1 ring-white/5 bg-[#0d1f24]/40">
            <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] mb-4">Priority Map</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(priorityColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{key}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1] shadow-lg shadow-indigo-500/20" />
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Me</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
