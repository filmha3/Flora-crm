import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Nothing in this app previously caught a render-time error anywhere —
// one thrown exception (like the missing-title crash that used to happen
// entering the tour wizard's property step) unmounted the entire React
// tree with no fallback, which is what a "black screen, stuck, no way
// forward" report actually was. This is the one boundary for the whole
// app: whatever breaks inside, the person always gets a real "something
// broke" screen with a reload button instead of a silent blank page.
class FloraErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { crashed: false, error: null, info: null, showDetails: false }; }
  static getDerivedStateFromError(error) { return { crashed: true, error }; }
  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("Flora crashed:", error, info?.componentStack);
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    const message = this.state.error?.message || String(this.state.error || "");
    const stack = this.state.info?.componentStack || this.state.error?.stack || "";
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#0A0E1A", color: "#F0F2F8",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 14, padding: 24, fontFamily: "'Vazirmatn', sans-serif", textAlign: "center", direction: "rtl",
      }}>
        <p style={{ fontSize: 15, fontWeight: 700 }}>یه چیزی خراب شد</p>
        <p style={{ fontSize: 12, color: "#8B92A8", maxWidth: 280, lineHeight: 1.9 }}>
          داده‌های تو سالم مونده — فقط این صفحه به مشکل خورد. با دکمه‌ی پایین دوباره باز کن.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "11px 26px", borderRadius: 999, background: "linear-gradient(135deg,#2f7cf6,#7c6ff5)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none" }}
        >
          تلاش دوباره
        </button>
        {/* Previously this only went to the browser console, which is
            useless on a phone with no way to open dev tools. Surfacing the
            actual error text here is what turns a report of "it broke"
            into something we can actually locate in the code. */}
        {message && (
          <button
            onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
            style={{ marginTop: 6, background: "none", border: "none", color: "#5B9DFF", fontSize: 11, fontWeight: 700 }}
          >
            {this.state.showDetails ? "پنهان کردن جزئیات" : "نمایش جزئیات فنی"}
          </button>
        )}
        {this.state.showDetails && (
          <div style={{
            maxWidth: 340, maxHeight: 220, overflowY: "auto", textAlign: "left", direction: "ltr",
            background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, fontSize: 10.5,
            color: "#C8CEDD", lineHeight: 1.6, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {message}
            {stack ? `\n\n${stack}` : ""}
          </div>
        )}
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FloraErrorBoundary>
      <App />
    </FloraErrorBoundary>
  </React.StrictMode>
);

// The splash is now a still logo + CSS entrance/glow, not a video — nothing
// to wait on an "ended" event for. It stays up for a minimum presentation
// time (so the entrance animation always gets to finish, even on a fast
// load) and is removed once BOTH that minimum has passed AND the app has
// dispatched "flora:ready" (fired once `loaded` becomes true) — whichever
// finishes last. The 12s ceiling still guarantees the splash can never
// outlive a stalled load.
const MIN_SPLASH_MS = 1400;
const splash = document.getElementById("flora-splash");

if (splash) {
  // A public share link (?share=...) bypasses the whole session/data boot
  // sequence entirely — see FloraCRM's early return — so "flora:ready"
  // never fires for it. That view has its own inline loading spinner, so
  // the branded splash just needs to clear quickly, not wait on a signal
  // that view was never going to send.
  const isShareRoute = new URLSearchParams(window.location.search).has("share") || new URLSearchParams(window.location.search).has("legal");
  let minTimeDone = false, appReady = isShareRoute;
  const hideSplash = () => {
    splash.style.transition = "opacity 250ms ease";
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 260);
  };
  const tryHide = () => { if (minTimeDone && appReady) hideSplash(); };

  setTimeout(() => { minTimeDone = true; tryHide(); }, MIN_SPLASH_MS);
  window.addEventListener("flora:ready", () => { appReady = true; tryHide(); }, { once: true });
  setTimeout(() => { appReady = true; tryHide(); }, 12000);
}
