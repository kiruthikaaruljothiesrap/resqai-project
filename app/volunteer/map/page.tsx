"use client";
import { useEffect, useState, useMemo } from "react";
import { subscribeToNeeds, createTask } from "@/lib/firestore";
import { Need } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };

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
      // Calculate ETA using current location
      if (userCoords && need.location?.lat && need.location?.lng) {
        const km = haversineKm(userCoords.lat, userCoords.lng, need.location.lat, need.location.lng);
        const minutes = Math.round((km / 30) * 60); // assume 30 km/h average speed
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
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Live Map View</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Real-time open help requests plotted in your area</p>
      </div>

      {/* ETA Banner */}
      {acceptedEta && (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", gap: 24, alignItems: "center" }}>
          <span style={{ fontSize: 28 }}>🚗</span>
          <div>
            <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 15 }}>Task Accepted! En Route</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
              Distance: <strong style={{ color: "#f0f9fa" }}>{acceptedEta.km} km</strong> · Estimated arrival: <strong style={{ color: "#f59e0b" }}>{acceptedEta.minutes} minutes</strong> (avg. 30 km/h)
            </div>
          </div>
          <button onClick={() => setAcceptedEta(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
      )}

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
              
              {/* User location (center mock) */}
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
                  <div style={{ color: "#000", padding: 4 }}>
                     <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{selectedMarker.title}</div>
                     <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>{selectedMarker.location?.address}</div>
                     <button onClick={() => handleAccept(selectedMarker)} style={{
                        marginTop: 10, width: "100%", padding: "6px", borderRadius: 6, border: "none",
                        background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff",
                        fontWeight: 700, cursor: "pointer", fontSize: 12,
                      }}>Accept</button>
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
                    <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#14b8c4" strokeWidth="1" />
                    <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#14b8c4" strokeWidth="1" />
                  </g>
                ))}
              </svg>
              <div style={{ zIndex: 10, textAlign: "center", padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#14b8c4", marginBottom: 6 }}>Google Maps Not Configured</div>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to activate real-time mapping.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>
            {needs.length} Requests Nearby
          </div>
          {needs.map((m) => {
            const distKm = userCoords && m.location?.lat && m.location?.lng
              ? haversineKm(userCoords.lat, userCoords.lng, m.location.lat, m.location.lng).toFixed(1)
              : null;
            return (
            <button key={m.id} onClick={() => setSelected(selected === m.id ? null : m.id)} style={{
              padding: "14px 16px", borderRadius: 12, border: "1px solid",
              borderColor: selected === m.id ? priorityColors[m.priority] || "#fff" : "rgba(20,184,196,0.15)",
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
                  {distKm && (
                    <div style={{ fontSize: 11, color: "#14b8c4", marginTop: 3 }}>📍 {distKm} km · ~{Math.round(Number(distKm) / 30 * 60)} min away</div>
                  )}
                </div>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: priorityColors[m.priority] || "#fff", flexShrink: 0,
                }} />
              </div>
            </button>
            );
          })}

          {/* Legend */}
          <div className="glass-card" style={{ padding: 14, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10 }}>LEGEND</div>
            {Object.entries(priorityColors).map(([key, color]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "capitalize" }}>{key} Priority</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366f1" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Your Location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
