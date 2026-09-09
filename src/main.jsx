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

// The splash video IS the loading screen now — no separate 0–100 progress
// UI layered on top of it. It plays once while the real app (session →
// local data → cloud sync → settings) loads underneath in parallel. The
// splash is removed only once BOTH sides are done — the video has reached
// its natural end AND App.jsx has dispatched "flora:ready" (fired once
// `loaded` becomes true) — whichever finishes last, so a fast load never
// cuts the reveal short and a slow one never sits on a frozen last frame
// for long. Each side also has its own hard cap so a blocked autoplay or a
// missing ready event can never hold the splash up forever.
const splash = document.getElementById("flora-splash");
const video = document.getElementById("flora-splash-video");

if (splash) {
  let videoDone = false, appReady = false;
  const hideSplash = () => {
    splash.style.transition = "opacity 250ms ease";
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 260);
  };
  const tryHide = () => { if (videoDone && appReady) hideSplash(); };

  if (video) {
    video.addEventListener("ended", () => { videoDone = true; tryHide(); });
    video.addEventListener("error", () => { videoDone = true; tryHide(); });
    setTimeout(() => { videoDone = true; tryHide(); }, 8000);
  } else {
    videoDone = true;
  }

  window.addEventListener("flora:ready", () => { appReady = true; tryHide(); }, { once: true });
  setTimeout(() => { appReady = true; tryHide(); }, 12000);
}
