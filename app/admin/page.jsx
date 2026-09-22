"use client";

import { useEffect, useState, useCallback } from "react";

const empty = { id: "", name: "", google: "", facebook: "", maxReviews: 30, minRating: 4 };

function ago(ts) {
  if (!ts) return "—";
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return d + " days ago";
  return Math.floor(d / 30) + " months ago";
}

export default function Admin() {
  const [widgets, setWidgets] = useState([]);
  const [persistent, setPersistent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/widgets");
    const data = await res.json();
    setWidgets(data.widgets || []);
    setPersistent(data.persistent);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(t) {
    setMsg(t);
    setTimeout(() => setMsg(""), 4000);
  }

  function openNew() {
    setEditing(false);
    setForm({ ...empty });
  }
  function openEdit(w) {
    setEditing(true);
    setForm({
      id: w.id,
      name: w.name,
      google: w.sources?.google?.place_id || "",
      facebook: w.sources?.facebook?.page_url || "",
      maxReviews: w.maxReviews || 30,
      minRating: w.minRating ?? 4,
    });
  }

  async function save(e) {
    e.preventDefault();
    setBusy("save");
    const res = await fetch("/api/admin/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) return flash("⚠ " + (data.error || "Save failed"));
    setForm(null);
    flash("Saved " + data.widget.id);
    load();
  }

  async function refresh(id) {
    setBusy("refresh:" + (id || "all"));
    const res = await fetch("/api/admin/refresh" + (id ? "?id=" + id : ""), { method: "POST" });
    const data = await res.json();
    setBusy("");
    if (!res.ok) return flash("⚠ " + (data.error || "Refresh failed"));
    const r = data.results || [];
    const errs = r.filter((x) => x.error);
    flash(`Pulled ${r.length} location(s). ` + (errs.length ? `${errs.length} had errors — check config.` : "All good."));
    load();
  }

  async function remove(w) {
    if (!confirm(`Delete "${w.name}"? This removes its config and cached reviews.`)) return;
    setBusy("del:" + w.id);
    await fetch("/api/admin/widgets/" + w.id, { method: "DELETE" });
    setBusy("");
    flash("Deleted " + w.id);
    load();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="nx">
      <style>{NX_CSS}</style>

      {/* Sidebar */}
      <aside className="nx-side">
        <div className="nx-ws">
          <span className="nx-ws-ico">★</span>
          <span className="nx-ws-name">Reviews</span>
        </div>
        <nav className="nx-nav">
          <div className="nx-item active">
            <span className="nx-item-ico">🗂️</span> Locations
          </div>
        </nav>
        <div className="nx-side-foot">
          <button className="nx-item" onClick={logout}>
            <span className="nx-item-ico">⇥</span> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="nx-main">
        <div className="nx-page">
          <div className="nx-icon">★</div>
          <h1 className="nx-title">Locations</h1>
          <p className="nx-desc">
            Pull Google &amp; Facebook reviews, then export a Webflow-ready CSV per location.
          </p>

          {!persistent && (
            <div className="nx-callout warn">
              <span>⚠️</span>
              <span>Using local file cache. Add the Upstash / Vercel KV integration so changes persist in production.</span>
            </div>
          )}
          {msg && (
            <div className="nx-callout ok">
              <span>✓</span>
              <span>{msg}</span>
            </div>
          )}

          <div className="nx-toolbar">
            <div className="nx-count">
              {loading ? "Loading…" : `${widgets.length} ${widgets.length === 1 ? "location" : "locations"}`}
            </div>
            <div className="nx-tools">
              <button className="nx-btn" onClick={() => refresh()} disabled={busy === "refresh:all"}>
                {busy === "refresh:all" ? "Pulling…" : "↻ Refresh all"}
              </button>
              <button className="nx-btn primary" onClick={openNew}>
                + New
              </button>
            </div>
          </div>

          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Sources</th>
                  <th>Reviews</th>
                  <th>Updated</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="nx-empty">
                      Loading…
                    </td>
                  </tr>
                ) : widgets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="nx-empty">
                      <div className="nx-empty-ico">🗂️</div>
                      No locations yet. Click <strong>+ New</strong> to add one.
                    </td>
                  </tr>
                ) : (
                  widgets.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div className="nx-name">{w.name}</div>
                        <div className="nx-id">{w.id}</div>
                      </td>
                      <td>
                        {w.sources?.google && <span className="nx-tag g">Google</span>}
                        {w.sources?.facebook && <span className="nx-tag f">Facebook</span>}
                      </td>
                      <td>
                        {w.status ? (
                          <span className="nx-rev">
                            <strong>{w.status.count}</strong>
                            {w.status.overall ? <span className="nx-star"> · ★ {w.status.overall}</span> : null}
                          </span>
                        ) : (
                          <span className="nx-pending">Not pulled</span>
                        )}
                      </td>
                      <td className="nx-muted">{w.status ? ago(w.status.updatedAt) : "—"}</td>
                      <td className="right nowrap">
                        <button className="nx-act" onClick={() => refresh(w.id)} disabled={busy === "refresh:" + w.id}>
                          {busy === "refresh:" + w.id ? "Pulling…" : "Pull"}
                        </button>
                        <a className="nx-act" href={`/api/export/${w.id}`}>
                          CSV
                        </a>
                        <button className="nx-act" onClick={() => openEdit(w)}>
                          Edit
                        </button>
                        <button className="nx-act danger" onClick={() => remove(w)} disabled={busy === "del:" + w.id}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / edit modal */}
      {form && (
        <div className="nx-overlay" onClick={() => setForm(null)}>
          <form className="nx-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="nx-modal-head">
              <span className="nx-modal-ico">{editing ? "✎" : "＋"}</span>
              {editing ? "Edit location" : "New location"}
            </div>

            <div className="nx-grid">
              <div className="nx-field">
                <label className="nx-label">Business name</label>
                <input
                  className="nx-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alliance Jiu Jitsu Carmel Mountain"
                  autoFocus
                  required
                />
              </div>
              <div className="nx-field">
                <label className="nx-label">ID {editing ? "(locked)" : "(auto)"}</label>
                <input
                  className="nx-input"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="alliance-carmel"
                  disabled={editing}
                />
              </div>
              <div className="nx-field wide">
                <label className="nx-label">Google Maps location URL</label>
                <input
                  className="nx-input"
                  value={form.google}
                  onChange={(e) => setForm({ ...form, google: e.target.value })}
                  placeholder="https://maps.google.com/…  or  https://maps.app.goo.gl/…"
                />
              </div>
              <div className="nx-field wide">
                <label className="nx-label">Facebook page URL</label>
                <input
                  className="nx-input"
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="https://www.facebook.com/theirpage"
                />
              </div>
              <div className="nx-field">
                <label className="nx-label">Max reviews</label>
                <input
                  className="nx-input"
                  type="number"
                  min="1"
                  max="200"
                  value={form.maxReviews}
                  onChange={(e) => setForm({ ...form, maxReviews: e.target.value })}
                />
              </div>
              <div className="nx-field">
                <label className="nx-label">Minimum star rating</label>
                <select
                  className="nx-input"
                  value={form.minRating}
                  onChange={(e) => setForm({ ...form, minRating: Number(e.target.value) })}
                >
                  <option value={4}>4★ and above (recommended)</option>
                  <option value={5}>5★ only</option>
                  <option value={3}>3★ and above</option>
                  <option value={1}>All reviews</option>
                </select>
              </div>
            </div>

            <div className="nx-modal-foot">
              <button className="nx-btn" type="button" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="nx-btn primary" type="submit" disabled={busy === "save"}>
                {busy === "save" ? "Saving…" : editing ? "Save changes" : "Create location"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const NX_CSS = `
.nx{
  --bg:#ffffff; --side:#f7f7f5; --text:#37352f;
  --text2:rgba(55,53,47,.62); --text3:rgba(55,53,47,.4);
  --line:rgba(55,53,47,.09); --line2:rgba(55,53,47,.16);
  --hover:rgba(55,53,47,.055); --blue:#2383e2; --blue-d:#1a73d1;
  --font:ui-sans-serif,-apple-system,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif;
  display:flex; min-height:100vh; background:var(--bg); color:var(--text);
  font-family:var(--font); -webkit-font-smoothing:antialiased;
}
.nx *{box-sizing:border-box}
.nx button{font-family:inherit}

/* Sidebar */
.nx-side{
  width:240px; flex:0 0 240px; background:var(--side);
  border-right:1px solid var(--line); padding:14px 8px;
  display:flex; flex-direction:column; gap:2px;
}
.nx-ws{display:flex; align-items:center; gap:9px; padding:6px 8px 12px; }
.nx-ws-ico{
  width:22px; height:22px; border-radius:6px; background:var(--text);
  color:#fff; display:flex; align-items:center; justify-content:center;
  font-size:13px; flex:0 0 22px;
}
.nx-ws-name{font-weight:600; font-size:14.5px; letter-spacing:-.01em}
.nx-nav{display:flex; flex-direction:column; gap:1px; flex:1}
.nx-item{
  display:flex; align-items:center; gap:8px; width:100%;
  padding:6px 8px; border-radius:6px; border:none; background:none;
  color:var(--text2); font-size:14px; cursor:pointer; text-align:left;
  transition:background .12s ease;
}
.nx-item:hover{background:var(--hover)}
.nx-item.active{background:var(--hover); color:var(--text); font-weight:500}
.nx-item-ico{font-size:15px; width:18px; text-align:center; opacity:.85}
.nx-side-foot{border-top:1px solid var(--line); padding-top:6px; margin-top:6px}

/* Main */
.nx-main{flex:1; min-width:0; overflow-y:auto}
.nx-page{
  max-width:860px; margin:0 auto; padding:64px 56px 100px;
  animation:nxFade .45s cubic-bezier(.2,.6,.2,1) both;
}
@keyframes nxFade{from{opacity:0; transform:translateY(6px)}to{opacity:1; transform:none}}
.nx-icon{font-size:44px; line-height:1; margin-bottom:12px}
.nx-title{font-size:40px; font-weight:700; letter-spacing:-.021em; margin:0 0 8px}
.nx-desc{color:var(--text2); font-size:15px; margin:0 0 26px; max-width:560px; line-height:1.5}

/* Callouts */
.nx-callout{
  display:flex; gap:10px; align-items:flex-start; padding:11px 14px;
  border-radius:8px; font-size:13.5px; line-height:1.45; margin-bottom:14px;
}
.nx-callout.warn{background:#fbf3db; color:#5c4813}
.nx-callout.ok{background:#eaf3ee; color:#1c5c3b}

/* Toolbar */
.nx-toolbar{display:flex; align-items:center; justify-content:space-between; margin-bottom:8px}
.nx-count{font-size:13px; color:var(--text3); font-weight:500}
.nx-tools{display:flex; gap:8px}

/* Buttons */
.nx-btn{
  border:1px solid var(--line2); background:#fff; color:var(--text);
  border-radius:6px; padding:6px 12px; font-size:14px; font-weight:500;
  cursor:pointer; transition:background .12s ease, border-color .12s ease;
}
.nx-btn:hover{background:var(--hover)}
.nx-btn.primary{background:var(--blue); border-color:var(--blue); color:#fff}
.nx-btn.primary:hover{background:var(--blue-d); border-color:var(--blue-d)}
.nx-btn:disabled{opacity:.55; cursor:default}

/* Table */
.nx-table-wrap{
  border:1px solid var(--line2); border-radius:10px; overflow:hidden;
  overflow-x:auto; background:#fff;
}
.nx-table{width:100%; border-collapse:collapse; font-size:14px}
.nx-table th{
  text-align:left; font-size:11px; font-weight:500; text-transform:uppercase;
  letter-spacing:.06em; color:var(--text3); padding:10px 14px;
  border-bottom:1px solid var(--line); background:#fcfcfb; white-space:nowrap;
}
.nx-table th.right{text-align:right}
.nx-table td{padding:11px 14px; border-bottom:1px solid var(--line); vertical-align:middle}
.nx-table tbody tr:last-child td{border-bottom:none}
.nx-table tbody tr{transition:background .1s ease}
.nx-table tbody tr:hover{background:var(--hover)}
.nx-name{font-weight:500; letter-spacing:-.005em}
.nx-id{color:var(--text3); font-size:12px; margin-top:1px; font-variant:tabular-nums}
.right{text-align:right}
.nowrap{white-space:nowrap}
.nx-muted{color:var(--text3)}

/* Tags */
.nx-tag{
  display:inline-block; font-size:12px; font-weight:500; padding:2px 9px;
  border-radius:20px; margin-right:5px; line-height:1.5;
}
.nx-tag.g{background:#e8f0fe; color:#1a66c9}
.nx-tag.f{background:#e9ebfb; color:#3b4ecc}
.nx-rev strong{font-weight:600}
.nx-star{color:var(--text3)}
.nx-pending{color:#b7791f; font-size:13px}

/* Row action buttons */
.nx-act{
  border:none; background:none; color:var(--text2); font-size:13px;
  font-weight:500; cursor:pointer; padding:4px 7px; border-radius:5px;
  text-decoration:none; transition:background .1s ease, color .1s ease;
}
.nx-act:hover{background:rgba(55,53,47,.09); color:var(--text)}
.nx-act.danger:hover{background:#fbe9e7; color:#c0392b}
.nx-act:disabled{opacity:.5; cursor:default}

/* Empty */
.nx-empty{text-align:center; color:var(--text3); padding:44px 16px; font-size:14px}
.nx-empty-ico{font-size:30px; margin-bottom:10px; opacity:.6}

/* Modal */
.nx-overlay{
  position:fixed; inset:0; background:rgba(15,15,15,.35);
  display:grid; place-items:center; padding:20px; z-index:60;
  animation:nxFade .18s ease both;
}
.nx-modal{
  background:#fff; border-radius:12px; width:600px; max-width:100%;
  padding:24px 26px 22px; box-shadow:0 16px 60px rgba(15,15,15,.22);
  animation:nxPop .2s cubic-bezier(.2,.7,.2,1) both;
}
@keyframes nxPop{from{opacity:0; transform:scale(.97) translateY(6px)}to{opacity:1; transform:none}}
.nx-modal-head{display:flex; align-items:center; gap:9px; font-size:17px; font-weight:600; margin-bottom:20px}
.nx-modal-ico{
  width:24px; height:24px; border-radius:6px; background:var(--hover);
  display:flex; align-items:center; justify-content:center; font-size:14px; color:var(--text2);
}
.nx-grid{display:grid; grid-template-columns:1fr 1fr; gap:16px}
.nx-field{display:flex; flex-direction:column; gap:6px}
.nx-field.wide{grid-column:1 / -1}
.nx-label{font-size:12.5px; font-weight:500; color:var(--text2)}
.nx-input{
  width:100%; padding:8px 11px; border:1px solid var(--line2);
  border-radius:6px; font-size:14px; color:var(--text); background:#fff;
  font-family:inherit; transition:border-color .12s ease, box-shadow .12s ease;
}
.nx-input::placeholder{color:var(--text3)}
.nx-input:focus{outline:none; border-color:var(--blue); box-shadow:0 0 0 1px var(--blue)}
.nx-input:disabled{background:#f7f7f5; color:var(--text3)}
.nx-modal-foot{display:flex; justify-content:flex-end; gap:9px; margin-top:24px}

/* Responsive */
@media (max-width:820px){
  .nx{flex-direction:column}
  .nx-side{
    width:auto; flex:none; flex-direction:row; align-items:center;
    border-right:none; border-bottom:1px solid var(--line); padding:8px 12px; gap:6px;
  }
  .nx-ws{padding:0 8px 0 4px}
  .nx-nav{flex-direction:row; flex:1}
  .nx-side-foot{border-top:none; padding:0; margin:0}
  .nx-page{padding:36px 20px 80px}
  .nx-title{font-size:32px}
  .nx-grid{grid-template-columns:1fr}
}
`;
