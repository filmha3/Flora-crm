import { useState, useEffect } from "react";
import { fmtToman, faDigits } from "./format.js";

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function CountUpToman({ value, className, style }) {
  const v = useCountUp(value);
  return <span className={className} style={style}>{fmtToman(v)}</span>;
}

// Same animated count, but "تومان" renders small and light gray, separate from
// the number — and the whole thing is pinned to one line so it never wraps.
function CountUpTomanSplit({ value, size = 18, weight = 800, color = "#fff", tomanColor = "rgba(255,255,255,.45)", tomanSize }) {
  const v = useCountUp(value);
  const ts = tomanSize || Math.max(9, Math.round(size * 0.42));
  return (
    <span style={{ whiteSpace: "nowrap", direction: "ltr", display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: size, fontWeight: weight, color, fontVariantNumeric: "tabular-nums" }}>{Math.round(v).toLocaleString("en-US")}</span>
      <span style={{ fontSize: ts, fontWeight: 500, color: tomanColor }}>تومان</span>
    </span>
  );
}

function CountUpNum({ value, style }) {
  const v = useCountUp(value, 700);
  return <span style={style}>{faDigits(v)}</span>;
}

export { useCountUp, CountUpToman, CountUpTomanSplit, CountUpNum };
