import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { createQueue, createStation } from "../lib/queue";

function slugify(input: string) {
  return input.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SignUp() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleNameChange(value: string) {
    setBusinessName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit() {
    setError(null);
    const cleanSlug = slugify(slug);
    if (!businessName || !cleanSlug || !email || !password) {
      setError("Fill in every field.");
      return;
    }
    setBusy(true);
    try {
      // Best-effort uniqueness check — not airtight against two people
      // submitting the same slug at the exact same instant, but good enough
      // for this scale, and easy to fix by just picking a different slug.
      const existing = await getDocs(query(collection(db, "businesses"), where("slug", "==", cleanSlug)));
      if (!existing.empty) {
        setError(`"${cleanSlug}" is already taken — try a different link name.`);
        setBusy(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const businessRef = await addDoc(collection(db, "businesses"), {
        name: businessName,
        slug: cleanSlug,
        staffUids: [cred.user.uid],
        ownerUid: cred.user.uid,
        theme: "classic",
        createdAt: serverTimestamp()
      });

      // Give them something usable immediately instead of an empty shell.
      await createQueue(businessRef.id, "General");
      await createStation(businessRef.id, "Station 1");

      navigate(`/staff/${cleanSlug}/manage`);
    } catch (e: any) {
      setError(e.code === "auth/email-already-in-use"
        ? "That email is already registered — sign in instead."
        : "Something went wrong — check your details and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="ticket" style={{ textAlign: "left", maxWidth: 380 }}>
        <div className="ticket-label" style={{ textAlign: "center", marginBottom: 4 }}>Q</div>
        <h2 style={{ textAlign: "center", marginTop: 0 }}>Set up your business</h2>

        <label style={{ fontSize: 13, color: "#5B6B78" }}>Business name</label>
        <input value={businessName} onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Sunrise Bakery" style={{ width: "100%", padding: 10, margin: "4px 0 12px" }} />

        <label style={{ fontSize: 13, color: "#5B6B78" }}>Your link — q-app-e67bc.web.app/b/...</label>
        <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          placeholder="sunrise-bakery" style={{ width: "100%", padding: 10, margin: "4px 0 12px" }} />

        <label style={{ fontSize: 13, color: "#5B6B78" }}>Your email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
          placeholder="you@business.com" style={{ width: "100%", padding: 10, margin: "4px 0 12px" }} />

        <label style={{ fontSize: 13, color: "#5B6B78" }}>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
          style={{ width: "100%", padding: 10, margin: "4px 0 16px" }} />

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy} onClick={handleSubmit}>
          {busy ? "Setting up..." : "Create my line"}
        </button>
        {error && <p style={{ color: "#B4442E", marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
}
