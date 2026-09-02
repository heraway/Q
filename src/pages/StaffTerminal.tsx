import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut, type User
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import {
  callNext, markServed, setQueueCutoff, setStationStatus,
  watchQueues, watchStations, watchWaitingTickets,
  type QueueDoc, type Station
} from "../lib/queue";

export default function StaffTerminal() {
  const { businessSlug } = useParams();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [queues, setQueues] = useState<QueueDoc[]>([]);
  const [myStationId, setMyStationId] = useState<string | null>(null);
  const [myQueueId, setMyQueueId] = useState<string | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    if (!businessSlug) return;
    (async () => {
      const snap = await getDocs(query(collection(db, "businesses"), where("slug", "==", businessSlug)));
      if (!snap.empty) setBusinessId(snap.docs[0].id);
    })();
  }, [businessSlug]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!businessId) return;
    const unsubS = watchStations(businessId, setStations);
    const unsubQ = watchQueues(businessId, (qs) => {
      setQueues(qs);
      if (!myQueueId && qs.length) setMyQueueId(qs[0].id);
    });
    return () => { unsubS(); unsubQ(); };
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !myQueueId) return;
    return watchWaitingTickets(businessId, myQueueId, (tickets) => setWaitingCount(tickets.length));
  }, [businessId, myQueueId]);

  async function handleLogin() {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setAuthError("Couldn't sign in — check your email and password.");
    }
  }

  const myStation = stations.find((s) => s.id === myStationId);

  async function handleCallNext() {
    if (!businessId || !myStationId || !myQueueId) return;
    await callNext(businessId, myStationId, myQueueId);
  }

  async function handleMarkServed() {
    if (!businessId || !myStationId || !myStation?.currentTicketId) return;
    await markServed(businessId, myStationId, myStation.currentTicketId);
  }

  async function handleToggleBreak() {
    if (!businessId || !myStationId || !myStation) return;
    await setStationStatus(businessId, myStationId, myStation.status === "break" ? "active" : "break");
  }

  if (!businessId) return <div className="dashboard" />;

  if (!user) {
    return (
      <div className="screen">
        <div className="ticket" style={{ textAlign: "left" }}>
          <div className="ticket-label" style={{ textAlign: "center", marginBottom: 12 }}>Staff sign in</div>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }} />
          <input placeholder="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }} />
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleLogin}>Sign in</button>
          {authError && <p style={{ color: "#B4442E" }}>{authError}</p>}
        </div>
      </div>
    );
  }

  if (!myStationId) {
    return (
      <div className="dashboard">
        <h2>Pick your station</h2>
        <div className="station-grid">
          {stations.map((s) => (
            <button key={s.id} className="station-card" onClick={() => setMyStationId(s.id)}>
              <div className="station-name">{s.name}</div>
              <span className="pill">{s.status}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{myStation?.name}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/staff/${businessSlug}/manage`} className="btn btn-secondary">Manage</Link>
          <button className="btn btn-secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      <div className="station-card" style={{ marginTop: 16 }}>
        <label>Queue: </label>
        <select value={myQueueId ?? ""} onChange={(e) => setMyQueueId(e.target.value)}>
          {queues.map((q) => <option key={q.id} value={q.id}>{q.name} ({q.cutoff ? "closed" : "open"})</option>)}
        </select>
        <p style={{ color: "#5B6B78", fontSize: 14 }}>{waitingCount} waiting in this queue</p>

        {myStation?.currentTicketId ? (
          <>
            <p>Serving ticket now.</p>
            <button className="btn btn-primary" onClick={handleMarkServed}>Mark served</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={handleCallNext}
            disabled={myStation?.status === "break" || waitingCount === 0}>
            Call next
          </button>
        )}

        <div style={{ marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={handleToggleBreak}>
            {myStation?.status === "break" ? "Back from break" : "Go on break"}
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: 28 }}>Line controls</h3>
      <div className="station-grid">
        {queues.map((q) => (
          <div className="station-card" key={q.id}>
            <div className="station-name">{q.name}</div>
            <button className="btn btn-danger" style={{ marginTop: 10 }}
              onClick={() => setQueueCutoff(businessId, q.id, !q.cutoff)}>
              {q.cutoff ? "Reopen line" : "Stop new customers"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
