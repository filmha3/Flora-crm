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
  constructor(props) { super(props); this.state = { crashed: false }; }
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Flora crashed:", error, info?.componentStack);
  }
  render() {
    if (!this.state.crashed) return this.props.children;
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
  let minTimeDone = false, appReady = false;
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
