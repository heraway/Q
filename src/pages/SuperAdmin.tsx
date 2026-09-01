import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth, db, SUPER_ADMIN_EMAILS } from "../lib/firebase";

// This screen is only USEFUL for m.mukuka1323@gmail.com — but the real
// enforcement is in firestore.rules, not here. Never trust a client-side
// check alone for admin power.

interface Business { id: string; name: string; slug: string; }

export default function SuperAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "businesses"), (snap) => {
      setBusinesses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Business)));
    });
  }, [user]);

  const isAllowed = user && SUPER_ADMIN_EMAILS.includes(user.email ?? "");

  async function handleCreateBusiness() {
    if (!newName || !newSlug) return;
    await addDoc(collection(db, "businesses"), { name: newName, slug: newSlug, createdAt: new Date() });
    // After creating, add at least one queue (e.g. "General") and one station
    // ("Counter 1") from the Firestore console or a follow-up form — kept out
    // of this MVP screen to stay small; see README for the manual step.
    setNewName(""); setNewSlug("");
  }

  if (!user) {
    return (
      <div className="screen">
        <div className="ticket" style={{ textAlign: "left" }}>
          <div className="ticket-label" style={{ textAlign: "center" }}>Super admin</div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, margin: "8px 0" }} />
          <input placeholder="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }} />
          <button className="btn btn-primary" style={{ width: "100%" }}
            onClick={() => signInWithEmailAndPassword(auth, email, password)}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return <div className="screen"><p>This account isn't a super admin.</p></div>;
  }

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>All businesses</h2>
        <button className="btn btn-secondary" onClick={() => signOut(auth)}>Sign out</button>
      </div>

      <div className="station-card">
        <input placeholder="Business name" value={newName} onChange={(e) => setNewName(e.target.value)}
          style={{ padding: 8, marginRight: 8 }} />
        <input placeholder="slug-like-this" value={newSlug} onChange={(e) => setNewSlug(e.target.value)}
          style={{ padding: 8, marginRight: 8 }} />
        <button className="btn btn-primary" onClick={handleCreateBusiness}>Add business</button>
      </div>

      <div className="station-grid">
        {businesses.map((b) => (
          <div className="station-card" key={b.id}>
            <div className="station-name">{b.name}</div>
            <p style={{ fontSize: 13, color: "#5B6B78" }}>
              Customer link: /b/{b.slug}<br />Staff link: /staff/{b.slug}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
