import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

// A plain <img> pointed at a free QR-generation API — zero extra bundle size,
// zero API key, works entirely on the free tier. If you ever want it fully
// offline/self-hosted, swap this for a small client-side QR library later.
function qrImageUrl(data: string, size = 400) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function BusinessQr() {
  const { businessSlug } = useParams();
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (!businessSlug) return;
    (async () => {
      const snap = await getDocs(query(collection(db, "businesses"), where("slug", "==", businessSlug)));
      if (!snap.empty) setBusinessName(snap.docs[0].data().name ?? "");
    })();
  }, [businessSlug]);

  const customerUrl = `${window.location.origin}/b/${businessSlug}`;

  return (
    <div className="screen">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="ticket" style={{ maxWidth: 420 }}>
        <div className="ticket-label">{businessName || businessSlug}</div>
        <h2 style={{ margin: "8px 0 20px" }}>Scan to join the line</h2>
        <img src={qrImageUrl(customerUrl)} alt="QR code to join the queue"
          style={{ width: "100%", maxWidth: 320, height: "auto" }} />
        <p style={{ fontSize: 12, color: "#5B6B78", wordBreak: "break-all", marginTop: 16 }}>
          {customerUrl}
        </p>
      </div>
      <button className="btn btn-primary no-print" style={{ marginTop: 20 }}
        onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}
