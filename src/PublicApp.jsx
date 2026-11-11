// Lightweight entry for the public site (/, /properties, /about, /contact).
// Loaded instead of the whole CRM bundle (App.jsx) so visitors and Google
// only download what the public pages actually need.
import React, { useState, useEffect } from "react";
import { PublicHomeView, PublicPropertiesListView, PublicPropertyDetailView, PublicAboutView, PublicContactView } from "./components/PublicSite.jsx";

export const isPublicPath = (p) => ["/", "/properties", "/about", "/contact"].includes(p) || p.startsWith("/properties/");

export default function PublicApp() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to) => {
    const p = to.split("?")[0];
    if (!isPublicPath(p)) { window.location.href = to; return; }
    window.history.pushState({}, "", to);
    setPath(p);
    window.scrollTo(0, 0);
  };
  if (path === "/properties") return <PublicPropertiesListView key={window.location.search} navigate={navigate} />;
  if (path.startsWith("/properties/")) return <PublicPropertyDetailView slug={decodeURIComponent(path.slice("/properties/".length))} navigate={navigate} />;
  if (path === "/about") return <PublicAboutView navigate={navigate} />;
  if (path === "/contact") return <PublicContactView navigate={navigate} />;
  return <PublicHomeView navigate={navigate} />;
}
