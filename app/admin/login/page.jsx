"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) window.location.href = "/admin";
    else setError("Wrong password");
  }

  return (
    <main className="lg">
      <style>{`
        .lg{
          --text:#37352f; --text2:rgba(55,53,47,.62); --line2:rgba(55,53,47,.16);
          --blue:#2383e2; --blue-d:#1a73d1;
          --font:ui-sans-serif,-apple-system,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif;
          min-height:100vh; display:grid; place-items:center; background:#f7f7f5;
          font-family:var(--font); color:var(--text); -webkit-font-smoothing:antialiased; padding:20px;
        }
        .lg *{box-sizing:border-box}
        .lg-card{
          background:#fff; border:1px solid var(--line2); border-radius:12px;
          width:340px; max-width:100%; padding:30px 28px;
          box-shadow:0 12px 44px rgba(15,15,15,.08);
          animation:lgPop .3s cubic-bezier(.2,.7,.2,1) both;
        }
        @keyframes lgPop{from{opacity:0; transform:translateY(8px)}to{opacity:1; transform:none}}
        .lg-ico{
          width:34px; height:34px; border-radius:8px; background:var(--text); color:#fff;
          display:flex; align-items:center; justify-content:center; font-size:18px; margin-bottom:14px;
        }
        .lg-h{font-size:19px; font-weight:600; margin:0 0 3px; letter-spacing:-.01em}
        .lg-sub{color:var(--text2); font-size:13.5px; margin:0 0 20px}
        .lg-in{
          width:100%; padding:9px 11px; border:1px solid var(--line2); border-radius:7px;
          font-size:14px; margin-bottom:12px; font-family:inherit; color:var(--text);
          transition:border-color .12s, box-shadow .12s;
        }
        .lg-in:focus{outline:none; border-color:var(--blue); box-shadow:0 0 0 1px var(--blue)}
        .lg-err{color:#c0392b; font-size:13px; margin-bottom:12px}
        .lg-btn{
          width:100%; padding:9px 12px; background:var(--blue); color:#fff; border:none;
          border-radius:7px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit;
          transition:background .12s;
        }
        .lg-btn:hover{background:var(--blue-d)}
        .lg-btn:disabled{opacity:.6; cursor:default}
      `}</style>

      <form className="lg-card" onSubmit={submit}>
        <div className="lg-ico">★</div>
        <h1 className="lg-h">Reviews Admin</h1>
        <p className="lg-sub">Enter your admin password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="lg-in"
        />
        {error && <div className="lg-err">{error}</div>}
        <button type="submit" disabled={busy} className="lg-btn">
          {busy ? "…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
