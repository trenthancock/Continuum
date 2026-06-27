import { useState, useRef, useEffect } from "react";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════════
   RESEARCH AND DEVELOPMENTS  ·  by Camelot Homes  ·  rnd.build
   PARAGON — public landing page + 3D home configurator (ONE FLOW)

   PURPOSE: pre-release DEMAND PILOT. Route real prospects through the
   configurator, measure engagement → this is the evidence for the
   up-tier thesis, not a toy.

   HANDOFF NOTES FOR DEVELOPER
   ───────────────────────────
   • This is a polished front-end prototype. Three integrations are
     STUBBED and marked with  // ⟶ PRODUCTION  comments:
        1. Salesforce — lead + saved configuration write (search "SALESFORCE")
        2. Analytics  — every track() call is an instrumentation event
                        (search "track(" ) ; wire to your analytics + SF campaign
        3. Geometry   — the 3D home is PARAMETRIC massing, not the real
                        Model 1 mesh. Production swaps real geometry into
                        <HomeViewer/> at the marked slot (search "GEOMETRY SLOT").
                        Parametric is intentional: editable, light, no giant
                        baked blob. The config→material/visibility wiring is
                        already done, so dropping in the real GLTF is small.
   • Single persistent WebGL canvas (mounts once) — no context leak.
   • No browser storage used. All state in React.
══════════════════════════════════════════════════════════════════ */

/* ——— RAD brand ——— */
const C = {
  cream: "#F4EFE7", creamDeep: "#ECE4D6", paper: "#FBF8F2",
  ink: "#1E1E1E", inkSoft: "#3A352F", muted: "#7C7166", faint: "#A89C8C",
  oxblood: "#622222", oxbloodLite: "#8A3A36", line: "#E0D7C7", lineDk: "#CFC4B2",
};
const font = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};
const usd = (n) => "$" + n.toLocaleString("en-US");

/* ——— instrumentation stub — THIS is what makes Paragon a measurable pilot ——— */
let EVENT_COUNT = 0;
function track(event, payload = {}) {
  EVENT_COUNT += 1;
  // ⟶ PRODUCTION: forward to analytics + Salesforce campaign engagement
  console.log(`[RAD·pilot] ${event}`, payload);
}

/* ——— catalog (Paragon · Model 1) ——— */
const PLAN = { name: "Model 1", sf: 3066, beds: 4, baths: 3.5, base: 845000 };

const LOTS = [
  { id: 1, label: "01", sf: 8200, face: "N", premium: 0,     note: "Interior",            x: 18, y: 70 },
  { id: 2, label: "02", sf: 8600, face: "N", premium: 12000, note: "Wider frontage",      x: 32, y: 70 },
  { id: 3, label: "03", sf: 9400, face: "E", premium: 28000, note: "Corner · morning sun",x: 46, y: 70 },
  { id: 4, label: "04", sf: 8200, face: "E", premium: 6000,  note: "Interior",            x: 60, y: 70 },
  { id: 5, label: "05", sf: 11200,face: "S", premium: 45000, note: "Premium · mtn view",  x: 74, y: 70 },
  { id: 6, label: "06", sf: 8800, face: "S", premium: 18000, note: "Greenbelt",           x: 32, y: 40 },
  { id: 7, label: "07", sf: 8200, face: "W", premium: 4000,  note: "Interior",            x: 46, y: 40 },
  { id: 8, label: "08", sf: 10100,face: "W", premium: 34000, note: "Corner · sunset",     x: 60, y: 40 },
];

const FACADES = [
  { id: "desert", name: "Desert White",     wall: 0xEDE6D8, roof: 0x33302B, accent: 0x9C6A3C, sw: ["#EDE6D8","#33302B","#9C6A3C"], desc: "White plaster · charcoal roof · cedar", price: 0 },
  { id: "cedar",  name: "Cedar & Rust",     wall: 0xB98F63, roof: 0x9C4F24, accent: 0x6E4427, sw: ["#B98F63","#9C4F24","#6E4427"], desc: "Vertical cedar · rust standing seam",    price: 22000 },
  { id: "char",   name: "Charcoal Modern",  wall: 0x2E2A26, roof: 0x18150F, accent: 0x7C7166, sw: ["#2E2A26","#18150F","#7C7166"], desc: "Dark plaster · matte black · stone",   price: 16000 },
  { id: "corten", name: "Plaster + Corten", wall: 0xCFC2A6, roof: 0x7A3B22, accent: 0x8A4520, sw: ["#CFC2A6","#7A3B22","#8A4520"], desc: "Warm plaster · corten accents",         price: 28000 },
];

const FINISHES = [
  { id: "essential", name: "Essential", sw: ["#D8CDBB","#9C8E78","#5C5346"], desc: "Quartz · matte oak · satin nickel", price: 0 },
  { id: "signature", name: "Signature", sw: ["#EDE6D8","#7A4A2E","#2A2622"], desc: "Waterfall island · wide oak · matte black", price: 42000 },
  { id: "atelier",   name: "Atelier",   sw: ["#26201D","#622222","#B89A6A"], desc: "Oxblood accent · brushed inox · stone slab", price: 78000 },
];

const ADDONS = [
  { id: "casita", name: "Detached casita",      desc: "400 SF · 1 bd / 1 ba",            price: 96000 },
  { id: "solar",  name: "Solar + Powerwall",    desc: "Off-grid ready · Continuum-monitored", price: 38000 },
  { id: "great",  name: "Great-room extension", desc: "+6 ft · vaulted glass",            price: 31000 },
  { id: "pool",   name: "Pool + spa",           desc: "Plunge pool · travertine deck",    price: 84000 },
];

/* ════════════════ 3D — parametric Model-1 massing (GEOMETRY SLOT) ════════════════ */
function HomeViewer({ facade, addons, height = 460 }) {
  const wrap = useRef(null);
  const live = useRef({ facade, addons });
  live.current = { facade, addons };

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const W = el.clientWidth, H = height;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    // soft desert studio light
    scene.add(new THREE.HemisphereLight(0xfbf3e6, 0xb89a78, 0.95));
    const key = new THREE.DirectionalLight(0xffe9c9, 1.15);
    key.position.set(14, 20, 10); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.25);
    fill.position.set(-12, 8, -10); scene.add(fill);

    // ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(60, 64),
      new THREE.MeshStandardMaterial({ color: 0xE9DFCB, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);

    // ── materials (recolored on facade change) ──
    const matWall   = new THREE.MeshStandardMaterial({ color: 0xEDE6D8, roughness: 0.85 });
    const matRoof   = new THREE.MeshStandardMaterial({ color: 0x33302B, roughness: 0.7 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0x9C6A3C, roughness: 0.6 });
    const matGlass  = new THREE.MeshStandardMaterial({ color: 0x2A3640, roughness: 0.08, metalness: 0.2, emissive: 0xE8C892, emissiveIntensity: 0.32 });

    const home = new THREE.Group(); scene.add(home);
    const box = (w, h, d, mat, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); home.add(m); return m;
    };
    const roofSlab = (w, d, x, z, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), matRoof);
      m.position.set(x, y, z); home.add(m); return m;
    };

    /* ── GEOMETRY SLOT ─────────────────────────────────────────────
       Parametric massing reads as Model 1. Production: replace this
       block with the real mesh; keep matWall/matRoof/matAccent + the
       addon group so the config wiring below still applies. ────────── */
    // main mass
    box(9, 3.2, 6.4, matWall, 0, 1.6, 0);
    roofSlab(9.6, 7.0, 0, 0, 3.32);
    // low front wing
    box(5, 2.6, 5, matWall, -5.8, 1.3, 1.2);
    roofSlab(5.5, 5.4, -5.8, 1.2, 2.72);
    // garage
    box(4.2, 2.8, 5, matWall, 6.0, 1.4, 0.6);
    roofSlab(4.6, 5.3, 6.0, 0.6, 2.92);
    // entry recess + wood accent slat panel
    box(2.4, 2.5, 0.3, matAccent, -2.2, 1.25, 3.35);
    box(0.3, 3.0, 4.0, matAccent, -4.55, 1.5, 0.6);
    // glazing
    box(5.2, 1.9, 0.18, matGlass, 0.4, 1.55, 3.31);   // front main
    box(0.18, 1.7, 3.6, matGlass, 4.52, 1.6, 0);      // side
    box(3.0, 1.6, 0.18, matGlass, -5.8, 1.35, 3.72);  // wing
    box(2.0, 1.4, 0.18, matGlass, 6.0, 1.35, 3.13);   // garage door (glassy)

    // ── add-on meshes (toggled by visibility) ──
    const addonMesh = {};
    // casita
    {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3.6), matWall); m.position.y = 1.2; g.add(m);
      const r = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 4.0), matRoof); r.position.y = 2.5; g.add(r);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.16), matGlass); gl.position.set(0, 1.2, 1.82); g.add(gl);
      g.position.set(-8.5, 0, -4.5); home.add(g); addonMesh.casita = g;
    }
    // solar array on main roof
    {
      const g = new THREE.Group();
      const pm = new THREE.MeshStandardMaterial({ color: 0x14171C, roughness: 0.35, metalness: 0.3 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.6), pm);
        p.position.set(-2.7 + i * 2.7, 3.46, -1.4 + j * 1.9); g.add(p);
      }
      home.add(g); addonMesh.solar = g;
    }
    // great-room glass extension (rear)
    {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.9, 2.6), matGlass); m.position.set(0, 1.45, -4.5); g.add(m);
      const r = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.2, 3.0), matRoof); r.position.set(0, 3.0, -4.5); g.add(r);
      home.add(g); addonMesh.great = g;
    }
    // pool + deck
    {
      const g = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0xD9CBB0, roughness: 0.9 }));
      deck.position.set(1, 0.04, 9.5); g.add(deck);
      const water = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 3.2), new THREE.MeshStandardMaterial({ color: 0x4C7E8C, roughness: 0.05, metalness: 0.4, emissive: 0x123038, emissiveIntensity: 0.25 }));
      water.position.set(1, 0.1, 9.5); g.add(water);
      home.add(g); addonMesh.pool = g;
    }
    Object.values(addonMesh).forEach((m) => (m.visible = false));

    el._mats = { matWall, matRoof, matAccent };
    el._addonMesh = addonMesh;

    // ── orbit controls (persistent) ──
    const cur = { theta: 0.72, phi: 1.16, radius: 30, tgt: new THREE.Vector3(0, 1.8, 0) };
    const goal = { theta: 0.72, phi: 1.16, radius: 30 };
    let auto = true, dragging = false, px = 0, py = 0;
    const ptrs = new Map(); let pinch = 0;
    const down = (e) => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2){ const a=[...ptrs.values()]; pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]); } auto = false; dragging = true; px = e.clientX; py = e.clientY; };
    const move = (e) => {
      if (!dragging) return;
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2){ const a=[...ptrs.values()]; const d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]); if(pinch>0) goal.radius=Math.min(46,Math.max(14,goal.radius*pinch/d)); pinch=d; return; }
      goal.theta -= (e.clientX - px) * 0.005;
      goal.phi = Math.min(1.42, Math.max(0.7, goal.phi - (e.clientY - py) * 0.004));
      px = e.clientX; py = e.clientY;
    };
    const up = (e) => { ptrs.delete(e.pointerId); pinch = 0; dragging = false; };
    renderer.domElement.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    const wheel = (e) => { e.preventDefault(); auto = false; goal.radius = Math.min(46, Math.max(14, goal.radius * (1 + e.deltaY * 0.0012))); };
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (auto) goal.theta -= 0.0022;
      cur.theta += (goal.theta - cur.theta) * 0.06;
      cur.phi += (goal.phi - cur.phi) * 0.06;
      cur.radius += (goal.radius - cur.radius) * 0.06;
      camera.position.set(
        cur.tgt.x + cur.radius * Math.sin(cur.phi) * Math.sin(cur.theta),
        cur.tgt.y + cur.radius * Math.cos(cur.phi),
        cur.tgt.z + cur.radius * Math.sin(cur.phi) * Math.cos(cur.theta)
      );
      camera.lookAt(cur.tgt);
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w = el.clientWidth; renderer.setSize(w, H);
      camera.aspect = w / H; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("wheel", wheel);
      renderer.dispose(); el.innerHTML = "";
    };
  }, []); // eslint-disable-line

  // recolor + toggle on config change
  useEffect(() => {
    const el = wrap.current; if (!el || !el._mats) return;
    const f = FACADES.find((x) => x.id === facade) || FACADES[0];
    el._mats.matWall.color.setHex(f.wall);
    el._mats.matRoof.color.setHex(f.roof);
    el._mats.matAccent.color.setHex(f.accent);
  }, [facade]);
  useEffect(() => {
    const el = wrap.current; if (!el || !el._addonMesh) return;
    Object.entries(el._addonMesh).forEach(([k, m]) => (m.visible = addons.includes(k)));
  }, [addons]);

  return <div ref={wrap} style={{ width: "100%", height, cursor: "grab" }} />;
}

/* ════════════════ small UI atoms ════════════════ */
const Delta = ({ size = 26, color = C.oxblood }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block" }}>
    <path d="M16 4 L29 28 L3 28 Z" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M16 12 L23 26 L9 26 Z" fill={color} />
  </svg>
);
const Mark = ({ color = C.oxblood, ink = C.ink }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <span style={{ fontFamily: font.serif, fontSize: 22, letterSpacing: "0.04em", color: ink, fontWeight: 700 }}>R</span>
    <Delta size={20} color={color} />
    <span style={{ fontFamily: font.serif, fontSize: 22, letterSpacing: "0.04em", color: ink, fontWeight: 700 }}>D</span>
  </div>
);
const Eyebrow = ({ children, color = C.oxblood }) => (
  <div style={{ fontFamily: font.sans, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color }}>{children}</div>
);

/* ════════════════ LANDING ════════════════ */
function Landing({ onStart }) {
  return (
    <div style={{ background: C.cream, color: C.ink, fontFamily: font.sans }}>
      {/* nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "22px 40px", borderBottom: `1px solid ${C.line}`, maxWidth: 1180, margin: "0 auto" }}>
        <Mark />
        <div style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 13, letterSpacing: "0.04em", color: C.muted }}>
          <span>Paragon</span><span>The Homes</span><span>Continuum</span>
          <button onClick={onStart} style={{ fontFamily: font.sans, fontSize: 12.5, letterSpacing: "0.12em",
            textTransform: "uppercase", background: C.oxblood, color: C.cream, border: "none",
            padding: "10px 18px", borderRadius: 2, cursor: "pointer" }}>Start designing</button>
        </div>
      </div>

      {/* hero */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "84px 40px 64px" }}>
        <Eyebrow>Research and Developments · by Camelot Homes</Eyebrow>
        <h1 style={{ fontFamily: font.serif, fontSize: 62, lineHeight: 1.04, fontWeight: 400,
          letterSpacing: "-0.01em", margin: "22px 0 0", maxWidth: 760 }}>
          Build your home<br />before you break ground.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: C.inkSoft, maxWidth: 560, marginTop: 26 }}>
          Paragon — eight architect-designed homes in the heart of the valley. Choose your lot,
          shape every detail, and watch it come to life in real time. Your home's record begins
          the moment you start — and never ends.
        </p>
        <div style={{ display: "flex", gap: 14, marginTop: 34, alignItems: "center" }}>
          <button onClick={onStart} style={{ fontFamily: font.sans, fontSize: 13, letterSpacing: "0.14em",
            textTransform: "uppercase", background: C.oxblood, color: C.cream, border: "none",
            padding: "16px 30px", borderRadius: 2, cursor: "pointer" }}>Start designing your home</button>
          <span style={{ fontSize: 13, color: C.muted }}>Model 1 · {PLAN.sf.toLocaleString()} SF · from {usd(PLAN.base)}</span>
        </div>
      </div>

      {/* preview strip */}
      <div style={{ background: C.creamDeep, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", height: 420 }}>
          <HomeViewer facade="desert" addons={[]} height={420} />
        </div>
        <div style={{ textAlign: "center", paddingBottom: 18, marginTop: -8 }}>
          <span style={{ fontFamily: font.sans, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.faint }}>
            Model 1 — drag to explore · fully configurable inside
          </span>
        </div>
      </div>

      {/* how it works */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 40px" }}>
        <Eyebrow>How it works</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 34, marginTop: 30 }}>
          {[
            { n: "01", t: "Choose your lot", d: "Eight homesites at Paragon — each with its own orientation, frontage, and outlook." },
            { n: "02", t: "Shape every detail", d: "Exterior package, interior finishes, casita, pool, off-grid power — live, in 3D, with pricing as you go." },
            { n: "03", t: "Reserve your build", d: "Save your configuration and an advisor reaches out. Your home carries one record from here to resale." },
          ].map((s) => (
            <div key={s.n}>
              <div style={{ fontFamily: font.serif, fontSize: 30, color: C.oxblood }}>{s.n}</div>
              <div style={{ fontFamily: font.serif, fontSize: 21, marginTop: 10 }}>{s.t}</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, marginTop: 8 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* continuum quiet differentiator */}
      <div style={{ background: C.ink, color: C.cream }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 40px", display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 620 }}>
            <Eyebrow color={C.oxbloodLite}>Every Paragon home is a connected home</Eyebrow>
            <div style={{ fontFamily: font.serif, fontSize: 30, lineHeight: 1.25, marginTop: 16 }}>
              Camelot Continuum keeps your home's living record — quietly watching its systems,
              catching the small things early, for as long as you own it.
            </div>
          </div>
          <button onClick={onStart} style={{ fontFamily: font.sans, fontSize: 12.5, letterSpacing: "0.14em",
            textTransform: "uppercase", background: "transparent", color: C.cream,
            border: `1px solid ${C.faint}`, padding: "15px 26px", borderRadius: 2, cursor: "pointer" }}>
            Begin your home
          </button>
        </div>
      </div>

      {/* footer */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px", display: "flex",
        justifyContent: "space-between", alignItems: "center", color: C.faint, fontSize: 12.5 }}>
        <Mark />
        <span>rnd.build · Research and Developments by Camelot Homes</span>
      </div>
    </div>
  );
}

/* ════════════════ CONFIGURATOR ════════════════ */
const STEPS = ["Lot", "Exterior", "Interior", "Add-ons", "Reserve"];

function Configurator({ onBack }) {
  const [step, setStep] = useState(0);
  const [lot, setLot] = useState(null);
  const [facade, setFacade] = useState("desert");
  const [finish, setFinish] = useState("essential");
  const [addons, setAddons] = useState([]);
  const [continuum, setContinuum] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { track("configurator_opened"); }, []);

  const lotObj = LOTS.find((l) => l.id === lot);
  const facadeObj = FACADES.find((f) => f.id === facade);
  const finishObj = FINISHES.find((f) => f.id === finish);
  const addonTotal = addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price || 0), 0);
  const total = PLAN.base + (lotObj?.premium || 0) + facadeObj.price + finishObj.price + addonTotal;

  const pickLot = (id) => { setLot(id); track("lot_selected", { lot: id }); };
  const pickFacade = (id) => { setFacade(id); track("facade_selected", { facade: id }); };
  const pickFinish = (id) => { setFinish(id); track("finish_selected", { finish: id }); };
  const toggleAddon = (id) => {
    setAddons((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; track("addon_toggled", { addon: id, on: !p.includes(id) }); return n; });
  };
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const submit = () => {
    // ⟶ PRODUCTION · SALESFORCE: write Lead + saved configuration here
    track("lead_captured", {
      ...form, continuum,
      config: { lot, facade, finish, addons, total },
    });
    setSubmitted(true);
  };

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: font.sans, color: C.ink,
      display: "flex", flexDirection: "column" }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 28px", borderBottom: `1px solid ${C.line}`, background: C.cream }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer",
          color: C.muted, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>‹ Paragon</button>
        <Mark />
        <div style={{ fontSize: 12.5, letterSpacing: "0.04em", color: C.muted }}>Model 1 · {PLAN.beds} bd / {PLAN.baths} ba</div>
      </div>

      <div style={{ display: "flex", flex: 1, flexWrap: "wrap" }}>
        {/* viewer */}
        <div style={{ flex: "1 1 440px", minWidth: 320, background: C.creamDeep,
          display: "flex", flexDirection: "column", borderRight: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, position: "relative" }}>
            <HomeViewer facade={facade} addons={addons} height={Math.min(560, (typeof window !== "undefined" ? window.innerHeight : 700) - 200)} />
            <div style={{ position: "absolute", left: 18, bottom: 14, fontFamily: font.sans,
              fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.faint }}>
              {lotObj ? `Lot ${lotObj.label} · ${lotObj.face} facing` : "Select a lot"} · drag to orbit
            </div>
          </div>
        </div>

        {/* panel */}
        <div style={{ flex: "0 1 440px", minWidth: 320, display: "flex", flexDirection: "column" }}>
          {/* steps */}
          <div style={{ display: "flex", gap: 4, padding: "16px 24px 0" }}>
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)} style={{ flex: 1, background: "none", border: "none",
                cursor: "pointer", paddingBottom: 10, borderBottom: `2px solid ${i === step ? C.oxblood : C.line}`,
                color: i === step ? C.ink : C.faint, fontSize: 11.5, letterSpacing: "0.06em",
                fontWeight: i === step ? 700 : 400 }}>{s}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {step === 0 && (
              <Section title="Choose your homesite" sub="Eight lots at Paragon.">
                <div style={{ position: "relative", background: C.cream, border: `1px solid ${C.line}`,
                  borderRadius: 4, height: 150, marginBottom: 16 }}>
                  {LOTS.map((l) => (
                    <button key={l.id} onClick={() => pickLot(l.id)} title={`Lot ${l.label}`}
                      style={{ position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%,-50%)",
                        width: 26, height: 26, borderRadius: 4, cursor: "pointer",
                        border: `1.5px solid ${lot === l.id ? C.oxblood : C.lineDk}`,
                        background: lot === l.id ? C.oxblood : C.paper,
                        color: lot === l.id ? C.cream : C.muted, fontSize: 10, fontWeight: 700 }}>{l.label}</button>
                  ))}
                  <span style={{ position: "absolute", left: 8, bottom: 6, fontSize: 9.5, letterSpacing: "0.16em", color: C.faint, textTransform: "uppercase" }}>Site plan</span>
                </div>
                {LOTS.map((l) => (
                  <Row key={l.id} active={lot === l.id} onClick={() => pickLot(l.id)}
                    title={`Lot ${l.label}`} sub={`${l.sf.toLocaleString()} SF · ${l.note}`}
                    right={l.premium ? `+${usd(l.premium)}` : "Included"} />
                ))}
              </Section>
            )}

            {step === 1 && (
              <Section title="Exterior package" sub="Sets the material palette — updates live.">
                {FACADES.map((f) => (
                  <SwatchRow key={f.id} active={facade === f.id} onClick={() => pickFacade(f.id)}
                    sw={f.sw} title={f.name} sub={f.desc} right={f.price ? `+${usd(f.price)}` : "Included"} />
                ))}
              </Section>
            )}

            {step === 2 && (
              <Section title="Interior finishes" sub="Your level of finish throughout.">
                {FINISHES.map((f) => (
                  <SwatchRow key={f.id} active={finish === f.id} onClick={() => pickFinish(f.id)}
                    sw={f.sw} title={f.name} sub={f.desc} right={f.price ? `+${usd(f.price)}` : "Included"} />
                ))}
                <p style={{ fontSize: 12, color: C.faint, marginTop: 12, lineHeight: 1.5 }}>
                  Interior selections shown as packages; full interior visualization in your design appointment.
                </p>
              </Section>
            )}

            {step === 3 && (
              <Section title="Add-ons" sub="Optional — appears on the model as you select.">
                {ADDONS.map((a) => (
                  <Row key={a.id} active={addons.includes(a.id)} onClick={() => toggleAddon(a.id)}
                    title={a.name} sub={a.desc} right={`+${usd(a.price)}`} check={addons.includes(a.id)} />
                ))}
              </Section>
            )}

            {step === 4 && (
              <Section title="Your Paragon home" sub="Save it and an advisor will reach out.">
                <Summary lotObj={lotObj} facadeObj={facadeObj} finishObj={finishObj} addons={addons} />
                {/* Continuum opt-in — captured as a real selection at point of sale */}
                <div onClick={() => { setContinuum(!continuum); track("continuum_optin", { on: !continuum }); }}
                  style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px",
                    border: `1px solid ${continuum ? C.oxblood : C.line}`, borderRadius: 4, cursor: "pointer",
                    marginTop: 14, background: continuum ? "rgba(98,34,34,0.04)" : "transparent" }}>
                  <CheckBox on={continuum} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Include Camelot Continuum</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Your home's living record & system monitoring</div>
                  </div>
                </div>

                {!submitted ? (
                  <div style={{ marginTop: 16 }}>
                    {["name", "email", "phone"].map((k) => (
                      <input key={k} placeholder={k[0].toUpperCase() + k.slice(1)} value={form[k]}
                        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", marginBottom: 8,
                          border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: font.sans, fontSize: 14, background: C.cream }} />
                    ))}
                    <button onClick={submit} disabled={!form.name || !form.email}
                      style={{ width: "100%", padding: 15, background: (form.name && form.email) ? C.oxblood : C.lineDk,
                        color: C.cream, border: "none", borderRadius: 3, cursor: (form.name && form.email) ? "pointer" : "default",
                        fontFamily: font.sans, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
                      Save & request pricing
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 16, padding: 18, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 4 }}>
                    <Eyebrow>Saved</Eyebrow>
                    <div style={{ fontFamily: font.serif, fontSize: 19, marginTop: 8 }}>Your home is saved.</div>
                    <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 6 }}>
                      A Camelot advisor will reach out shortly. <span style={{ color: C.faint }}>
                      (In production this configuration writes to Salesforce.)</span>
                    </p>
                  </div>
                )}
              </Section>
            )}
          </div>

          {/* price bar */}
          <div style={{ borderTop: `1px solid ${C.line}`, padding: "16px 24px", background: C.cream }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11.5, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted }}>Estimated</span>
              <span style={{ fontFamily: font.serif, fontSize: 26, color: C.ink }}>{usd(total)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {step > 0 && <button onClick={prev} style={btn(false)}>Back</button>}
              {step < STEPS.length - 1 && (
                <button onClick={next} disabled={step === 0 && !lot} style={btn(true, step === 0 && !lot)}>
                  {step === 0 && !lot ? "Select a lot" : "Continue"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* instrumentation badge — proves this is a measured pilot */}
      <div style={{ background: C.ink, color: C.faint, fontFamily: font.sans, fontSize: 10.5,
        letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 28px", textAlign: "center" }}>
        Demand pilot · every interaction measured → Salesforce + analytics (see code)
      </div>
    </div>
  );
}

/* ——— configurator atoms ——— */
const btn = (primary, disabled) => ({
  flex: 1, padding: "13px", borderRadius: 3, cursor: disabled ? "default" : "pointer",
  fontFamily: font.sans, fontSize: 12.5, letterSpacing: "0.1em", textTransform: "uppercase",
  border: primary ? "none" : `1px solid ${C.lineDk}`,
  background: primary ? (disabled ? C.lineDk : C.oxblood) : "transparent",
  color: primary ? C.cream : C.inkSoft,
});
const Section = ({ title, sub, children }) => (
  <div>
    <div style={{ fontFamily: font.serif, fontSize: 22 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 16 }}>{sub}</div>}
    {children}
  </div>
);
const Row = ({ active, onClick, title, sub, right, check }) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
    border: `1px solid ${active ? C.oxblood : C.line}`, borderRadius: 4, marginBottom: 8, cursor: "pointer",
    background: active ? "rgba(98,34,34,0.04)" : "transparent" }}>
    {check !== undefined && <CheckBox on={check} />}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
    </div>
    <div style={{ fontFamily: font.sans, fontSize: 12.5, color: active ? C.oxblood : C.muted, whiteSpace: "nowrap" }}>{right}</div>
  </div>
);
const SwatchRow = ({ active, onClick, sw, title, sub, right }) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    border: `1px solid ${active ? C.oxblood : C.line}`, borderRadius: 4, marginBottom: 8, cursor: "pointer",
    background: active ? "rgba(98,34,34,0.04)" : "transparent" }}>
    <div style={{ display: "flex", borderRadius: 3, overflow: "hidden", border: `1px solid ${C.line}` }}>
      {sw.map((c, i) => <div key={i} style={{ width: 16, height: 32, background: c }} />)}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
    </div>
    <div style={{ fontSize: 12.5, color: active ? C.oxblood : C.muted, whiteSpace: "nowrap" }}>{right}</div>
  </div>
);
const CheckBox = ({ on }) => (
  <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
    border: `1.5px solid ${on ? C.oxblood : C.lineDk}`, background: on ? C.oxblood : "transparent", color: C.cream }}>
    {on ? "✓" : ""}
  </div>
);
const Summary = ({ lotObj, facadeObj, finishObj, addons }) => {
  const rows = [
    [`${PLAN.name} base`, usd(PLAN.base)],
    [lotObj ? `Lot ${lotObj.label}` : "Lot — none", lotObj?.premium ? `+${usd(lotObj.premium)}` : "Incl."],
    [`Exterior · ${facadeObj.name}`, facadeObj.price ? `+${usd(facadeObj.price)}` : "Incl."],
    [`Interior · ${finishObj.name}`, finishObj.price ? `+${usd(finishObj.price)}` : "Incl."],
    ...addons.map((id) => { const a = ADDONS.find((x) => x.id === id); return [a.name, `+${usd(a.price)}`]; }),
  ];
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 4, padding: "4px 14px" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0",
          borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ color: C.inkSoft }}>{r[0]}</span>
          <span style={{ fontFamily: font.sans, color: C.muted }}>{r[1]}</span>
        </div>
      ))}
    </div>
  );
};

/* ════════════════ APP ════════════════ */
export default function App() {
  const [view, setView] = useState("landing");
  return (
    <div>
      <style>{`* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-thumb { background: ${C.lineDk}; border-radius: 4px; }
        button:focus-visible { outline: 2px solid ${C.oxblood}; outline-offset: 2px; }
        input:focus { outline: none; border-color: ${C.oxblood} !important; }`}</style>
      {view === "landing"
        ? <Landing onStart={() => { track("cta_start_configurator"); setView("configurator"); }} />
        : <Configurator onBack={() => setView("landing")} />}
    </div>
  );
}
