import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function SignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setBusy(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const businessQuery = query(
        collection(db, "businesses"),
        where("ownerUid", "==", credential.user.uid)
      );

      const businessSnapshot = await getDocs(businessQuery);

      if (businessSnapshot.empty) {
        setError("Your account isn't linked to a business yet.");
        setBusy(false);
        return;
      }

      const business = businessSnapshot.docs[0].data();

      if (!business.slug) {
        setError("Your business account is missing a link name.");
        setBusy(false);
        return;
      }

      navigate(`/staff/${business.slug}/manage`);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "auth/invalid-credential"
      ) {
        setError("Incorrect email or password.");
      } else {
        setError("Couldn't sign in — check your email and password.");
      }

      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div
        className="ticket"
        style={{
          textAlign: "left",
          maxWidth: 380,
        }}
      >
        <div
          className="ticket-label"
          style={{
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Q
        </div>

        <h2
          style={{
            textAlign: "center",
            marginTop: 0,
          }}
        >
          Sign in
        </h2>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="signin-email"
            style={{
              fontSize: 13,
              color: "#5B6B78",
            }}
          >
            Email
          </label>

          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            placeholder="you@business.com"
            style={{
              width: "100%",
              padding: 10,
              margin: "4px 0 12px",
            }}
          />

          <label
            htmlFor="signin-password"
            style={{
              fontSize: 13,
              color: "#5B6B78",
            }}
          >
            Password
          </label>

          <input
            id="signin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              padding: 10,
              margin: "4px 0 16px",
            }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{
              width: "100%",
            }}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error && (
          <p
            style={{
              color: "#B4442E",
              marginTop: 10,
            }}
          >
            {error}
          </p>
        )}

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#5B6B78",
            marginBottom: 0,
          }}
        >
          New here? <Link to="/signup">Set up your business</Link>
        </p>
      </div>
    </div>
  );
}