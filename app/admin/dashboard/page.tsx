"use client";
import { useEffect, useState } from "react";
import { subscribeToUsers } from "@/lib/firestore";
import { UserProfile } from "@/lib/auth";
import { doc, updateDoc, collection, query, where, getDocs, limit, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";

export default function AdminDashboard() {
  const [ngos, setNgos] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToUsers("ngo", (users) => {
      setNgos(users);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const pendingNgos = ngos.filter(n => n.status === "pending_verification");
  const verifiedNgos = ngos.filter(n => n.status === "verified");

  const handleUpdateStatus = async (uid: string, status: "verified" | "rejected" | "pending_verification") => {
    let adminNote = "";
    if (status === "rejected") {
      adminNote = prompt("Please provide a reason for rejection:") || "";
      if (!adminNote) return alert("Rejection reason is required.");
    }

    try {
      // 1. Update User Profile
      await updateDoc(doc(db, "users", uid), { 
        status, 
        adminNote: adminNote || null,
        verifiedAt: status === "verified" ? new Date().toISOString() : null
      });

      // 2. Sync with ngoCertificates collection
      const q = query(collection(db, "ngoCertificates"), where("ngoId", "==", uid), where("status", "==", "pending"), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const certDoc = snap.docs[0];
        await updateDoc(certDoc.ref, {
          status,
          adminNote: adminNote || null,
          verifiedAt: status === "verified" ? new Date().toISOString() : null
        });
      }

      // 3. Send in-app notification to the NGO
      await createNotification({
        userId: uid,
        title: status === "verified"
          ? "🎉 Your NGO has been Approved!"
          : status === "rejected"
          ? "❌ NGO Verification Rejected"
          : "⏳ NGO Status Updated",
        body: status === "verified"
          ? "Congratulations! Your NGO is now verified. You have full access to ResQAI."
          : status === "rejected"
          ? `Your NGO was rejected. Reason: ${adminNote}`
          : "Your NGO status has been updated to Pending. Please check your dashboard.",
        type: "system",
        link: "/ngo/dashboard",
      });

      alert(`NGO status updated to ${status}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const verifyWithAI = async (ngo: UserProfile) => {
    if (!ngo.ngoCertificateUrl) return alert("No certificate uploaded to verify.");
    setVerifyingId(ngo.uid);
    try {
      const res = await fetch("/api/ocr", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            base64Image: ngo.ngoCertificateUrl, // Can be a URL too, our backend will adapt or vision model accepts URL
            expectedRegNo: ngo.ngoRegistrationNo,
            expectedName: ngo.firstName + " " + ngo.lastName, // Assuming NGO name is stored here
         })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Data contains the Gemini OCR evaluation
      const verification = data.verification;
      const confirmStr = `AI Confidence: ${verification.confidence.toUpperCase()}\n\nAI Remarks: ${verification.reason}\n\nExtracted Reg No: ${verification.extractedRegNo || "N/A"}\n\nDo you want to instantly APPROVE this NGO based on AI results?`;

      if (verification.isVerified && confirm(confirmStr)) {
        await handleUpdateStatus(ngo.uid, "verified");
      } else {
        alert(confirmStr + "\n\nAction aborted. Please review manually.");
      }
    } catch (err: any) {
      alert("AI Verification failed: " + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) return <div style={{ color: "#fff" }}>Loading Dashboard...</div>;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Platform Administration</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Approve NGOs and monitor platform activity</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Pending Verification */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#f59e0b" }}>⚠️ Pending Approvals ({pendingNgos.length})</h2>
          {pendingNgos.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 14 }}>All caught up! No pending NGOs.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pendingNgos.map(ngo => (
                <div key={ngo.uid} style={{ border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 16, background: "rgba(245,158,11,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#f0f9fa" }}>{ngo.firstName} {ngo.lastName}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>@{ngo.username} • {ngo.email}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#eab308", background: "rgba(234,179,8,0.1)", padding: "4px 8px", borderRadius: 8 }}>Pending</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Reg No.</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ngo.ngoRegistrationNo || "Missing"}</div>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Established</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ngo.ngoEstablishedYear || "Missing"}</div>
                    </div>
                  </div>

                  {ngo.ngoCertificateUrl && (
                    <div style={{ marginBottom: 16 }}>
                       <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Uploaded Certificate</div>
                       {ngo.ngoCertificateUrl.endsWith('.pdf') || ngo.ngoCertificateUrl.includes('.pdf') ? (
                         <div style={{ display: 'flex', gap: 10 }}>
                             <a href={ngo.ngoCertificateUrl} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", textDecoration: "none", fontSize: 13 }}>📄 View PDF</a>
                         </div>
                       ) : (
                         <img src={ngo.ngoCertificateUrl} alt="Certificate" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, background: "rgba(0,0,0,0.4)" }} />
                       )}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => verifyWithAI(ngo)} disabled={verifyingId === ngo.uid} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#818cf8", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      {verifyingId === ngo.uid ? "Scanning..." : "🤖 AI Scan"}
                    </button>
                    <button onClick={() => handleUpdateStatus(ngo.uid, "verified")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => handleUpdateStatus(ngo.uid, "rejected")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verified List */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#22c55e" }}>✅ Verified NGOs ({verifiedNgos.length})</h2>
          {verifiedNgos.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 14 }}>No verified NGOs yet.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {verifiedNgos.map(ngo => (
                <div key={ngo.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f9fa" }}>{ngo.firstName} {ngo.lastName}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Reg: {ngo.ngoRegistrationNo}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => verifyWithAI(ngo)} disabled={verifyingId === ngo.uid} style={{ padding: "4px 8px", background: "none", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, color: "#818cf8", fontSize: 11, cursor: "pointer" }}>
                      {verifyingId === ngo.uid ? "..." : "🤖 Re-scan"}
                    </button>
                    <button onClick={() => handleUpdateStatus(ngo.uid, "pending_verification")} style={{ padding: "4px 8px", background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
