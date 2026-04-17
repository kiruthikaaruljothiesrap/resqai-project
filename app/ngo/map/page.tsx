"use client";
import { useEffect, useState, useMemo } from "react";
import { subscribeToNeeds } from "@/lib/firestore";
import { Need } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 13.0827, lng: 80.2707 }; // Chennai

export default function NGOMapPage() {
  const { profile } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    const unsub = subscribeToNeeds((data) => {
      setNeeds(data.filter(n => n.ngoId === profile?.uid));
    });
    return () => unsub();
  }, [profile?.uid]);

  const selectedMarker = needs.find((m) => m.id === selected);
  
  // Custom Map styling for a dark theme (retro/night)
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
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Live Map View</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Real-time overview of your created requests and assigned volunteers</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        {/* Map placeholder */}
        <div className="glass-card" style={{ position: "relative", minHeight: 500, overflow: "hidden" }}>
          
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
              {selectedMarker && selectedMarker.location?.lat && (
                <InfoWindow position={{ lat: selectedMarker.location.lat, lng: selectedMarker.location.lng }} onCloseClick={() => setSelected(null)}>
                  <div style={{ color: "#000", padding: 4 }}>
                     <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{selectedMarker.title}</div>
                     <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>{selectedMarker.location?.address}</div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, #0d2b1d, #0f3a3e, #0d2b3a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 10
            }}>
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.1 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <g key={i}>
                    <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#f59e0b" strokeWidth="1" />
                    <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#f59e0b" strokeWidth="1" />
                  </g>
                ))}
              </svg>
              <div style={{ zIndex: 10, textAlign: "center", padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>Google Maps Not Configured</div>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to activate real-time mapping.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>
            {needs.length} Requests Plotted
          </div>
          {needs.map((m) => (
            <button key={m.id} onClick={() => setSelected(selected === m.id ? null : m.id)} style={{
              padding: "14px 16px", borderRadius: 12, border: "1px solid",
              borderColor: selected === m.id ? priorityColors[m.priority] || "#fff" : "rgba(245,158,11,0.15)",
              background: selected === m.id ? `${priorityColors[m.priority] || "#fff"}12` : "rgba(13,31,36,0.8)",
              cursor: "pointer", textAlign: "left", transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>🤝</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f9fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.location?.address}
                  </div>
                </div>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: priorityColors[m.priority] || "#fff", flexShrink: 0,
                }} />
              </div>
            </button>
          ))}

          {/* Legend */}
          <div className="glass-card" style={{ padding: 14, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>LEGEND</div>
            {Object.entries(priorityColors).map(([key, color]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "capitalize" }}>{key} Priority</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
