import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import {
  createQueue, createStation, deleteQueue, deleteStation,
  updateBusinessLogo, updateBusinessName, updateBusinessTheme, updateQueueName, updateStationName,
  watchQueues, watchStations, type QueueDoc, type Station
} from "../lib/queue";
import { THEMES } from "../lib/themes";

// A queue is just "a line" and a station is "a place a staff member stands" —
// the words "teller", "table", "counter" etc. are never hard-coded anywhere.
// Whatever name you type here (e.g. "Table 5", "Teller 3", "Loan Desk") is
// what customers and staff see everywhere else in the app.

export default function ManageBusiness() {
  const { businessSlug } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [theme, setTheme] = useState("classic");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoDraft, setLogoDraft] = useState("");
  const [queues, setQueues] = useState<QueueDoc[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [newQueueName, setNewQueueName] = useState("");
  const [newStationName, setNewStationName] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!businessSlug) return;
    (async () => {
      const snap = await getDocs(query(collection(db, "businesses"), where("slug", "==", businessSlug)));
      if (snap.empty) return;
      const data = snap.docs[0].data();
      setBusinessId(snap.docs[0].id);
      setBusinessName(data.name ?? "");
      setNameDraft(data.name ?? "");
      setTheme(data.theme ?? "classic");
      setLogoUrl(data.logoUrl ?? "");
      setLogoDraft(data.logoUrl ?? "");
    })();
  }, [businessSlug]);

  useEffect(() => {
    if (!businessId) return;
    const unsubQ = watchQueues(businessId, setQueues);
    const unsubS = watchStations(businessId, setStations);
    return () => { unsubQ(); unsubS(); };
  }, [businessId]);

  if (!businessId) return <div className="dashboard" />;
  if (!user) {
    return <div className="screen"><p>Sign in at <Link to={`/staff/${businessSlug}`}>/staff/{businessSlug}</Link> first.</p></div>;
  }

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Manage {businessName}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/b/${businessSlug}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
            Preview customer page
          </a>
          <Link to={`/staff/${businessSlug}`} className="btn btn-secondary">Back to terminal</Link>
        </div>
      </div>

      <section className="station-card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Business name</h3>
        <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
          style={{ padding: 8, marginRight: 8, minWidth: 220 }} />
        <button className="btn btn-primary" disabled={!nameDraft || nameDraft === businessName}
          onClick={async () => { await updateBusinessName(businessId, nameDraft); setBusinessName(nameDraft); }}>
          Save
        </button>
      </section>

      <section className="station-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Logo</h3>
        <p style={{ color: "#5B6B78", fontSize: 14, marginTop: -8 }}>
          Paste a link to an image (from your website, Google Drive share link, Imgur, etc.) —
          it'll show above your business name on the customer ticket page.
        </p>
        <input value={logoDraft} onChange={(e) => setLogoDraft(e.target.value)}
          placeholder="https://..." style={{ padding: 8, marginRight: 8, width: "100%", maxWidth: 420 }} />
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-primary" disabled={logoDraft === logoUrl}
            onClick={async () => { await updateBusinessLogo(businessId, logoDraft); setLogoUrl(logoDraft); }}>
            Save
          </button>
          {logoUrl && (
            <button className="btn btn-secondary" style={{ marginLeft: 8 }}
              onClick={async () => { await updateBusinessLogo(businessId, ""); setLogoUrl(""); setLogoDraft(""); }}>
              Remove logo
            </button>
          )}
        </div>
        {logoDraft && <img src={logoDraft} alt="Logo preview" style={{ maxHeight: 60, marginTop: 12, display: "block" }} />}
      </section>

      <section className="station-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Theme</h3>
        <p style={{ color: "#5B6B78", fontSize: 14, marginTop: -8 }}>
          How the customer ticket page looks — pick whatever fits your brand.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {THEMES.map((th) => (
            <button key={th.id} type="button"
              className={`theme-swatch${theme === th.id ? " selected" : ""}`}
              onClick={async () => { await updateBusinessTheme(businessId, th.id); setTheme(th.id); }}>
              <span className="theme-swatch-dot" style={{ background: th.swatch }} />
              {th.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3>Queues (lines)</h3>
        <p style={{ color: "#5B6B78", fontSize: 14, marginTop: -8 }}>
          A queue is a line customers join — e.g. "General", "Table for 2", "Loans".
        </p>
        <div className="station-grid">
          {queues.map((q) => (
            <QueueRow key={q.id} businessId={businessId} queue={q} />
          ))}
        </div>
        <div className="station-card" style={{ marginTop: 12 }}>
          <input placeholder="New queue name" value={newQueueName}
            onChange={(e) => setNewQueueName(e.target.value)} style={{ padding: 8, marginRight: 8 }} />
          <button className="btn btn-primary" disabled={!newQueueName}
            onClick={async () => { await createQueue(businessId, newQueueName); setNewQueueName(""); }}>
            Add queue
          </button>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3>Stations</h3>
        <p style={{ color: "#5B6B78", fontSize: 14, marginTop: -8 }}>
          A station is where a staff member serves customers — call it whatever
          fits your business: "Teller 3", "Table 5", "Counter 1".
        </p>
        <div className="station-grid">
          {stations.map((s) => (
            <StationRow key={s.id} businessId={businessId} station={s} />
          ))}
        </div>
        <div className="station-card" style={{ marginTop: 12 }}>
          <input placeholder="New station name" value={newStationName}
            onChange={(e) => setNewStationName(e.target.value)} style={{ padding: 8, marginRight: 8 }} />
          <button className="btn btn-primary" disabled={!newStationName}
            onClick={async () => { await createStation(businessId, newStationName); setNewStationName(""); }}>
            Add station
          </button>
        </div>
      </section>
    </div>
  );
}

function QueueRow({ businessId, queue }: { businessId: string; queue: QueueDoc }) {
  const [draft, setDraft] = useState(queue.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="station-card">
      <input value={draft} onChange={(e) => setDraft(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary" disabled={!draft || draft === queue.name}
          onClick={() => updateQueueName(businessId, queue.id, draft)}>
          Save
        </button>
        {!confirmingDelete ? (
          <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>Remove</button>
        ) : (
          <>
            <button className="btn btn-danger" onClick={() => deleteQueue(businessId, queue.id)}>Confirm remove</button>
            <button className="btn btn-secondary" onClick={() => setConfirmingDelete(false)}>Cancel</button>
          </>
        )}
      </div>
      <p style={{ fontSize: 12, color: "#5B6B78", marginTop: 8, marginBottom: 0 }}>
        {queue.cutoff ? "Closed to new customers" : "Open"} · next ticket #{queue.nextNumber}
      </p>
    </div>
  );
}

function StationRow({ businessId, station }: { businessId: string; station: Station }) {
  const [draft, setDraft] = useState(station.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="station-card">
      <input value={draft} onChange={(e) => setDraft(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary" disabled={!draft || draft === station.name}
          onClick={() => updateStationName(businessId, station.id, draft)}>
          Save
        </button>
        {!confirmingDelete ? (
          <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}
            disabled={!!station.currentTicketId}>
            Remove
          </button>
        ) : (
          <>
            <button className="btn btn-danger" onClick={() => deleteStation(businessId, station.id)}>Confirm remove</button>
            <button className="btn btn-secondary" onClick={() => setConfirmingDelete(false)}>Cancel</button>
          </>
        )}
      </div>
      <p style={{ fontSize: 12, color: "#5B6B78", marginTop: 8, marginBottom: 0 }}>
        Status: {station.status}{station.currentTicketId ? " · currently serving (finish before removing)" : ""}
      </p>
    </div>
  );
}
