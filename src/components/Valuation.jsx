import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, MapPin, AlertTriangle } from "lucide-react";
import { SP, RAD, FS, FW, glass, glassLite } from "../lib/theme.js";
import { BodyPortal, EmptyLine, Field, inputStyle } from "../lib/ui.jsx";
import { toNum, uid, fmtToman } from "../lib/format.js";
import { TYPE_FILTERS, fmtBudgetShort } from "../lib/constants.js";
import { computeFormulaValuation, buildFormulaExplanation } from "../lib/valuation.js";
import { SAREIN_CENTER, LIGHT_TILE_URL, loadLeaflet, reverseGeocodeAddress } from "../lib/geo.js";

// Flora Valuation — every number here traces back to either a real
// comparable in the local database or something the advisor typed in
// themselves for this exact street. Nothing is ever the model's own guess
// at a market price (see lib/valuation.js — that rule lives at the pure-
// function level, this component just presents whatever it returns).
// One component handles both entry points: with a propertyId (from an
// existing saved file) or without one (the quick, map-first phone-call
// flow) — both paths feed the exact same computeFormulaValuation pipeline.
function FloraValuationSheet({ ctx, propertyId, onClose }) {
  const { c, properties, setProperties, streetPrices, setStreetPrices, notify, setDetail, setSheet, setPrefillNew } = ctx;
  const savedProperty = propertyId ? properties.find((p) => p.id === propertyId) : null;
  const isQuickMode = !propertyId;

  // Quick-mode-only state: nothing here is used once a saved property exists.
  const mapRef = useRef(null); const mapObjRef = useRef(null); const markerRef = useRef(null);
  const [location, setLocation] = useState(null); // { lat, lng, address }
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [area, setArea] = useState("");
  const [type, setType] = useState("آپارتمان");
  const [yearBuilt, setYearBuilt] = useState("");
  const [locationQuality, setLocationQuality] = useState("");
  const [viewCategory, setViewCategory] = useState("");
  const [floorCategory, setFloorCategory] = useState("");
  const [buildingQuality, setBuildingQuality] = useState("");
  const [furnishLevel, setFurnishLevel] = useState("");
  const [hasCalculated, setHasCalculated] = useState(!isQuickMode); // a saved property already has everything it needs

  // Shared, works in both modes: street is useful for a quick-mode subject
  // too (it's how manual comparable prices get looked up), not just a
  // saved property's own field.
  const [streetInput, setStreetInput] = useState(savedProperty?.street || "");
  const [quickStreet, setQuickStreet] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualArea, setManualArea] = useState("");

  const resolveAddress = async (lat, lng) => {
    setLoadingAddr(true);
    const address = await reverseGeocodeAddress(lat, lng);
    setLocation({ lat, lng, address });
    setLoadingAddr(false);
  };

  // The map lives directly on this screen instead of behind a second tap
  // into a separate overlay — no transform animation on this screen means
  // Leaflet measures its real, final position from the start (see the
  // z-index/timing bugs this sidesteps, both fixed earlier this project).
  useEffect(() => {
    if (!isQuickMode) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapObjRef.current) return;
      const start = SAREIN_CENTER;
      const map = L.map(mapRef.current, { attributionControl: false }).setView(start, 14);
      L.tileLayer(LIGHT_TILE_URL, { subdomains: "abcd", attribution: "", detectRetina: true, maxZoom: 20, maxNativeZoom: 20 }).addTo(map);
      const marker = L.marker(start, { draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => { const p = marker.getLatLng(); resolveAddress(p.lat, p.lng); });
      map.on("click", (e) => { marker.setLatLng(e.latlng); resolveAddress(e.latlng.lat, e.latlng.lng); });
      mapObjRef.current = map;
      resolveAddress(start[0], start[1]);
    });
    return () => { cancelled = true; if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; } };
  }, []); // eslint-disable-line

  // The one subject object every calculation below reads from — a saved
  // property as-is, or a fresh one built from the quick-mode inputs.
  const subject = useMemo(() => {
    if (savedProperty) return savedProperty;
    if (!location || !toNum(area)) return null;
    return {
      id: "quick-temp", type, area: toNum(area), lat: location.lat, lng: location.lng, street: quickStreet || null,
      yearBuilt: yearBuilt ? toNum(yearBuilt) : null, locationQuality, viewCategory, floorCategory, buildingQuality, furnishLevel,
    };
  }, [savedProperty, location, area, type, quickStreet, yearBuilt, locationQuality, viewCategory, floorCategory, buildingQuality, furnishLevel]);

  const result = useMemo(() => {
    if (!hasCalculated || !subject) return null;
    return computeFormulaValuation(subject, properties, streetPrices);
  }, [hasCalculated, subject, properties, streetPrices]);

  const calculate = () => {
    if (!location) { notify("اول موقعیت رو روی نقشه انتخاب کن"); return; }
    if (!toNum(area)) { notify("متراژ رو وارد کن"); return; }
    setHasCalculated(true);
  };

  const saveStreet = () => {
    if (!streetInput.trim() || !savedProperty) return;
    setProperties((prev) => prev.map((p) => p.id === propertyId ? { ...p, street: streetInput.trim() } : p));
  };

  const addManualPrice = () => {
    const amt = toNum(manualAmount);
    if (!amt) { notify("مبلغ رو وارد کن"); return; }
    const street = savedProperty?.street || quickStreet;
    if (!street) { notify("اول خیابان رو مشخص کن"); return; }
    // Accept either a direct price-per-meter, or a total price + area to
    // derive it — whichever the advisor actually has in mind for that unit.
    const pricePerMeter = manualArea ? Math.round(amt / toNum(manualArea)) : amt;
    setStreetPrices((prev) => [...prev, { id: uid(), street, pricePerMeter, enteredAt: new Date().toISOString() }]);
    notify("قیمت ثبت شد");
    setManualAmount(""); setManualArea("");
  };

  const saveAsFile = () => {
    setPrefillNew({
      area: toNum(area), type, address: location.address, lat: location.lat, lng: location.lng,
      pricePerMeter: result?.ok ? result.pricePerMeter : "", yearBuilt: yearBuilt ? toNum(yearBuilt) : undefined,
      locationQuality: locationQuality || undefined, viewCategory: viewCategory || undefined,
      floorCategory: floorCategory || undefined, buildingQuality: buildingQuality || undefined, furnishLevel: furnishLevel || undefined,
    });
    onClose();
    setSheet("property");
  };

  const REFINE_FIELDS = [
    { key: "locationQuality", value: locationQuality, set: setLocationQuality, label: "موقعیت", options: ["ضعیف", "معمولی", "خوب", "ممتاز"] },
    { key: "viewCategory", value: viewCategory, set: setViewCategory, label: "ویو / جهت", options: ["بدون ویو", "حیاط معمولی", "کوچه معمولی", "خیابان خوب", "ویوی باز", "ویوی ممتاز"] },
    { key: "floorCategory", value: floorCategory, set: setFloorCategory, label: "طبقه", options: ["همکف نامطلوب", "طبقه میانی", "طبقه بالا با ویو", "طبقه آخر"] },
    { key: "buildingQuality", value: buildingQuality, set: setBuildingQuality, label: "کیفیت ساختمان", options: ["ضعیف", "معمولی", "خوب", "خیلی خوب", "لوکس"] },
    { key: "furnishLevel", value: furnishLevel, set: setFurnishLevel, label: "فرنیش", options: ["خالی", "نیمه‌فرنیش", "فول‌فرنیش معمولی", "فول‌فرنیش خوب", "فول‌فرنیش لوکس"] },
  ];

  if (!isQuickMode && !savedProperty) return null;
  const currentStreet = savedProperty?.street || quickStreet;

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: c.bg }}>
        <div className="flex items-center shrink-0" style={{ gap: SP.md, padding: SP.lg, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}>
          <button onClick={onClose} className="press w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.surface2 }}><X size={16} color={c.ink} /></button>
          <div>
            <p style={{ fontSize: FS.subtitle, fontWeight: FW.heavy }}>Flora Valuation</p>
            <p style={{ fontSize: FS.caption, color: c.muted }}>{savedProperty ? `برآورد ارزش بازار — ${savedProperty.title}` : "قیمت‌گذاری سریع — برای وقتی مالک پای تلفنه"}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {isQuickMode && !hasCalculated && (
            <div className="rounded-2xl mb-4 overflow-hidden" style={glass(c)}>
              <div ref={mapRef} style={{ width: "100%", height: 240, background: c.surface2 }} />
              <div style={{ padding: SP.lg }}>
                <div className="flex items-center gap-1.5 mb-4">
                  <MapPin size={13} color={c.primary} />
                  <p style={{ fontSize: 12.5, fontWeight: 700 }}>{loadingAddr ? "در حال یافتن آدرس…" : (location?.address || "روی نقشه لمس کن یا نشانگر را جابه‌جا کن")}</p>
                </div>

                <p style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>متراژ</p>
                <input value={area} onChange={(e) => setArea(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" style={{ ...inputStyle(c), marginBottom: SP.md, fontSize: 18, fontWeight: 700 }} placeholder="مثلاً 120" dir="ltr" />

                <div className="flex gap-2 mb-4">
                  {TYPE_FILTERS.filter((t) => t !== "همه").map((t) => (
                    <button key={t} onClick={() => setType(t)} className="press flex-1 rounded-lg" style={{ paddingBlock: 9, background: type === t ? c.primary : c.surface2, color: type === t ? "#fff" : c.muted, fontSize: 11.5, fontWeight: 700 }}>{t}</button>
                  ))}
                </div>

                <button onClick={calculate} className="press w-full rounded-xl" style={{ paddingBlock: 14, background: c.gradientPrimary, color: "#fff", fontWeight: 800, fontSize: 14 }}>محاسبه</button>
              </div>
            </div>
          )}

          {/* Street: the single biggest accuracy factor, and how manual
              comparable prices get looked up — asked inline in either
              mode, never a separate trip to an edit form. */}
          {hasCalculated && !currentStreet && (
            <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>خیابان این ملک کجاست؟ (اختیاری، برای دقت بیشتر)</p>
              <div className="flex gap-2">
                <input value={savedProperty ? streetInput : quickStreet} onChange={(e) => savedProperty ? setStreetInput(e.target.value) : setQuickStreet(e.target.value)} style={{ ...inputStyle(c), flex: 1 }} placeholder="مثلاً خیابان امام" />
                {savedProperty && <button onClick={saveStreet} disabled={!streetInput.trim()} className="press shrink-0 rounded-xl px-4" style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 12.5, opacity: streetInput.trim() ? 1 : 0.5 }}>ثبت</button>}
              </div>
            </div>
          )}

          {hasCalculated && result && !result.ok && currentStreet && result.needsManualPrice && (
            <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={14} color={c.attn} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12.5, lineHeight: 1.9 }}>{result.count > 0 ? `فقط ${result.count} فایل مشابه توی «${currentStreet}» داریم — حداقل ۳ تا لازمه. برای دقت بیشتر، قیمت واحدهایی که خودت از این خیابون می‌دونی وارد کن.` : `برای «${currentStreet}» فایل مشابهی نداریم. قیمت واحدهایی که خودت از این خیابون می‌دونی وارد کن تا برآورد بدیم.`}</p>
              </div>
              {streetPrices.filter((s) => s.street === currentStreet).length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  {streetPrices.filter((s) => s.street === currentStreet).map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: c.surface2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtToman(sp.pricePerMeter)} / متر</span>
                      <span style={{ fontSize: 10, color: c.muted }}>وارد‌شده توسط تو</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <input value={manualAmount} onChange={(e) => setManualAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" style={{ ...inputStyle(c), flex: 1 }} placeholder="قیمت هر متر یا کل" dir="ltr" />
                <input value={manualArea} onChange={(e) => setManualArea(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" style={{ ...inputStyle(c), width: 90 }} placeholder="متراژ (اختیاری)" dir="ltr" />
              </div>
              <p style={{ fontSize: 10, color: c.muted, marginBottom: SP.md }}>اگه متراژ رو هم بدی، مبلغ رو به قیمت‌هرمتر تبدیل می‌کنیم؛ وگرنه مبلغ رو مستقیم قیمت‌هرمتر در نظر می‌گیریم.</p>
              <button onClick={addManualPrice} className="press w-full rounded-xl" style={{ paddingBlock: 10, background: c.primary, color: "#fff", fontWeight: 700, fontSize: 12.5 }}>افزودن قیمت</button>
            </div>
          )}

          {hasCalculated && result && !result.ok && !result.needsManualPrice && (
            <>
              <EmptyLine c={c} text={result.reason} />
              {isQuickMode && <button onClick={() => setHasCalculated(false)} className="press w-full rounded-xl mt-4" style={{ paddingBlock: 12, background: c.surface2, fontWeight: 700, fontSize: 13 }}>تغییر ورودی</button>}
            </>
          )}

          {result?.ok && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl p-3 text-center" style={glassLite(c)}><p style={{ fontSize: 10, color: c.muted, marginBottom: 3 }}>فروش سریع</p><p style={{ fontSize: 14, fontWeight: 800, color: c.success }}>{fmtBudgetShort(result.quickSale)}</p></div>
                <div className="rounded-xl p-3 text-center" style={{ ...glassLite(c), border: `1.5px solid ${c.primary}55` }}><p style={{ fontSize: 10, color: c.muted, marginBottom: 3 }}>منصفانه</p><p style={{ fontSize: 14, fontWeight: 800, color: c.primary }}>{fmtBudgetShort(result.fairPrice)}</p></div>
                <div className="rounded-xl p-3 text-center" style={glassLite(c)}><p style={{ fontSize: 10, color: c.muted, marginBottom: 3 }}>پیشنهاد فروش</p><p style={{ fontSize: 14, fontWeight: 800, color: c.attn }}>{fmtBudgetShort(result.askingPrice)}</p></div>
              </div>
              <p style={{ fontSize: 12, color: c.muted, textAlign: "center", marginBottom: SP.sm }}>{fmtToman(result.pricePerMeter)} / متر</p>
              {(() => {
                const explanation = buildFormulaExplanation(result);
                return explanation ? <p style={{ fontSize: 11.5, color: c.muted, textAlign: "center", marginBottom: SP.lg, lineHeight: 1.8 }}>{explanation}</p> : null;
              })()}

              {isQuickMode && (
                <>
                  {/* Optional, offered only after a result already exists —
                      never blocks getting a number. Any change here
                      recomputes live, since subject/result are both derived
                      state. */}
                  <div className="rounded-2xl p-4 mb-4" style={glass(c)}>
                    <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>دقت بیشتر؟ (اختیاری)</p>
                    <input value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" style={{ ...inputStyle(c), marginBottom: SP.md }} placeholder="سال ساخت (شمسی)" dir="ltr" />
                    <div className="flex flex-col gap-3">
                      {REFINE_FIELDS.map(({ key, value, set, label, options }) => (
                        <div key={key}>
                          <p style={{ fontSize: 10.5, color: c.muted, marginBottom: 5 }}>{label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {options.map((v) => (
                              <button key={v} onClick={() => set(value === v ? "" : v)} className="press rounded-lg" style={{ paddingInline: 9, paddingBlock: 7, background: value === v ? c.primary : c.surface2, color: value === v ? "#fff" : c.muted, fontSize: 10.5, fontWeight: 700 }}>{v}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setHasCalculated(false)} className="press flex-1 rounded-xl" style={{ paddingBlock: 13, background: c.surface2, fontWeight: 700, fontSize: 13 }}>محاسبه‌ی دیگر</button>
                    <button onClick={saveAsFile} className="press flex-1 rounded-xl" style={{ paddingBlock: 13, background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13 }}>ذخیره به‌عنوان فایل</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

export { FloraValuationSheet };
