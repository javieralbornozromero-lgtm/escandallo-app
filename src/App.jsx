import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Wine, ChefHat, Users, Camera, TrendingUp, FileDown, BookOpen, Settings,
  Plus, Trash2, Pencil, Check, X, Upload, RotateCcw, Receipt, Loader2,
  AlertTriangle, ChevronRight, Info, Wallet, Package, Minus, Search
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts";
import * as XLSX from "xlsx";

/* ------------------------------------------------------------------ */
/*  TOKENS                                                             */
/* ------------------------------------------------------------------ */
// Paleta de fábrica. Sirve como valor de reserva y como base para "restaurar paleta".
const DEFAULT_PALETTE = {
  paper: "#F3E9D2",
  paperDark: "#EADFC4",
  ink: "#2A2420",
  inkSoft: "#6B5F4F",
  bottle: "#1F3A34",
  bottleLight: "#2E534B",
  copper: "#B8703E",
  copperLight: "#D08F5C",
  rust: "#A13D2B",
  sage: "#7C9082",
  line: "#D8C9A3",
  white: "#FFFBF2",
};

// Nombres en español para mostrar en el selector de paleta de Ajustes.
const PALETTE_LABELS = {
  paper: "Fondo",
  paperDark: "Fondo (tono oscuro)",
  ink: "Texto principal",
  inkSoft: "Texto secundario",
  bottle: "Cabecera / color principal",
  bottleLight: "Color principal (claro)",
  copper: "Acento",
  copperLight: "Acento (claro)",
  rust: "Alertas / avisos",
  sage: "Positivo / margen",
  line: "Líneas y bordes",
  white: "Tarjetas / superficies",
};

// Paletas predefinidas que el usuario puede aplicar con un clic.
const PALETTE_PRESETS = [
  { name: "Taberna clásica (por defecto)", colors: DEFAULT_PALETTE },
  {
    name: "Barra de noche",
    colors: {
      paper: "#1B1B1F", paperDark: "#141417", ink: "#F1ECDF", inkSoft: "#B9AF9B",
      bottle: "#111318", bottleLight: "#22262E", copper: "#E0A458", copperLight: "#F0C68A",
      rust: "#E0645A", sage: "#8FBF9F", line: "#33343A", white: "#242429",
    },
  },
  {
    name: "Terraza mediterránea",
    colors: {
      paper: "#FBF3E7", paperDark: "#F3E4CB", ink: "#25423F", inkSoft: "#5C7A73",
      bottle: "#1B5E63", bottleLight: "#2C7E82", copper: "#E0793E", copperLight: "#F0A868",
      rust: "#C24B3A", sage: "#4F9A7C", line: "#E3D3B2", white: "#FFFDF7",
    },
  },
  {
    name: "Vermú y granate",
    colors: {
      paper: "#F1E7DE", paperDark: "#E6D5C4", ink: "#2E1F1C", inkSoft: "#75605A",
      bottle: "#5C1F2A", bottleLight: "#7A3140", copper: "#C08A3E", copperLight: "#D9AC6C",
      rust: "#9C2B2B", sage: "#6E8F6A", line: "#DCC6B4", white: "#FBF6EF",
    },
  },
];

// T son los tokens que usa la interfaz: variables CSS con la paleta de fábrica como
// valor de reserva, para que la app se vea bien incluso antes de cargar la config guardada.
const T = Object.keys(DEFAULT_PALETTE).reduce((acc, key) => {
  acc[key] = `var(--c-${key}, ${DEFAULT_PALETTE[key]})`;
  return acc;
}, {});

const FONT_DISPLAY = "'Fraunces', serif";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_BODY = "'Inter', sans-serif";

/* ------------------------------------------------------------------ */
/*  DEFAULTS                                                           */
/* ------------------------------------------------------------------ */
const DEFAULT_CONFIG = {
  barName: "Mi Bar",
  percentages: { bebida: 18, cocteleria: 22, raciones: 30, platos: 32 },
  mermas: 4,
  colors: DEFAULT_PALETTE,
  notaPedido: "",
  ivaDefecto: 10,
  users: [],
  activeUserId: "",
  apiKey: "",
};

const DEFAULT_SUPPLIERS = [
  { id: "sup1", name: "Distribuciones Ruiz", contact: "Javier Ruiz", phone: "600 111 222", category: "Bebidas" },
  { id: "sup2", name: "Frutas Hernández", contact: "Marisol", phone: "600 333 444", category: "Fruta y verdura" },
];

// stockActual/stockMinimo/stockIntermedio/stockObjetivo controlan el semáforo de
// inventario: rojo si stockActual <= stockMinimo, naranja si <= stockIntermedio,
// verde en el resto de casos. stockObjetivo es "hasta cuánto pedir".
const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Ginebra Premium", category: "Bebidas", supplierId: "sup1", packQuantity: 700, unit: "ml", packPrice: 18, stockActual: 2100, stockMinimo: 1400, stockIntermedio: 2800, stockObjetivo: 4200 },
  { id: "p2", name: "Tónica", category: "Bebidas", supplierId: "sup1", packQuantity: 1000, unit: "ml", packPrice: 3.5, stockActual: 6000, stockMinimo: 4000, stockIntermedio: 8000, stockObjetivo: 12000 },
  { id: "p3", name: "Hielo", category: "Bebidas", supplierId: "sup1", packQuantity: 2000, unit: "g", packPrice: 1.5, stockActual: 4000, stockMinimo: 3000, stockIntermedio: 6000, stockObjetivo: 10000 },
  { id: "p4", name: "Limón", category: "Fruta y verdura", supplierId: "sup2", packQuantity: 1000, unit: "g", packPrice: 2, stockActual: 800, stockMinimo: 1000, stockIntermedio: 2000, stockObjetivo: 3000 },
];

const DEFAULT_RECIPES = [
  {
    id: "r1",
    name: "Gin Tonic",
    category: "cocteleria",
    pvp: 9.5,
    notes: "Copa balón, hielo abundante, rodaja de limón.",
    ingredients: [
      { productId: "p1", qty: 50 },
      { productId: "p2", qty: 200 },
      { productId: "p3", qty: 100 },
      { productId: "p4", qty: 10 },
    ],
  },
];

function demoSales() {
  const today = new Date();
  const out = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.25) {
      out.push({
        id: "s" + i,
        date: d.toISOString().slice(0, 10),
        recipeId: "r1",
        qty: Math.floor(Math.random() * 8) + 1,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const eur = (n) => (isFinite(n) ? n : 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const pct = (n) => `${(isFinite(n) ? n : 0).toFixed(1)}%`;

// En la versión standalone (fuera de claude.ai) hace falta la propia clave API de
// Anthropic y las cabeceras que exige la API para llamadas directas desde el navegador.
function anthropicHeaders(config) {
  return {
    "Content-Type": "application/json",
    "x-api-key": config?.apiKey || "",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

function unitCost(product) {
  if (!product || !product.packQuantity) return 0;
  return product.packPrice / product.packQuantity;
}

// El coste interno se guarda siempre por gramo/ml/unidad (para que los escandallos
// puedan sumar ingredientes con precisión), pero eso hace que el coste de productos
// comprados a granel (kg, litros) se vea como una cifra minúscula ("0,01 €"). Esta
// función lo muestra en la unidad "de la compra" que tiene sentido para un humano:
// €/kg si se guarda en g, €/L si se guarda en ml, €/ud si se guarda por unidades.
function unitCostDisplay(product) {
  const base = unitCost(product);
  if (product?.unit === "g") return `${eur(base * 1000)}/kg`;
  if (product?.unit === "ml") return `${eur(base * 1000)}/L`;
  return `${eur(base)}/ud`;
}

function recipeCost(recipe, products, mermasPct) {
  if (!recipe) return 0;
  const base = recipe.ingredients.reduce((sum, ing) => {
    const prod = products.find((p) => p.id === ing.productId);
    if (!prod) return sum;
    return sum + unitCost(prod) * (ing.qty || 0);
  }, 0);
  return base * (1 + (mermasPct || 0) / 100);
}

// Semáforo de inventario: rojo = pedir ya, naranja = se está agotando, verde = bien.
function stockEstado(p) {
  const actual = p.stockActual || 0;
  const minimo = p.stockMinimo || 0;
  const intermedio = p.stockIntermedio || 0;
  if (actual <= minimo) return "rojo";
  if (actual <= intermedio) return "naranja";
  return "verde";
}

// Ajusta el stock de los productos que forman parte de un escandallo cuando se
// registra (sign=-1) o se borra (sign=+1) una venta de ese escandallo.
function adjustStockForSale(recipe, qty, sign, setProducts) {
  if (!recipe || !recipe.ingredients?.length) return;
  setProducts((prev) => {
    const next = [...prev];
    recipe.ingredients.forEach((ing) => {
      const idx = next.findIndex((p) => p.id === ing.productId);
      if (idx !== -1) {
        const current = next[idx].stockActual || 0;
        next[idx] = { ...next[idx], stockActual: Math.round((current + sign * (ing.qty || 0) * qty) * 100) / 100 };
      }
    });
    return next;
  });
}

// Lee el HTML de "lista de pedido" que exporta la otra app de inventario del usuario
// (tarjetas con clases .item/.urgente/.pronto, .nom, .cat, .nr = stock actual, .no = objetivo)
// y devuelve la lista de productos detectados.
function parsePedidoHtml(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  const els = Array.from(doc.querySelectorAll(".item"));
  return els
    .map((el) => {
      const nombre = el.querySelector(".nom")?.textContent?.trim() || "";
      const categoria = el.querySelector(".cat")?.textContent?.trim() || "";
      const nrText = el.querySelector(".nr")?.textContent || "";
      const noText = el.querySelector(".no")?.textContent || "";
      const stockActual = parseFloat(nrText.replace(",", ".")) || 0;
      const objetivo = parseFloat(noText.replace(",", ".")) || 0;
      const urgente = el.classList.contains("urgente");
      return { nombre, categoria, stockActual, objetivo, urgente };
    })
    .filter((it) => it.nombre);
}

async function saveKey(key, value) {
  try {
    const res = await window.storage.set(key, JSON.stringify(value), false);
    return !!res;
  } catch (e) {
    console.error("Error guardando", key, e);
    return false;
  }
}

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (res && res.value) return JSON.parse(res.value);
    return fallback;
  } catch (e) {
    return fallback;
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

// Las fotos de factura hechas con el móvil suelen pesar varios MB, lo que hace fallar
// la llamada a la IA (el puente entre la app y el modelo tiene un límite de tamaño).
// Esta función las reduce a un tamaño razonable antes de enviarlas.
// Usa un data-URL (vía FileReader) en lugar de un blob URL porque algunos webviews móviles
// bloquean los blob: URL dentro de elementos <img>.
function resizeImageForApi(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          if (!dataUrl || dataUrl === "data:,") {
            reject(new Error("El navegador no pudo generar la imagen reducida"));
            return;
          }
          resolve(dataUrl.split(",")[1]);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("No se pudo interpretar la imagen"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de la imagen"));
    reader.readAsDataURL(file);
  });
}

// Comprime la foto en varias pasadas, cada vez más agresivas, hasta que el resultado
// pese poco (el envío falla si el archivo es demasiado grande). Nunca envía la foto
// original sin comprimir: eso es precisamente lo que suele hacer fallar la lectura.
const COMPRESSION_STEPS = [
  { maxDim: 1400, quality: 0.75 },
  { maxDim: 1100, quality: 0.6 },
  { maxDim: 850, quality: 0.5 },
  { maxDim: 650, quality: 0.45 },
];
const MAX_BASE64_LENGTH = 700000; // ~525 KB reales, margen de sobra para el puente de la app

async function prepareImageForApi(file) {
  let lastErr = null;
  for (const step of COMPRESSION_STEPS) {
    try {
      const base64 = await resizeImageForApi(file, step.maxDim, step.quality);
      if (base64.length <= MAX_BASE64_LENGTH) {
        return { base64, mediaType: "image/jpeg" };
      }
      lastErr = new Error("La imagen sigue siendo demasiado grande incluso comprimida");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudo preparar la imagen");
}

// Intenta interpretar la respuesta como JSON aunque el modelo añada texto de más alrededor.
function extractJson(text) {
  const clean = (text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error("La respuesta del análisis no tenía un formato reconocible.");
  }
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  SMALL UI PRIMITIVES                                                 */
/* ------------------------------------------------------------------ */
function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1">
      <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.inkSoft, letterSpacing: "0.03em", textTransform: "uppercase" }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  fontFamily: FONT_MONO,
  fontSize: 14,
  color: T.ink,
  background: T.white,
  border: `1px solid ${T.line}`,
  borderRadius: 6,
  padding: "8px 10px",
  outline: "none",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={"w-full focus:ring-2 " + (props.className || "")} onFocus={(e) => (e.target.style.borderColor = T.copper)} onBlur={(e) => (e.target.style.borderColor = T.line)} />;
}

function Select(props) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={"w-full " + (props.className || "")}>
      {props.children}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", type = "button", disabled, style }) {
  const variants = {
    primary: { background: T.bottle, color: T.white, border: `1px solid ${T.bottle}` },
    copper: { background: T.copper, color: T.white, border: `1px solid ${T.copper}` },
    ghost: { background: "transparent", color: T.bottle, border: `1px solid ${T.line}` },
    danger: { background: "transparent", color: T.rust, border: `1px solid ${T.rust}` },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-opacity"
      style={{
        fontFamily: FONT_BODY,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div
      className="rounded-lg"
      style={{
        background: T.white,
        border: `1px solid ${T.line}`,
        boxShadow: "0 1px 2px rgba(42,36,32,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
      <div>
        {eyebrow && (
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", color: T.copper, textTransform: "uppercase", marginBottom: 2 }}>
            {eyebrow}
          </div>
        )}
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: T.ink }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function ConfirmModal({ open, title, body, onConfirm, onCancel, confirmLabel = "Confirmar" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,36,32,0.55)" }}>
      <Card style={{ maxWidth: 420, width: "100%", padding: 20 }}>
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle size={22} color={T.rust} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: T.ink, marginBottom: 4 }}>{title}</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.inkSoft }}>{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </Card>
    </div>
  );
}

// Selector de "quién eres" con PIN de 4 dígitos. No es seguridad real (todo vive en
// este dispositivo), solo organiza qué ve cada persona cuando le pasas el aparato.
function UserSwitchModal({ open, users, onClose, onSwitch }) {
  const [pendingUser, setPendingUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setPendingUser(null); setPin(""); setError(""); }
  }, [open]);

  if (!open) return null;

  const tryEnter = () => {
    if (pin === (pendingUser.pin || "")) {
      onSwitch(pendingUser.id);
    } else {
      setError("PIN incorrecto.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(42,36,32,0.55)" }}>
      <Card style={{ maxWidth: 380, width: "100%", padding: 20 }}>
        {!pendingUser ? (
          <>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: T.ink, marginBottom: 4 }}>¿Quién eres?</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>Elige tu usuario para ver solo lo que te corresponde.</p>
            <div className="flex flex-col gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setPendingUser(u); setPin(""); setError(""); }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md"
                  style={{ border: `1px solid ${T.line}`, background: T.paper, textAlign: "left" }}
                >
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.ink }}>{u.name}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.copper, textTransform: "uppercase" }}>{ROLES[u.role]?.label || u.role}</span>
                </button>
              ))}
            </div>
            {users.length === 0 && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>Todavía no has creado usuarios. Hazlo en Ajustes → Usuarios.</p>}
            <div className="flex justify-end mt-4">
              <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: T.ink, marginBottom: 4 }}>PIN de {pendingUser.name}</h3>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>Introduce el PIN de 4 dígitos para entrar como {ROLES[pendingUser.role]?.label}.</p>
            <TextInput
              type="password" inputMode="numeric" maxLength={4} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={{ textAlign: "center", fontSize: 22, letterSpacing: "0.5em", width: "100%" }}
              autoFocus
            />
            {error && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, marginTop: 8 }}>{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Btn variant="ghost" onClick={() => setPendingUser(null)}>Atrás</Btn>
              <Btn variant="primary" onClick={tryEnter} disabled={pin.length !== 4}>Entrar</Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  APP                                                                 */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: "escandallos", label: "Escandallos", icon: ChefHat },
  { id: "productos", label: "Productos", icon: Wine },
  { id: "inventario", label: "Inventario", icon: Package },
  { id: "proveedores", label: "Proveedores", icon: Users },
  { id: "facturas", label: "Facturas", icon: Camera },
  { id: "gastos", label: "Gastos", icon: Wallet },
  { id: "ventas", label: "Ventas", icon: TrendingUp },
  { id: "informes", label: "Informes", icon: FileDown },
  { id: "consejos", label: "Consejos", icon: BookOpen },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

// Roles con PIN de 4 dígitos. Esto NO es seguridad real (todo vive en este mismo
// dispositivo/artefacto), es solo una forma de organizar quién ve y toca qué,
// pensado para cuando le pases el dispositivo a un empleado.
const ROLES = {
  dueño: { label: "Dueño/a", tabs: TABS.map((t) => t.id) },
  encargado: { label: "Encargado/a", tabs: TABS.map((t) => t.id) },
  camarero: { label: "Camarero/a", tabs: ["ventas", "inventario", "consejos"] },
};
const ROLE_ORDER = ["dueño", "encargado", "camarero"];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState("escandallos");
  const [navOpen, setNavOpen] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [backupMsg, setBackupMsg] = useState("");
  const [showUserSwitch, setShowUserSwitch] = useState(false);
  const saveTimer = useRef(null);

  const activeUser = config.users?.find((u) => u.id === config.activeUserId) || null;
  const currentRole = activeUser?.role || "dueño";
  const visibleTabs = useMemo(() => TABS.filter((t) => (ROLES[currentRole]?.tabs || ROLES.dueño.tabs).includes(t.id)), [currentRole]);

  // Si cambiamos de rol y la pestaña actual ya no está permitida, saltamos a la primera disponible.
  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0].id);
    }
  }, [currentRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // load fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // Todo se guarda combinado en UNA sola clave ("appdata") en vez de una clave por
  // cada tipo de dato. Guardar en 5-6 claves a la vez con cada cambio dispara el
  // límite de peticiones del almacenamiento y hacía que el guardado fallara.
  const applyLoadedData = (data) => {
    setConfig({
      ...DEFAULT_CONFIG,
      ...(data.config || {}),
      percentages: { ...DEFAULT_CONFIG.percentages, ...((data.config || {}).percentages || {}) },
      colors: { ...DEFAULT_PALETTE, ...((data.config || {}).colors || {}) },
    });
    setProducts(Array.isArray(data.products) ? data.products : []);
    setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
    setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    setSales(Array.isArray(data.sales) ? data.sales : []);
    setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
  };

  // initial load
  useEffect(() => {
    (async () => {
      let data = null;
      try {
        const res = await window.storage.get("appdata", false);
        if (res && res.value) data = JSON.parse(res.value);
      } catch (e) {
        data = null;
      }

      // Migración: si no hay datos en el nuevo formato combinado, intenta recuperar
      // los de una versión anterior de la app que usaba claves separadas.
      if (!data) {
        const legacyInit = await loadKey("initialized", null);
        if (legacyInit) {
          const [c, p, r, s, sa] = await Promise.all([
            loadKey("config", null),
            loadKey("products", null),
            loadKey("recipes", null),
            loadKey("suppliers", null),
            loadKey("sales", null),
          ]);
          if (c || p || r || s || sa) {
            data = { config: c || {}, products: p || [], recipes: r || [], suppliers: s || [], sales: sa || [], invoices: [] };
          }
        }
      }

      if (!data) {
        data = { config: DEFAULT_CONFIG, products: DEFAULT_PRODUCTS, recipes: DEFAULT_RECIPES, suppliers: DEFAULT_SUPPLIERS, sales: demoSales(), invoices: [] };
      }

      applyLoadedData(data);
      const ok = await saveKey("appdata", data);
      setStorageOk(ok);
      setLoading(false);
    })();
  }, []);

  // Aplica la paleta de colores actual como variables CSS en el documento.
  useEffect(() => {
    const colors = { ...DEFAULT_PALETTE, ...(config.colors || {}) };
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--c-${key}`, value);
    });
  }, [config.colors]);

  // Guardado combinado con un pequeño retraso ("debounce"): si el usuario hace varios
  // cambios seguidos, se agrupan en un único guardado en vez de uno por cambio.
  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveKey("appdata", { config, products, recipes, suppliers, sales, invoices });
      setStorageOk(ok);
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [config, products, recipes, suppliers, sales, invoices, loading]);

  const doReset = async () => {
    const data = { config: DEFAULT_CONFIG, products: DEFAULT_PRODUCTS, recipes: DEFAULT_RECIPES, suppliers: DEFAULT_SUPPLIERS, sales: demoSales(), invoices: [] };
    applyLoadedData(data);
    const ok = await saveKey("appdata", data);
    setStorageOk(ok);
    setResetModal(false);
    setTab("escandallos");
  };

  // Copia de seguridad manual: descarga TODO (config, productos, escandallos,
  // proveedores, ventas y facturas) en un único archivo. Es el respaldo si el
  // guardado automático del dispositivo no funciona bien.
  const exportBackup = () => {
    const payload = {
      tipo: "copia-seguridad-escandallo-app",
      exportadoEl: new Date().toISOString(),
      config, products, recipes, suppliers, sales, invoices,
    };
    const safeName = (config.barName || "bar").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadBlob(JSON.stringify(payload, null, 2), `copia-seguridad-${safeName}-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    setBackupMsg("✅ Copia de seguridad descargada.");
    setTimeout(() => setBackupMsg(""), 4000);
  };

  const importBackup = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = {
        config: parsed.config || DEFAULT_CONFIG,
        products: Array.isArray(parsed.products) ? parsed.products : [],
        recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      };
      applyLoadedData(data);
      const ok = await saveKey("appdata", data);
      setStorageOk(ok);
      setBackupMsg(ok ? "✅ Copia de seguridad importada correctamente." : "⚠️ Se ha cargado la copia en la app, pero no se ha podido guardar en este dispositivo. Vuelve a exportarla antes de cerrar.");
    } catch (e) {
      setBackupMsg("❌ No se ha podido leer ese archivo como copia de seguridad válida.");
    }
    setTimeout(() => setBackupMsg(""), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" size={28} color={T.copper} />
          <span style={{ fontFamily: FONT_MONO, color: T.inkSoft, fontSize: 13 }}>Abriendo la barra…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.paper, minHeight: "100vh", fontFamily: FONT_BODY }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
        }
        ::selection { background: ${T.copperLight}; color: white; }
      `}</style>

      {/* Header */}
      <header className="no-print sticky top-0 z-40" style={{ background: T.bottle, borderBottom: `3px double ${T.copper}` }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: T.copper, color: T.white, fontFamily: FONT_DISPLAY, fontWeight: 700 }}
            >
              {config.barName?.charAt(0)?.toUpperCase() || "B"}
            </div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white, lineHeight: 1 }}>{config.barName}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.copperLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cuaderno de escandallos</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.users?.length > 0 && (
              <button
                onClick={() => setShowUserSwitch(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${T.copperLight}55` }}
              >
                <Users size={13} color={T.copperLight} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.paper, fontWeight: 600 }}>
                  {activeUser ? activeUser.name : "Vista completa"}
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: T.copperLight, textTransform: "uppercase" }}>
                  {ROLES[currentRole]?.label}
                </span>
              </button>
            )}
            <button className="md:hidden" onClick={() => setNavOpen((v) => !v)} style={{ color: T.white }}>
              <Receipt size={22} />
            </button>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm"
                  style={{
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    color: active ? T.bottle : T.paper,
                    background: active ? T.copperLight : "transparent",
                  }}
                >
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </nav>
        </div>
        {navOpen && (
          <div className="md:hidden flex flex-col px-4 pb-3 gap-1">
            {config.users?.length > 0 && (
              <button
                onClick={() => { setShowUserSwitch(true); setNavOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left mb-1"
                style={{ background: "rgba(255,255,255,0.1)", color: T.paper, fontWeight: 600 }}
              >
                <Users size={15} /> {activeUser ? activeUser.name : "Vista completa"} · {ROLES[currentRole]?.label}
              </button>
            )}
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setNavOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left"
                  style={{ fontWeight: 600, color: active ? T.bottle : T.paper, background: active ? T.copperLight : "transparent" }}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <UserSwitchModal
        open={showUserSwitch}
        users={config.users || []}
        onClose={() => setShowUserSwitch(false)}
        onSwitch={(userId) => { setConfig((c) => ({ ...c, activeUserId: userId })); setShowUserSwitch(false); }}
      />

      {!storageOk && (
        <div className="no-print" style={{ background: "#F6E4DF", borderBottom: `1px solid ${T.rust}` }}>
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2" style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, fontWeight: 600 }}>
              <AlertTriangle size={16} /> Este dispositivo no está guardando los cambios automáticamente. Exporta una copia de seguridad antes de cerrar la app.
            </div>
            <Btn variant="danger" onClick={exportBackup}><FileDown size={14} /> Exportar copia de seguridad ahora</Btn>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "escandallos" && (
          <EscandallosTab
            recipes={recipes} setRecipes={setRecipes}
            products={products} setProducts={setProducts} config={config}
          />
        )}
        {tab === "productos" && (
          <ProductosTab products={products} setProducts={setProducts} suppliers={suppliers} />
        )}
        {tab === "inventario" && (
          <InventarioTab products={products} setProducts={setProducts} config={config} setConfig={setConfig} />
        )}
        {tab === "proveedores" && (
          <ProveedoresTab suppliers={suppliers} setSuppliers={setSuppliers} products={products} />
        )}
        {tab === "facturas" && (
          <FacturasTab
            suppliers={suppliers} setSuppliers={setSuppliers} setProducts={setProducts} products={products}
            invoices={invoices} setInvoices={setInvoices} config={config}
          />
        )}
        {tab === "gastos" && (
          <GastosTab invoices={invoices} setInvoices={setInvoices} suppliers={suppliers} config={config} />
        )}
        {tab === "ventas" && (
          <VentasTab sales={sales} setSales={setSales} recipes={recipes} products={products} setProducts={setProducts} config={config} />
        )}
        {tab === "informes" && (
          <InformesTab sales={sales} recipes={recipes} products={products} config={config} />
        )}
        {tab === "consejos" && <ConsejosTab config={config} />}
        {tab === "ajustes" && (
          <AjustesTab
            config={config} setConfig={setConfig} onResetClick={() => setResetModal(true)}
            storageOk={storageOk} onExport={exportBackup} onImport={importBackup} backupMsg={backupMsg}
            currentRole={currentRole}
          />
        )}
      </main>

      <ConfirmModal
        open={resetModal}
        title="Restaurar la app a valores predeterminados"
        body="Esto borrará productos, escandallos, proveedores y ventas que hayas añadido, y dejará la app como estaba al empezar. No se puede deshacer."
        confirmLabel="Restaurar"
        onCancel={() => setResetModal(false)}
        onConfirm={doReset}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ESCANDALLOS TAB                                                     */
/* ------------------------------------------------------------------ */
function EscandallosTab({ recipes, setRecipes, products, setProducts, config }) {
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const blank = () => ({
    id: uid(),
    name: "",
    category: "cocteleria",
    pvp: 0,
    notes: "",
    ingredients: [],
  });

  const [draft, setDraft] = useState(null);

  const startNew = () => { setDraft(blank()); setEditingId("new"); };
  const startEdit = (r) => { setDraft(JSON.parse(JSON.stringify(r))); setEditingId(r.id); };
  const cancel = () => { setDraft(null); setEditingId(null); };

  const save = () => {
    if (!draft.name.trim()) return;
    if (editingId === "new") {
      setRecipes((r) => [...r, draft]);
    } else {
      setRecipes((r) => r.map((x) => (x.id === draft.id ? draft : x)));
    }
    cancel();
  };

  // ── Crear escandallo a partir de una foto o documento con la receta ──
  const [showImport, setShowImport] = useState(false);
  const [recipeFile, setRecipeFile] = useState(null);
  const [recipePreview, setRecipePreview] = useState(null);
  const [recipeAnalyzing, setRecipeAnalyzing] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const recipeFileRef = useRef(null);

  const matchProductByName = (nombre) => {
    const n = (nombre || "").trim().toLowerCase();
    if (!n) return "";
    const exact = products.find((p) => p.name.trim().toLowerCase() === n);
    if (exact) return exact.id;
    const partial = products.find((p) => {
      const pn = p.name.trim().toLowerCase();
      return n.includes(pn) || pn.includes(n);
    });
    return partial ? partial.id : "";
  };

  const onRecipeFile = (f) => {
    if (!f) return;
    setRecipeFile(f);
    setRecipeError("");
    setRecipePreview(f.type?.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const analyzeRecipeFile = async () => {
    setRecipeAnalyzing(true);
    setRecipeError("");
    try {
      if (!config?.apiKey) throw new Error("Añade tu clave API de Anthropic en Ajustes antes de usar esta función.");
      const isPdf = recipeFile.type === "application/pdf";
      let contentBlock;
      if (isPdf) {
        const base64 = await toBase64(recipeFile);
        contentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
      } else {
        const { base64, mediaType } = await prepareImageForApi(recipeFile);
        contentBlock = { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
      }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: anthropicHeaders(config),
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: `Analiza esta receta de un bar/restaurante (foto o documento de una ficha técnica, receta de cóctel, plato o ración). Responde ÚNICAMENTE con un JSON válido y compacto, sin texto adicional, sin bloques de código, con esta forma exacta:
{"nombre":"...","categoria":"bebida|cocteleria|raciones|platos","pvp":numero,"notas":"pasos de elaboración breves","ingredientes":[{"nombre":"...","cantidad":numero,"unidad":"ml|g|unit|l|kg","categoriaProducto":"..."}]}
"categoria" es tu mejor estimación del tipo de receta (bebida/coctelería/ración/plato). "categoriaProducto" es, para cada ingrediente, el tipo de producto en una o dos palabras en español (ej. "Bebidas", "Pescados y mariscos", "Carnes", "Fruta y verdura", "Lácteos", "Congelados", "Panadería", "Aceites y condimentos", "Otros"). "pvp" es el precio de venta si aparece en el documento, si no, pon 0. "notas" son los pasos de elaboración resumidos en un par de frases, o cadena vacía si no aparecen. No inventes ingredientes ni cantidades que no estén en la imagen/documento.`,
              },
            ],
          }],
        }),
      });
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("El servidor no devolvió JSON válido.");
      }
      if (!response.ok || data.type === "error") {
        throw new Error(data?.error?.message || `El servicio respondió con un error (${response.status}).`);
      }
      const text = (data.content || []).map((b) => b.text || "").join("\n");
      if (!text.trim()) throw new Error("La respuesta no incluyó texto para analizar.");
      const parsed = extractJson(text);
      const ingredientesDetectados = parsed.ingredientes || [];
      if (ingredientesDetectados.length === 0) throw new Error("No se detectó ningún ingrediente en la imagen/documento.");

      // Para los ingredientes que no coincidan con ningún producto ya existente,
      // creamos un producto "provisional" (sin precio) para poder referenciarlo en
      // el escandallo; luego puedes ponerle el coste real en Productos o al meter
      // la factura del proveedor correspondiente.
      const newProducts = [];
      const ingredients = ingredientesDetectados.map((it) => {
        const unidadFinal = it.unidad === "l" ? "ml" : it.unidad === "kg" ? "g" : it.unidad || "unit";
        const cantidadFinal = it.unidad === "l" || it.unidad === "kg" ? (Number(it.cantidad) || 0) * 1000 : Number(it.cantidad) || 0;
        let productId = matchProductByName(it.nombre);
        if (!productId) {
          productId = uid();
          newProducts.push({
            id: productId,
            name: it.nombre,
            category: it.categoriaProducto?.trim() || "Sin clasificar",
            supplierId: "",
            packQuantity: unidadFinal === "unit" ? 1 : 1000,
            unit: unidadFinal,
            packPrice: 0,
            stockActual: 0, stockMinimo: 0, stockIntermedio: 0, stockObjetivo: 0,
          });
        }
        return { productId, qty: cantidadFinal };
      });
      if (newProducts.length > 0) setProducts((prev) => [...prev, ...newProducts]);

      const categoriaValida = ["bebida", "cocteleria", "raciones", "platos"].includes(parsed.categoria) ? parsed.categoria : "cocteleria";
      const newId = uid();
      const newRecipe = {
        id: newId,
        name: parsed.nombre || "Receta sin nombre",
        category: categoriaValida,
        pvp: Number(parsed.pvp) || 0,
        notes: parsed.notas || "",
        ingredients,
      };
      setRecipes((r) => [...r, newRecipe]);
      setDraft(JSON.parse(JSON.stringify(newRecipe)));
      setEditingId(newId);
      setShowImport(false);
      setRecipeFile(null);
      setRecipePreview(null);
    } catch (e) {
      setRecipeError("No se ha podido leer la receta automáticamente. Puedes crear el escandallo a mano con \"Nuevo escandallo\". Detalle: " + e.message);
    } finally {
      setRecipeAnalyzing(false);
    }
  };

  const addIngredient = () => {
    if (products.length === 0) return;
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, { productId: products[0].id, qty: 0 }] }));
  };

  const updateIngredient = (idx, field, value) => {
    setDraft((d) => {
      const ings = [...d.ingredients];
      ings[idx] = { ...ings[idx], [field]: field === "qty" ? Number(value) : value };
      return { ...d, ingredients: ings };
    });
  };

  const removeIngredient = (idx) => {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }));
  };

  const cost = draft ? recipeCost(draft, products, config.mermas) : 0;
  const targetPerc = draft ? config.percentages[draft.category] ?? 20 : 20;
  const suggestedPvp = cost / (targetPerc / 100);

  return (
    <div>
      <SectionTitle
        eyebrow="Fichas de coste"
        title="Escandallos"
        right={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setShowImport((v) => !v)}><Camera size={15} /> Crear desde imagen/documento</Btn>
            <Btn variant="copper" onClick={startNew}><Plus size={16} /> Nuevo escandallo</Btn>
          </div>
        }
      />

      {showImport && (
        <Card style={{ padding: 20, marginBottom: 20, borderColor: T.copper }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, marginBottom: 4 }}>Crear escandallo desde una receta</h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            Sube una foto o un PDF con la receta detallada (ficha técnica, receta de cóctel o plato con ingredientes y cantidades). La app creará el escandallo automáticamente, emparejando los ingredientes con tus productos existentes cuando pueda. Los ingredientes que no reconozca se crean como productos nuevos sin precio, para que lo completes tú.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={recipeFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onRecipeFile(e.target.files[0])} />
            <Btn variant="ghost" onClick={() => recipeFileRef.current.click()}><Upload size={15} /> Elegir foto o PDF</Btn>
            {recipeFile && <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: T.inkSoft }}>{recipeFile.name}</span>}
            {recipeFile && (
              <Btn variant="copper" onClick={analyzeRecipeFile} disabled={recipeAnalyzing}>
                {recipeAnalyzing ? <Loader2 className="animate-spin" size={15} /> : <Camera size={15} />}
                {recipeAnalyzing ? "Leyendo receta…" : "Analizar receta"}
              </Btn>
            )}
          </div>
          {recipePreview && <img src={recipePreview} alt="Vista previa de la receta" style={{ maxHeight: 200, marginTop: 12, borderRadius: 8, border: `1px solid ${T.line}` }} />}
          {recipeError && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, marginTop: 12 }}>{recipeError}</p>}
        </Card>
      )}

      {draft && (
        <Card style={{ padding: 20, marginBottom: 24, borderColor: T.copper }}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="Nombre del producto">
              <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. Gin Tonic, Ración de croquetas…" />
            </Field>
            <Field label="Categoría (define el % objetivo)">
              <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                <option value="bebida">Bebida</option>
                <option value="cocteleria">Coctelería</option>
                <option value="raciones">Ración / tapa</option>
                <option value="platos">Plato / menú</option>
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Ingredientes
            </span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft }}>El coste (€) también es editable</span>
          </div>
          <div className="flex flex-col gap-2 mb-3">
            {draft.ingredients.map((ing, idx) => {
              const prod = products.find((p) => p.id === ing.productId);
              const costeIngrediente = unitCost(prod) * (ing.qty || 0);

              // Al editar el coste de este ingrediente, recalculamos hacia atrás el precio
              // del envase de ese producto (manteniendo su tamaño de envase actual), para
              // que el cambio se guarde en Productos y se refleje en el resto de escandallos.
              const updateIngredientCost = (value) => {
                if (!prod || !ing.qty) return;
                const nuevoCosteIngrediente = Number(value) || 0;
                const nuevoPackPrice = (nuevoCosteIngrediente / ing.qty) * (prod.packQuantity || 1);
                setProducts((prev) => prev.map((p) => (p.id === prod.id ? { ...p, packPrice: Math.round(nuevoPackPrice * 10000) / 10000 } : p)));
              };

              return (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-md" style={{ background: T.paper }}>
                  <Select value={ing.productId} onChange={(e) => updateIngredient(idx, "productId", e.target.value)} style={{ minWidth: 180, flex: 1 }}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </Select>
                  <TextInput type="number" value={ing.qty} onChange={(e) => updateIngredient(idx, "qty", e.target.value)} style={{ width: 90 }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkSoft, width: 30 }}>{prod?.unit}</span>
                  <TextInput
                    type="number" step="0.01" value={Math.round(costeIngrediente * 100) / 100}
                    onChange={(e) => updateIngredientCost(e.target.value)}
                    title="Coste de este ingrediente (edítalo para ajustar el precio del producto)"
                    style={{ width: 85, color: T.bottle, fontWeight: 600 }}
                  />
                  <button onClick={() => removeIngredient(idx)}><Trash2 size={16} color={T.rust} /></button>
                </div>
              );
            })}
            {draft.ingredients.length === 0 && (
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>Todavía no has añadido ingredientes.</p>
            )}
          </div>
          {draft.ingredients.some((ing) => {
            const prod = products.find((p) => p.id === ing.productId);
            return prod && !prod.packPrice;
          }) && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.rust, marginBottom: 10 }}>
              ⚠ Algún ingrediente es un producto nuevo sin precio todavía (coste 0 €), así que el coste de este escandallo estará incompleto. Complétalo en Productos o sube la factura del proveedor.
            </p>
          )}
          <Btn variant="ghost" onClick={addIngredient}><Plus size={14} /> Añadir ingrediente</Btn>

          <div className="grid md:grid-cols-3 gap-4 mt-5 mb-2">
            <Field label={`Coste (con ${config.mermas}% mermas)`}>
              <div style={{ ...inputStyle, background: T.paperDark, fontWeight: 600 }}>{eur(cost)}</div>
            </Field>
            <Field label={`PVP sugerido (${targetPerc}% coste)`}>
              <div style={{ ...inputStyle, background: T.paperDark, fontWeight: 600, color: T.sage }}>{eur(suggestedPvp)}</div>
            </Field>
            <Field label="PVP real que aplicas">
              <TextInput type="number" step="0.05" value={draft.pvp} onChange={(e) => setDraft({ ...draft, pvp: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Notas de elaboración">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
              style={{ ...inputStyle, fontFamily: FONT_BODY, width: "100%", resize: "vertical" }}
            />
          </Field>

          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={cancel}><X size={15} /> Cancelar</Btn>
            <Btn variant="primary" onClick={save}><Check size={15} /> Guardar escandallo</Btn>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {recipes.map((r) => {
          const c = recipeCost(r, products, config.mermas);
          const margin = r.pvp - c;
          const realPerc = r.pvp ? (c / r.pvp) * 100 : 0;
          const target = config.percentages[r.category] ?? 20;
          const over = realPerc > target;
          return (
            <Card key={r.id} style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              <div style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${T.paper} 0 8px, transparent 8px 16px)`,
                height: 6,
              }} />
              <div style={{ padding: "16px 20px" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.copper, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      {r.category}
                    </div>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 21, color: T.ink }}>{r.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(r)}><Pencil size={16} color={T.inkSoft} /></button>
                    <button onClick={() => setDeleteId(r.id)}><Trash2 size={16} color={T.rust} /></button>
                  </div>
                </div>

                <div style={{ borderTop: `1px dashed ${T.line}`, margin: "12px 0" }} />

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 600, color: T.ink }}>{eur(c)}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: T.inkSoft, textTransform: "uppercase" }}>Coste</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 600, color: T.ink }}>{eur(r.pvp)}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: T.inkSoft, textTransform: "uppercase" }}>PVP</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 600, color: T.sage }}>{eur(margin)}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: T.inkSoft, textTransform: "uppercase" }}>Margen</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 px-2 py-1.5 rounded" style={{ background: over ? "#F6E4DF" : "#EAF0EA" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: over ? T.rust : T.sage, fontWeight: 600 }}>
                    Coste real: {pct(realPerc)} (objetivo {target}%)
                  </span>
                  {over && <AlertTriangle size={14} color={T.rust} />}
                </div>
                {r.notes && <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginTop: 8 }}>{r.notes}</p>}
              </div>
            </Card>
          );
        })}
      </div>

      {recipes.length === 0 && !draft && (
        <p style={{ fontFamily: FONT_BODY, color: T.inkSoft, textAlign: "center", padding: "40px 0" }}>
          Todavía no tienes escandallos. Crea el primero con "Nuevo escandallo".
        </p>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar escandallo"
        body="Se eliminará esta ficha de coste de forma permanente."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { setRecipes((r) => r.filter((x) => x.id !== deleteId)); setDeleteId(null); }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PRODUCTOS TAB                                                       */
/* ------------------------------------------------------------------ */
function ProductosTab({ products, setProducts, suppliers }) {
  const [draft, setDraft] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const existingCategories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")), [products]);

  const blank = () => ({ id: uid(), name: "", category: "", supplierId: suppliers[0]?.id || "", packQuantity: 0, unit: "ml", packPrice: 0 });

  const save = () => {
    if (!draft.name.trim()) return;
    setProducts((p) => {
      const exists = p.some((x) => x.id === draft.id);
      return exists ? p.map((x) => (x.id === draft.id ? draft : x)) : [...p, draft];
    });
    setDraft(null);
  };

  return (
    <div>
      <SectionTitle
        eyebrow="Catálogo de compra"
        title="Productos"
        right={<Btn variant="copper" onClick={() => setDraft(blank())}><Plus size={16} /> Nuevo producto</Btn>}
      />

      {draft && (
        <Card style={{ padding: 20, marginBottom: 20, borderColor: T.copper }}>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Nombre"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Categoría">
              <TextInput value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Bebidas, Comida…" list="categorias-productos" />
              <datalist id="categorias-productos">
                {existingCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Proveedor">
              <Select value={draft.supplierId} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })}>
                <option value="">— Sin asignar —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Cantidad del envase"><TextInput type="number" value={draft.packQuantity} onChange={(e) => setDraft({ ...draft, packQuantity: Number(e.target.value) })} /></Field>
            <Field label="Unidad">
              <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="unit">unidad</option>
              </Select>
            </Field>
            <Field label="Precio del envase"><TextInput type="number" step="0.01" value={draft.packPrice} onChange={(e) => setDraft({ ...draft, packPrice: Number(e.target.value) })} /></Field>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: T.bottle, marginTop: 10 }}>
            Coste: {unitCostDisplay(draft)}
            {(draft.unit === "g" || draft.unit === "ml") && (
              <span style={{ color: T.inkSoft }}> &nbsp;({eur(unitCost(draft))}/{draft.unit})</span>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={() => setDraft(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={save}><Check size={15} /> Guardar</Btn>
          </div>
        </Card>
      )}

      <Card style={{ overflow: "hidden" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bottle }}>
              {["Producto", "Categoría", "Proveedor", "Envase", "Precio", "Coste/unidad", ""].map((h) => (
                <th key={h} style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.paper, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", padding: "10px 14px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 ? T.paper : T.white, borderBottom: `1px solid ${T.line}` }}>
                <td style={{ padding: "10px 14px", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13.5 }}>{p.name}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>{p.category}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>{suppliers.find((s) => s.id === p.supplierId)?.name || "—"}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{p.packQuantity} {p.unit}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{eur(p.packPrice)}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT_MONO, fontSize: 12.5, color: T.copper }}>{unitCostDisplay(p)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div className="flex gap-2">
                    <button onClick={() => setDraft(p)}><Pencil size={15} color={T.inkSoft} /></button>
                    <button onClick={() => setDeleteId(p.id)}><Trash2 size={15} color={T.rust} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p style={{ padding: 20, fontFamily: FONT_BODY, color: T.inkSoft, textAlign: "center" }}>No hay productos todavía.</p>}
      </Card>

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar producto"
        body="Los escandallos que usen este producto dejarán de calcular su coste correctamente."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { setProducts((p) => p.filter((x) => x.id !== deleteId)); setDeleteId(null); }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  INVENTARIO TAB (control de stock: semáforo, umbrales y pedido)      */
/* ------------------------------------------------------------------ */
const STOCK_ESTADOS = {
  rojo: { label: "Pedir", bg: "#F6E4DF", border: "#A13D2B" },
  naranja: { label: "Pronto", bg: "#FBEEDB", border: "#B8703E" },
  verde: { label: "OK", bg: "#EAF0EA", border: "#7C9082" },
};

function StockBadge({ estado }) {
  const m = STOCK_ESTADOS[estado];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: m.bg, border: `1.5px solid ${m.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.border }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: m.border, letterSpacing: "0.03em" }}>{m.label}</span>
    </span>
  );
}

function InventarioTab({ products, setProducts, config, setConfig }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [pedidoMsg, setPedidoMsg] = useState("");

  // ── Importar inventario desde archivo de otra app ──
  const [showFileImport, setShowFileImport] = useState(false);
  const [importItems, setImportItems] = useState(null);
  const [importError, setImportError] = useState("");
  const fileImportRef = useRef(null);

  const matchProduct = (nombre) => {
    const n = (nombre || "").trim().toLowerCase();
    if (!n) return "";
    const exact = products.find((p) => p.name.trim().toLowerCase() === n);
    if (exact) return exact.id;
    const partial = products.find((p) => {
      const pn = p.name.trim().toLowerCase();
      return n.includes(pn) || pn.includes(n);
    });
    return partial ? partial.id : "";
  };

  const onImportFile = async (file) => {
    setImportError("");
    setImportItems(null);
    try {
      const text = await file.text();
      const parsed = parsePedidoHtml(text);
      if (parsed.length === 0) throw new Error("No se ha detectado ningún producto en este archivo.");
      setImportItems(parsed.map((it) => ({ tempId: uid(), ...it, productId: matchProduct(it.nombre) })));
    } catch (e) {
      setImportError("No se ha podido leer el archivo. Asegúrate de que es un archivo de pedido/inventario exportado de tu otra app. Detalle: " + e.message);
    }
  };

  const updateImportItem = (tempId, field, value) => {
    setImportItems((items) => items.map((it) => (it.tempId === tempId ? { ...it, [field]: field === "stockActual" || field === "objetivo" ? Number(value) : value } : it)));
  };
  const removeImportItem = (tempId) => setImportItems((items) => items.filter((it) => it.tempId !== tempId));

  const confirmImport = () => {
    setProducts((prev) => {
      const next = [...prev];
      importItems.forEach((it) => {
        if (it.productId) {
          // Producto ya existente: solo actualizamos su stock actual, sin tocar
          // los umbrales que ya tengas configurados aquí.
          const idx = next.findIndex((p) => p.id === it.productId);
          if (idx !== -1) next[idx] = { ...next[idx], stockActual: it.stockActual };
        } else {
          // Producto nuevo: no tenemos precio ni umbrales exactos de la otra app,
          // así que aproximamos los umbrales a partir del estado (urgente/pronto)
          // detectado y dejamos el precio en 0 hasta que lo edites o llegue por factura.
          const intermedio = it.objetivo > 0 ? it.objetivo : (it.stockActual || 1) * 2;
          const minimo = it.urgente ? it.stockActual : Math.floor((it.stockActual || 0) / 2);
          next.push({
            id: uid(),
            name: it.nombre,
            category: it.categoria || "Sin clasificar",
            supplierId: "",
            packQuantity: 1,
            unit: "unit",
            packPrice: 0,
            stockActual: it.stockActual,
            stockMinimo: minimo,
            stockIntermedio: intermedio,
            stockObjetivo: it.objetivo || intermedio,
          });
        }
      });
      return next;
    });
    setImportItems(null);
    setShowFileImport(false);
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "Sin categoría"));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const filtered = useMemo(() => products.filter((p) => {
    const cat = p.category || "Sin categoría";
    const catOk = catFilter === "Todas" || cat === catFilter;
    const estOk = statusFilter === "Todos" || stockEstado(p) === statusFilter;
    const searchOk = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return catOk && estOk && searchOk;
  }), [products, catFilter, statusFilter, search]);

  const stats = useMemo(() => ({
    total: products.length,
    rojo: products.filter((p) => stockEstado(p) === "rojo").length,
    naranja: products.filter((p) => stockEstado(p) === "naranja").length,
    verde: products.filter((p) => stockEstado(p) === "verde").length,
  }), [products]);

  const startEdit = (p) => {
    setEditId(p.id);
    setDraft({ stockActual: p.stockActual || 0, stockMinimo: p.stockMinimo || 0, stockIntermedio: p.stockIntermedio || 0, stockObjetivo: p.stockObjetivo || 0 });
  };
  const cancelEdit = () => { setEditId(null); setDraft(null); };
  const saveEdit = () => {
    setProducts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...draft } : p)));
    cancelEdit();
  };

  const exportarPedido = () => {
    const pedir = products.filter((p) => stockEstado(p) === "rojo");
    const pronto = products.filter((p) => stockEstado(p) === "naranja");
    if (pedir.length === 0 && pronto.length === 0) {
      setPedidoMsg("✅ Todo el stock está bien. No hay nada que pedir ahora mismo.");
      setTimeout(() => setPedidoMsg(""), 4000);
      return;
    }
    const colors = { ...DEFAULT_PALETTE, ...(config.colors || {}) };
    const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const hora = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const renderItem = (p, urgente) => `
      <div class="item ${urgente ? "urgente" : "pronto"}">
        <div class="item-info">
          <div class="item-nombre">${p.name}</div>
          <div class="item-cat">${p.category || "Sin categoría"}</div>
        </div>
        <div class="item-right">
          <div class="stock-box"><span class="stock-num">${p.stockActual || 0}</span><span class="stock-label">${p.unit} ahora</span></div>
          <div class="arrow">→</div>
          <div class="stock-box"><span class="pedir-num">${p.stockObjetivo || 0}</span><span class="stock-label">pedir hasta</span></div>
          <div class="badge-${urgente ? "rojo" : "naranja"}">${urgente ? "URGENTE" : "PRONTO"}</div>
        </div>
      </div>`;
    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.barName} — Lista de pedido</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:${colors.paper};color:${colors.ink};padding:0}
  .page{max-width:680px;margin:0 auto;padding:32px 20px 60px}
  .header{background:${colors.bottle};border-radius:16px;padding:26px 26px 18px;color:${colors.white};margin-bottom:26px}
  .bar-name{font-family:'Fraunces',serif;font-size:26px;font-weight:700;color:${colors.copperLight}}
  .subtitle{font-size:12px;letter-spacing:1px;color:${colors.white}aa;margin-top:4px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace}
  .meta{display:flex;gap:16px;margin-top:16px;flex-wrap:wrap}
  .meta-item{background:${colors.white}18;border-radius:10px;padding:8px 14px;font-size:11px}
  .meta-item strong{color:${colors.copperLight};display:block;font-size:18px;font-family:'IBM Plex Mono',monospace}
  .section-title{font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin:22px 0 10px;font-family:'IBM Plex Mono',monospace}
  .section-title.rojo{color:${colors.rust}}
  .section-title.naranja{color:${colors.copper}}
  .item{display:flex;align-items:center;justify-content:space-between;background:${colors.white};border-radius:12px;padding:14px 16px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,.06);border-left:4px solid transparent;gap:12px;flex-wrap:wrap}
  .item.urgente{border-left-color:${colors.rust}}
  .item.pronto{border-left-color:${colors.copper}}
  .item-nombre{font-weight:700;font-size:14px}
  .item-cat{font-size:11px;color:${colors.inkSoft};margin-top:2px;text-transform:uppercase}
  .item-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .stock-box{text-align:center;font-family:'IBM Plex Mono',monospace}
  .stock-num{display:block;font-size:18px;font-weight:700;color:${colors.rust}}
  .pedir-num{display:block;font-size:18px;font-weight:700;color:${colors.ink}}
  .stock-label{font-size:9px;color:${colors.inkSoft};text-transform:uppercase}
  .arrow{font-size:16px;color:${colors.line}}
  .badge-rojo{background:#F6E4DF;color:${colors.rust};border:1.5px solid ${colors.rust}66;border-radius:20px;padding:4px 10px;font-size:10px;font-weight:800}
  .badge-naranja{background:#FBEEDB;color:${colors.copper};border:1.5px solid ${colors.copper}66;border-radius:20px;padding:4px 10px;font-size:10px;font-weight:800}
  .nota{background:${colors.white};border-radius:14px;padding:18px 20px;margin-top:22px;border-left:4px solid ${colors.copper}}
  .nota-title{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${colors.copper};margin-bottom:8px;font-family:'IBM Plex Mono',monospace}
  .nota-text{font-size:13.5px;color:${colors.inkSoft};line-height:1.6}
  .footer{text-align:center;margin-top:30px;font-size:11px;color:${colors.inkSoft}}
</style></head>
<body><div class="page">
  <div class="header">
    <div class="bar-name">${config.barName}</div>
    <div class="subtitle">Lista de pedido — ${fecha}</div>
    <div class="meta">
      <div class="meta-item"><strong>${hora}</strong>Hora</div>
      <div class="meta-item"><strong>${pedir.length}</strong>Urgente${pedir.length !== 1 ? "s" : ""}</div>
      <div class="meta-item"><strong>${pronto.length}</strong>Pronto</div>
    </div>
  </div>
  ${pedir.length > 0 ? `<div class="section-title rojo">Pedir urgente — por debajo del mínimo</div>${pedir.map((p) => renderItem(p, true)).join("")}` : ""}
  ${pronto.length > 0 ? `<div class="section-title naranja">Pedir pronto — se está agotando</div>${pronto.map((p) => renderItem(p, false)).join("")}` : ""}
  ${config.notaPedido ? `<div class="nota"><div class="nota-title">Nota</div><div class="nota-text">${config.notaPedido.replace(/\n/g, "<br>")}</div></div>` : ""}
  <div class="footer">${config.barName} · Generado el ${fecha} a las ${hora}</div>
</div></body></html>`;
    const safeName = (config.barName || "bar").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadBlob(html, `pedido-${safeName}-${new Date().toISOString().slice(0, 10)}.html`, "text/html;charset=utf-8");
  };

  return (
    <div>
      <SectionTitle
        eyebrow="Control de stock"
        title="Inventario"
        right={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setShowFileImport((v) => !v)}><Upload size={15} /> Importar de otra app</Btn>
            <Btn variant="copper" onClick={exportarPedido}><FileDown size={16} /> Exportar lista de pedido</Btn>
          </div>
        }
      />
      {pedidoMsg && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.sage, marginTop: -10, marginBottom: 14 }}>{pedidoMsg}</p>}

      {showFileImport && (
        <Card style={{ padding: 20, marginBottom: 20, borderColor: T.copper }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, marginBottom: 4 }}>Importar inventario desde archivo</h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            Sube el archivo <code>.html</code> de "lista de pedido" que exporta tu otra app de inventario. Los productos que ya tengas aquí actualizarán su stock; los que no existan se crearán nuevos (sin precio, hasta que los edites o lleguen por factura).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileImportRef} type="file" accept=".html,.htm" className="hidden" onChange={(e) => { if (e.target.files[0]) onImportFile(e.target.files[0]); e.target.value = ""; }} />
            <Btn variant="ghost" onClick={() => fileImportRef.current.click()}><Upload size={15} /> Elegir archivo</Btn>
          </div>
          {importError && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, marginTop: 12 }}>{importError}</p>}

          {importItems && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
                Se detectaron {importItems.length} productos. Revisa a qué producto corresponde cada uno (o déjalo en "— Crear nuevo —").
              </p>
              <div className="flex flex-col gap-2">
                {importItems.map((it) => (
                  <div key={it.tempId} className="flex flex-wrap items-center gap-2 p-2 rounded" style={{ background: T.paper }}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600 }}>{it.nombre}</div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.inkSoft }}>{it.categoria || "Sin categoría"} · {it.urgente ? "🔴 urgente" : "🟠 pronto"}</div>
                    </div>
                    <Field label="Stock">
                      <TextInput type="number" value={it.stockActual} onChange={(e) => updateImportItem(it.tempId, "stockActual", e.target.value)} style={{ width: 80 }} />
                    </Field>
                    <Field label="Pedir hasta">
                      <TextInput type="number" value={it.objetivo} onChange={(e) => updateImportItem(it.tempId, "objetivo", e.target.value)} style={{ width: 80 }} />
                    </Field>
                    <Field label="Producto">
                      <Select value={it.productId} onChange={(e) => updateImportItem(it.tempId, "productId", e.target.value)} style={{ minWidth: 170 }}>
                        <option value="">— Crear nuevo —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                    </Field>
                    <button onClick={() => removeImportItem(it.tempId)}><Trash2 size={15} color={T.rust} /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Btn variant="ghost" onClick={() => { setImportItems(null); setShowFileImport(false); }}>Descartar</Btn>
                <Btn variant="primary" onClick={confirmImport}><Check size={15} /> Importar {importItems.length} productos</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total productos", value: stats.total, color: T.ink },
          { label: "Pedir ya", value: stats.rojo, color: T.rust },
          { label: "Pronto", value: stats.naranja, color: T.copper },
          { label: "OK", value: stats.verde, color: T.sage },
        ].map((s) => (
          <Card key={s.label} style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft, textTransform: "uppercase" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-3">
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <Search size={15} color={T.inkSoft} style={{ position: "absolute", left: 10, top: 10 }} />
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" style={{ paddingLeft: 32 }} />
          </div>
          <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ width: 160 }}>
            <option value="Todas">Todas las categorías</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 150 }}>
            <option value="Todos">Todos los estados</option>
            <option value="rojo">🔴 Pedir</option>
            <option value="naranja">🟠 Pronto</option>
            <option value="verde">🟢 OK</option>
          </Select>
        </div>
      </Card>

      {editId && draft && (
        <Card style={{ padding: 20, marginBottom: 20, borderColor: T.copper }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>
            Ajustar stock — {products.find((p) => p.id === editId)?.name}
          </h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            El stock también se actualiza solo con las facturas (suma) y las ventas (resta). Usa esto para corregirlo a mano tras un recuento o una merma.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Field label={`Stock actual (${products.find((p) => p.id === editId)?.unit || ""})`}>
              <TextInput type="number" value={draft.stockActual} onChange={(e) => setDraft({ ...draft, stockActual: Number(e.target.value) })} />
            </Field>
            <Field label="Mínimo (🔴 pedir ya)">
              <TextInput type="number" value={draft.stockMinimo} onChange={(e) => setDraft({ ...draft, stockMinimo: Number(e.target.value) })} />
            </Field>
            <Field label="Intermedio (🟠 pronto)">
              <TextInput type="number" value={draft.stockIntermedio} onChange={(e) => setDraft({ ...draft, stockIntermedio: Number(e.target.value) })} />
            </Field>
            <Field label="Objetivo (pedir hasta)">
              <TextInput type="number" value={draft.stockObjetivo} onChange={(e) => setDraft({ ...draft, stockObjetivo: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={cancelEdit}><X size={15} /> Cancelar</Btn>
            <Btn variant="primary" onClick={saveEdit}><Check size={15} /> Guardar</Btn>
          </div>
        </Card>
      )}

      {categories.filter((c) => catFilter === "Todas" || c === catFilter).map((cat) => {
        const items = filtered.filter((p) => (p.category || "Sin categoría") === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-2 mb-2.5">
              <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.copper, fontWeight: 700 }}>{cat}</span>
              <div style={{ flex: 1, height: 1, background: T.line }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.inkSoft }}>{items.length}</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((p) => {
                const estado = stockEstado(p);
                const pct = p.stockObjetivo > 0 ? Math.min(100, ((p.stockActual || 0) / p.stockObjetivo) * 100) : ((p.stockActual || 0) > 0 ? 100 : 0);
                const barColor = STOCK_ESTADOS[estado].border;
                return (
                  <Card key={p.id} style={{ padding: 14, borderLeft: `3px solid ${barColor}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 14, color: T.ink }}>{p.name}</div>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.copper }}>{unitCostDisplay(p)}</div>
                      </div>
                      <StockBadge estado={estado} />
                    </div>
                    <div style={{ background: T.paper, borderRadius: 99, height: 5, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 99 }} />
                    </div>
                    <div className="flex justify-between mt-2" style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.inkSoft }}>
                      <span>Stock: <strong style={{ color: T.ink, fontFamily: FONT_MONO }}>{p.stockActual || 0} {p.unit}</strong></span>
                      <span style={{ fontFamily: FONT_MONO }}>Mín {p.stockMinimo || 0} · Med {p.stockIntermedio || 0} · Obj {p.stockObjetivo || 0}</span>
                    </div>
                    <Btn variant="ghost" onClick={() => startEdit(p)} style={{ width: "100%", justifyContent: "center", marginTop: 10, fontSize: 12, padding: "6px 0" }}>
                      <Pencil size={13} /> Ajustar stock
                    </Btn>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <p style={{ fontFamily: FONT_BODY, color: T.inkSoft, textAlign: "center", padding: "40px 0" }}>
          {products.length === 0 ? "Todavía no tienes productos. Añádelos en Productos o sube una factura." : "No hay productos con ese filtro."}
        </p>
      )}

      <Card style={{ padding: 20, marginTop: 24 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, marginBottom: 4 }}>Nota para el pedido</h3>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>Se incluye al final del documento que descargues con "Exportar lista de pedido".</p>
        <textarea
          value={config.notaPedido || ""}
          onChange={(e) => setConfig({ ...config, notaPedido: e.target.value })}
          placeholder="Ej: El proveedor de vinos viene el jueves. Revisar precio de la ginebra…"
          rows={3}
          style={{ ...inputStyle, fontFamily: FONT_BODY, width: "100%", resize: "vertical" }}
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PROVEEDORES TAB                                                     */
/* ------------------------------------------------------------------ */
function ProveedoresTab({ suppliers, setSuppliers, products }) {
  const [draft, setDraft] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const blank = () => ({ id: uid(), name: "", contact: "", phone: "", category: "" });

  const save = () => {
    if (!draft.name.trim()) return;
    setSuppliers((s) => (s.some((x) => x.id === draft.id) ? s.map((x) => (x.id === draft.id ? draft : x)) : [...s, draft]));
    setDraft(null);
  };

  return (
    <div>
      <SectionTitle eyebrow="Agenda" title="Proveedores" right={<Btn variant="copper" onClick={() => setDraft(blank())}><Plus size={16} /> Nuevo proveedor</Btn>} />

      {draft && (
        <Card style={{ padding: 20, marginBottom: 20, borderColor: T.copper }}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nombre"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Categoría"><TextInput value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Bebidas, fruta, carnes…" /></Field>
            <Field label="Persona de contacto"><TextInput value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} /></Field>
            <Field label="Teléfono"><TextInput value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={() => setDraft(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={save}><Check size={15} /> Guardar</Btn>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} style={{ padding: 16 }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.copper, textTransform: "uppercase" }}>{s.category || "Sin categoría"}</div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: T.ink }}>{s.name}</h3>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>{s.contact} {s.phone && `· ${s.phone}`}</p>
                <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                  {products.filter((p) => p.supplierId === s.id).length} productos asociados
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDraft(s)}><Pencil size={15} color={T.inkSoft} /></button>
                <button onClick={() => setDeleteId(s.id)}><Trash2 size={15} color={T.rust} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {suppliers.length === 0 && !draft && <p style={{ fontFamily: FONT_BODY, color: T.inkSoft, textAlign: "center", padding: 40 }}>No hay proveedores todavía.</p>}

      <ConfirmModal open={!!deleteId} title="Eliminar proveedor" body="Los productos asociados quedarán sin proveedor." onCancel={() => setDeleteId(null)} onConfirm={() => { setSuppliers((s) => s.filter((x) => x.id !== deleteId)); setDeleteId(null); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FACTURAS TAB (OCR con Claude)                                       */
/* ------------------------------------------------------------------ */
function FacturasTab({ suppliers, setSuppliers, setProducts, products, invoices, setInvoices, config }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [testing, setTesting] = useState(false);
  const inputRef = useRef(null);
  const existingCategories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")), [products]);

  const onFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setDebugInfo("");
    setPreview(URL.createObjectURL(f));
  };

  // Prueba mínima sin imagen, solo para saber si la conexión con el modelo funciona
  // en este dispositivo. Ayuda a distinguir un problema de la foto de un problema general.
  const testConnection = async () => {
    setTesting(true);
    setError("");
    setDebugInfo("");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: anthropicHeaders(config),
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{ role: "user", content: "Responde solo con la palabra: OK" }],
        }),
      });
      const rawText = await response.text();
      let data;
      try { data = JSON.parse(rawText); } catch (e) { data = null; }
      if (!response.ok || !data || data.type === "error") {
        setError("La prueba de conexión ha fallado. Esto confirma que el problema no es la foto, sino la conexión con el modelo desde este dispositivo.");
        setDebugInfo(`Estado HTTP: ${response.status} ${response.statusText}\nRespuesta cruda:\n${rawText.slice(0, 800)}`);
      } else {
        const text = (data.content || []).map((b) => b.text || "").join("");
        setError("");
        setDebugInfo(`Conexión de texto correcta. Respuesta del modelo: "${text.trim()}"\nEsto indica que el problema está en el envío de la imagen, no en la conexión.`);
        setShowDebug(true);
      }
    } catch (e) {
      setError("La prueba de conexión ha fallado antes de llegar al servidor.");
      setDebugInfo("Error de red: " + e.message);
    } finally {
      setTesting(false);
      setShowDebug(true);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setError("");
    setDebugInfo("");
    try {
      if (!config?.apiKey) throw new Error("Añade tu clave API de Anthropic en Ajustes antes de usar esta función.");
      const { base64, mediaType } = await prepareImageForApi(file);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: anthropicHeaders(config),
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              {
                type: "text",
                text: `Analiza esta factura o albarán de un proveedor de hostelería (bar/restaurante). Responde ÚNICAMENTE con un JSON válido y compacto (sin espacios ni saltos de línea innecesarios), sin texto adicional, sin explicación, sin bloques de código markdown, con esta forma exacta:
{"proveedor":"nombre o cadena vacía","fecha":"YYYY-MM-DD o cadena vacía","ivaPorcentaje":numero,"items":[{"nombre":"...","cantidad":numero,"unidad":"ml|g|unit|l|kg","precioTotal":numero,"categoria":"...","ivaPorcentaje":numero}]}
Reglas: usa "kg" cuando la columna diga "Kgs" o similar, "unit" para artículos que se cuentan por unidades. El campo "precioTotal" es el importe total de esa línea (columna "Importe" o "Total"), SIN IVA, tal como aparece en las líneas de producto. El "ivaPorcentaje" de nivel superior es el tipo general de la factura (normalmente 4, 10 o 21) que veas en el desglose final; si hay varios tipos, usa el que corresponda al mayor importe; si no aparece ningún IVA, pon 0. El "ivaPorcentaje" DENTRO de cada item es el tipo de IVA específico de ESE producto SOLO si la factura distingue tipos distintos por línea o categoría de producto; si no se distingue, pon 0 en ese campo (se usará el general). "categoria" es tu mejor estimación del tipo de producto en una o dos palabras en español (ej. "Bebidas", "Pescados y mariscos", "Carnes", "Fruta y verdura", "Lácteos", "Congelados", "Panadería", "Aceites y condimentos", "Limpieza", "Otros"). Si un dato no aparece en la imagen, usa "" o 0. No inventes datos que no estén en la imagen. Incluye todas las líneas de producto que veas, con nombres cortos.`,
              },
            ],
          }],
        }),
      });
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("El servidor no devolvió JSON válido. Respuesta cruda: " + rawText.slice(0, 300));
      }
      if (!response.ok || data.type === "error") {
        setDebugInfo(`Estado HTTP: ${response.status} ${response.statusText}\nCuerpo de la respuesta:\n${JSON.stringify(data, null, 2).slice(0, 1500)}\nTamaño de la imagen enviada: ${Math.round(base64.length / 1024)} KB (base64), tipo: ${mediaType}`);
        throw new Error(data?.error?.message || `El servicio de lectura respondió con un error (${response.status}).`);
      }
      const text = (data.content || []).map((b) => b.text || "").join("\n");
      if (!text.trim()) throw new Error("La respuesta no incluyó texto para analizar.");
      const parsed = extractJson(text);
      const ivaGeneral = Number(parsed.ivaPorcentaje) > 0 ? Number(parsed.ivaPorcentaje) : (config?.ivaDefecto ?? 10);
      const items = (parsed.items || []).map((it) => ({
        ...it,
        tempId: uid(),
        unidadFinal: it.unidad === "l" ? "ml" : it.unidad === "kg" ? "g" : it.unidad || "unit",
        cantidadFinal: it.unidad === "l" || it.unidad === "kg" ? (it.cantidad || 0) * 1000 : it.cantidad || 0,
        categoria: it.categoria?.trim() || "Sin clasificar",
        iva: Number(it.ivaPorcentaje) > 0 ? Number(it.ivaPorcentaje) : ivaGeneral,
        supplierId: suppliers.find((s) => s.name?.toLowerCase() === (parsed.proveedor || "").toLowerCase())?.id || "",
      }));
      if (items.length === 0) throw new Error("No se detectó ninguna línea de producto en la imagen.");
      setResult({
        proveedor: parsed.proveedor || "",
        fecha: parsed.fecha || "",
        ivaGeneral,
        items,
      });
    } catch (e) {
      setError("No se ha podido leer la factura automáticamente. Puedes introducir los datos a mano en la pestaña Productos, o intentar de nuevo con una foto más nítida. Detalle: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItem = (tempId, field, value) => {
    setResult((r) => ({
      ...r,
      items: r.items.map((it) => (it.tempId === tempId ? { ...it, [field]: ["cantidadFinal", "precioTotal", "iva"].includes(field) ? Number(value) : value } : it)),
    }));
  };

  const setAllIva = (value) => {
    setResult((r) => ({ ...r, items: r.items.map((it) => ({ ...it, iva: Number(value) })) }));
  };

  const removeItem = (tempId) => setResult((r) => ({ ...r, items: r.items.filter((it) => it.tempId !== tempId) }));

  const addToProducts = () => {
    const nameTrimmed = (result.proveedor || "").trim();
    let supplierId = "";
    if (nameTrimmed) {
      const existing = suppliers.find((s) => s.name?.trim().toLowerCase() === nameTrimmed.toLowerCase());
      if (existing) {
        supplierId = existing.id;
      } else {
        // No existe ese proveedor todavía: lo creamos con el nombre detectado en la factura.
        const newSupplier = { id: uid(), name: nameTrimmed, contact: "", phone: "", category: "" };
        setSuppliers((s) => [...s, newSupplier]);
        supplierId = newSupplier.id;
      }
    }

    // Si el producto ya existe para este mismo proveedor (mismo nombre), actualizamos su
    // precio/cantidad de envase con lo último de esta factura en vez de duplicarlo, y
    // sumamos lo comprado a su stock. Si es nuevo, arranca con ese stock inicial.
    setProducts((prev) => {
      const next = [...prev];
      result.items.forEach((it) => {
        const nameKey = (it.nombre || "").trim().toLowerCase();
        const matchIdx = next.findIndex((p) => p.supplierId === supplierId && p.name?.trim().toLowerCase() === nameKey);
        if (matchIdx !== -1) {
          next[matchIdx] = {
            ...next[matchIdx],
            packQuantity: it.cantidadFinal,
            unit: it.unidadFinal,
            packPrice: it.precioTotal,
            stockActual: (next[matchIdx].stockActual || 0) + (it.cantidadFinal || 0),
          };
        } else {
          next.push({
            id: uid(),
            name: it.nombre,
            category: it.categoria || "Sin clasificar",
            supplierId,
            packQuantity: it.cantidadFinal,
            unit: it.unidadFinal,
            packPrice: it.precioTotal,
            stockActual: it.cantidadFinal || 0,
            stockMinimo: 0,
            stockIntermedio: 0,
            stockObjetivo: 0,
          });
        }
      });
      return next;
    });

    // Registra la factura como gasto: cantidad comprada de cada producto y el importe
    // total CON IVA incluido (sumando el IVA propio de cada línea), para poder verlo
    // luego en Gastos por proveedor y periodo.
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(result.fecha || "") ? result.fecha : new Date().toISOString().slice(0, 10);
    const subtotal = result.items.reduce((sum, it) => sum + (Number(it.precioTotal) || 0), 0);
    const ivaAmount = Math.round(result.items.reduce((sum, it) => sum + (Number(it.precioTotal) || 0) * ((Number(it.iva) || 0) / 100), 0) * 100) / 100;
    const total = Math.round((subtotal + ivaAmount) * 100) / 100;
    const ivaPercent = subtotal > 0 ? Math.round((ivaAmount / subtotal) * 1000) / 10 : 0;
    const newInvoice = {
      id: uid(),
      date: validDate,
      supplierId,
      supplierName: nameTrimmed || "Sin proveedor",
      subtotal,
      ivaPercent,
      ivaAmount,
      total,
      items: result.items.map((it) => ({ name: it.nombre, quantity: it.cantidadFinal, unit: it.unidadFinal, price: Number(it.precioTotal) || 0, iva: Number(it.iva) || 0 })),
    };
    setInvoices((inv) => [...inv, newInvoice]);

    setResult(null);
    setFile(null);
    setPreview(null);
  };

  return (
    <div>
      <SectionTitle eyebrow="Lectura automática" title="Facturas" />
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.inkSoft, marginBottom: 14 }}>
          Sube una foto de la factura de un proveedor. La app leerá los productos, cantidades y precios para que
          revises los datos y los añadas al catálogo de productos con un clic.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
          <Btn variant="ghost" onClick={() => inputRef.current.click()}><Upload size={15} /> Elegir foto de la factura</Btn>
          {file && <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: T.inkSoft }}>{file.name}</span>}
          {file && !result && (
            <Btn variant="copper" onClick={analyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="animate-spin" size={15} /> : <Camera size={15} />}
              {analyzing ? "Leyendo factura…" : "Analizar factura"}
            </Btn>
          )}
        </div>
        {preview && (
          <img src={preview} alt="Vista previa de la factura" style={{ maxHeight: 220, marginTop: 14, borderRadius: 8, border: `1px solid ${T.line}` }} />
        )}
        {error && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, marginTop: 12 }}>{error}</p>}

        <div style={{ borderTop: `1px dashed ${T.line}`, marginTop: 16, paddingTop: 14 }}>
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="ghost" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="animate-spin" size={14} /> : <Info size={14} />}
              {testing ? "Probando…" : "Probar conexión (sin foto)"}
            </Btn>
            {debugInfo && (
              <button onClick={() => setShowDebug((v) => !v)} style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.copper, textDecoration: "underline" }}>
                {showDebug ? "Ocultar" : "Ver"} detalle técnico
              </button>
            )}
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 6 }}>
            Este botón envía solo texto, sin imagen, para saber si el problema es la conexión en general o algo concreto de la foto.
          </p>
          {showDebug && debugInfo && (
            <pre style={{
              fontFamily: FONT_MONO, fontSize: 11, color: T.ink, background: T.paperDark,
              border: `1px solid ${T.line}`, borderRadius: 6, padding: 12, marginTop: 10,
              whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 260, overflow: "auto",
            }}>{debugInfo}</pre>
          )}
        </div>
      </Card>

      {result && (
        <Card style={{ padding: 20 }}>
          <div className="flex flex-wrap gap-4 mb-1">
            <Field label="Proveedor detectado">
              <TextInput value={result.proveedor} onChange={(e) => setResult({ ...result, proveedor: e.target.value })} style={{ width: 220 }} />
            </Field>
            <Field label="Fecha">
              <TextInput value={result.fecha} onChange={(e) => setResult({ ...result, fecha: e.target.value })} style={{ width: 150 }} />
            </Field>
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.inkSoft, marginBottom: 14 }}>
            Si este proveedor no está aún en tu lista, se creará automáticamente al añadir los productos. Los productos que ya existan para este proveedor se actualizarán con el precio nuevo (no se duplican) y sumarán esta cantidad a su stock; la factura quedará registrada en Gastos.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft }}>IVA general detectado: {result.ivaGeneral}%</span>
            <Btn variant="ghost" onClick={() => setAllIva(result.ivaGeneral)} style={{ padding: "4px 10px", fontSize: 11.5 }}>Aplicar a todas las líneas</Btn>
          </div>
          <div className="flex flex-col gap-2">
            {result.items.map((it) => (
              <div key={it.tempId} className="flex flex-wrap items-center gap-2 p-2 rounded" style={{ background: T.paper }}>
                <TextInput value={it.nombre} onChange={(e) => updateItem(it.tempId, "nombre", e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                <TextInput value={it.categoria} onChange={(e) => updateItem(it.tempId, "categoria", e.target.value)} list="categorias-existentes" placeholder="Categoría" style={{ width: 130 }} />
                <TextInput type="number" value={it.cantidadFinal} onChange={(e) => updateItem(it.tempId, "cantidadFinal", e.target.value)} style={{ width: 90 }} />
                <Select value={it.unidadFinal} onChange={(e) => updateItem(it.tempId, "unidadFinal", e.target.value)} style={{ width: 90 }}>
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                  <option value="unit">unidad</option>
                </Select>
                <TextInput type="number" step="0.01" value={it.precioTotal} onChange={(e) => updateItem(it.tempId, "precioTotal", e.target.value)} style={{ width: 100 }} title="Precio sin IVA" />
                <div style={{ position: "relative" }}>
                  <TextInput type="number" step="0.5" value={it.iva} onChange={(e) => updateItem(it.tempId, "iva", e.target.value)} style={{ width: 70, paddingRight: 18 }} title="IVA de este producto" />
                  <span style={{ position: "absolute", right: 8, top: 9, fontFamily: FONT_MONO, fontSize: 11, color: T.inkSoft, pointerEvents: "none" }}>%</span>
                </div>
                <button onClick={() => removeItem(it.tempId)}><Trash2 size={15} color={T.rust} /></button>
              </div>
            ))}
            <datalist id="categorias-existentes">
              {existingCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          {result.items.length === 0 && <p style={{ fontFamily: FONT_BODY, color: T.inkSoft }}>No se detectaron artículos. Puedes cerrar esto y meterlos a mano en Productos.</p>}

          {result.items.length > 0 && (() => {
            const subtotal = result.items.reduce((sum, it) => sum + (Number(it.precioTotal) || 0), 0);
            const ivaAmount = result.items.reduce((sum, it) => sum + (Number(it.precioTotal) || 0) * ((Number(it.iva) || 0) / 100), 0);
            const total = subtotal + ivaAmount;
            const ivaEfectivo = subtotal > 0 ? (ivaAmount / subtotal) * 100 : 0;
            return (
              <div style={{ borderTop: `1px dashed ${T.line}`, marginTop: 14, paddingTop: 14 }}>
                <div className="flex flex-wrap items-end gap-4">
                  <Field label="Subtotal (sin IVA)">
                    <div style={{ ...inputStyle, background: T.paperDark, fontWeight: 600, width: 130 }}>{eur(subtotal)}</div>
                  </Field>
                  <Field label="IVA medio efectivo" hint="Calculado a partir del IVA de cada línea">
                    <div style={{ ...inputStyle, background: T.paperDark, width: 90 }}>{ivaEfectivo.toFixed(1)}%</div>
                  </Field>
                  <Field label="Importe IVA">
                    <div style={{ ...inputStyle, background: T.paperDark, width: 110 }}>{eur(ivaAmount)}</div>
                  </Field>
                  <Field label="Total con IVA">
                    <div style={{ ...inputStyle, background: T.paperDark, fontWeight: 700, color: T.copper, width: 130 }}>{eur(total)}</div>
                  </Field>
                </div>
                <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.inkSoft, marginTop: 8 }}>
                  El IVA de cada línea es editable arriba, junto al precio de cada producto. El coste de cada producto en tus escandallos se calcula sin IVA (como es habitual); el IVA solo se aplica al total que verás en Gastos.
                </p>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={() => { setResult(null); setFile(null); setPreview(null); }}>Descartar</Btn>
            {result.items.length > 0 && <Btn variant="primary" onClick={addToProducts}><Check size={15} /> Añadir {result.items.length} productos al catálogo</Btn>}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VENTAS TAB                                                          */
/* ------------------------------------------------------------------ */
function VentasTab({ sales, setSales, recipes, products, setProducts, config }) {
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), recipeId: recipes[0]?.id || "", qty: 1 });

  // ── Importar cierre de caja (foto del arqueo → ventas) ──
  const [showImport, setShowImport] = useState(false);
  const [cajaFile, setCajaFile] = useState(null);
  const [cajaPreview, setCajaPreview] = useState(null);
  const [cajaAnalyzing, setCajaAnalyzing] = useState(false);
  const [cajaError, setCajaError] = useState("");
  const [cajaResult, setCajaResult] = useState(null);
  const cajaInputRef = useRef(null);

  // Intenta emparejar el nombre detectado en el ticket con uno de tus escandallos.
  const bestMatch = (nombre) => {
    const n = (nombre || "").trim().toLowerCase();
    if (!n) return "";
    const exact = recipes.find((r) => r.name.trim().toLowerCase() === n);
    if (exact) return exact.id;
    const partial = recipes.find((r) => {
      const rn = r.name.trim().toLowerCase();
      return n.includes(rn) || rn.includes(n);
    });
    return partial ? partial.id : "";
  };

  const onCajaFile = (f) => {
    if (!f) return;
    setCajaFile(f);
    setCajaResult(null);
    setCajaError("");
    setCajaPreview(URL.createObjectURL(f));
  };

  const analyzeCaja = async () => {
    setCajaAnalyzing(true);
    setCajaError("");
    try {
      if (!config?.apiKey) throw new Error("Añade tu clave API de Anthropic en Ajustes antes de usar esta función.");
      const { base64, mediaType } = await prepareImageForApi(cajaFile);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: anthropicHeaders(config),
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              {
                type: "text",
                text: `Analiza este ticket/recibo de cierre de caja (arqueo) de un bar. Responde ÚNICAMENTE con un JSON válido y compacto, sin texto adicional, sin bloques de código, con esta forma exacta:
{"fecha":"YYYY-MM-DD o cadena vacía","items":[{"nombre":"...","cantidad":numero}]}
"cantidad" es el número de unidades vendidas de ese producto. Si el mismo producto aparece en varias líneas, suma las cantidades en una sola entrada. Si no ves la fecha, usa cadena vacía. No inventes productos que no estén en el ticket.`,
              },
            ],
          }],
        }),
      });
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("El servidor no devolvió JSON válido.");
      }
      if (!response.ok || data.type === "error") {
        throw new Error(data?.error?.message || `El servicio respondió con un error (${response.status}).`);
      }
      const text = (data.content || []).map((b) => b.text || "").join("\n");
      if (!text.trim()) throw new Error("La respuesta no incluyó texto para analizar.");
      const parsed = extractJson(text);
      const items = (parsed.items || []).map((it) => ({
        tempId: uid(),
        nombre: it.nombre,
        cantidad: Number(it.cantidad) || 0,
        recipeId: bestMatch(it.nombre),
      }));
      if (items.length === 0) throw new Error("No se detectó ningún producto vendido en el ticket.");
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha || "") ? parsed.fecha : new Date().toISOString().slice(0, 10);
      setCajaResult({ fecha: validDate, items });
    } catch (e) {
      setCajaError("No se ha podido leer el cierre de caja automáticamente. Puedes registrar las ventas a mano más abajo. Detalle: " + e.message);
    } finally {
      setCajaAnalyzing(false);
    }
  };

  const updateCajaItem = (tempId, field, value) => {
    setCajaResult((r) => ({ ...r, items: r.items.map((it) => (it.tempId === tempId ? { ...it, [field]: field === "cantidad" ? Number(value) : value } : it)) }));
  };
  const removeCajaItem = (tempId) => setCajaResult((r) => ({ ...r, items: r.items.filter((it) => it.tempId !== tempId) }));

  const confirmCaja = () => {
    const toAdd = cajaResult.items.filter((it) => it.recipeId && it.cantidad > 0);
    const newSales = toAdd.map((it) => ({ id: uid(), date: cajaResult.fecha, recipeId: it.recipeId, qty: it.cantidad }));
    setSales((s) => [...s, ...newSales]);
    toAdd.forEach((it) => {
      const recipe = recipes.find((r) => r.id === it.recipeId);
      adjustStockForSale(recipe, it.cantidad, -1, setProducts);
    });
    setCajaResult(null);
    setCajaFile(null);
    setCajaPreview(null);
    setShowImport(false);
  };

  const addSale = () => {
    if (!draft.recipeId || !draft.qty) return;
    const qty = Number(draft.qty);
    const recipe = recipes.find((r) => r.id === draft.recipeId);
    setSales((s) => [...s, { id: uid(), ...draft, qty }]);
    adjustStockForSale(recipe, qty, -1, setProducts);
  };

  const removeSale = (id) => {
    const sale = sales.find((x) => x.id === id);
    if (sale) {
      const recipe = recipes.find((r) => r.id === sale.recipeId);
      adjustStockForSale(recipe, sale.qty, 1, setProducts);
    }
    setSales((s) => s.filter((x) => x.id !== id));
  };

  const byProduct = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const r = recipes.find((x) => x.id === s.recipeId);
      if (!r) return;
      map[r.name] = map[r.name] || { name: r.name, unidades: 0, ingresos: 0 };
      map[r.name].unidades += s.qty;
      map[r.name].ingresos += s.qty * r.pvp;
    });
    return Object.values(map).sort((a, b) => b.ingresos - a.ingresos);
  }, [sales, recipes]);

  const byDate = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const r = recipes.find((x) => x.id === s.recipeId);
      if (!r) return;
      map[s.date] = map[s.date] || { date: s.date, ingresos: 0 };
      map[s.date].ingresos += s.qty * r.pvp;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales, recipes]);

  const recent = [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  return (
    <div>
      <SectionTitle
        eyebrow="Registro diario"
        title="Ventas"
        right={<Btn variant="ghost" onClick={() => setShowImport((v) => !v)}><Camera size={15} /> {showImport ? "Ocultar" : "Importar cierre de caja"}</Btn>}
      />

      {showImport && (
        <Card style={{ padding: 20, marginBottom: 20, borderColor: T.copper }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, marginBottom: 4 }}>Importar cierre de caja</h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            Sube una foto del ticket de arqueo/cierre de caja. La app detectará los productos vendidos y las cantidades, y los emparejará con tus escandallos para que los revises antes de añadirlos.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={cajaInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onCajaFile(e.target.files[0])} />
            <Btn variant="ghost" onClick={() => cajaInputRef.current.click()}><Upload size={15} /> Elegir foto del cierre</Btn>
            {cajaFile && <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: T.inkSoft }}>{cajaFile.name}</span>}
            {cajaFile && !cajaResult && (
              <Btn variant="copper" onClick={analyzeCaja} disabled={cajaAnalyzing}>
                {cajaAnalyzing ? <Loader2 className="animate-spin" size={15} /> : <Camera size={15} />}
                {cajaAnalyzing ? "Leyendo cierre…" : "Analizar cierre de caja"}
              </Btn>
            )}
          </div>
          {cajaPreview && <img src={cajaPreview} alt="Vista previa del cierre de caja" style={{ maxHeight: 200, marginTop: 12, borderRadius: 8, border: `1px solid ${T.line}` }} />}
          {cajaError && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, marginTop: 12 }}>{cajaError}</p>}

          {cajaResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ borderTop: `1px dashed ${T.line}`, paddingTop: 14, marginBottom: 10 }}>
                <Field label="Fecha de estas ventas">
                  <TextInput type="date" value={cajaResult.fecha} onChange={(e) => setCajaResult({ ...cajaResult, fecha: e.target.value })} style={{ width: 170 }} />
                </Field>
              </div>
              <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
                Asigna cada producto detectado a un escandallo. Los que dejes en "— Ignorar —" no se añadirán.
              </p>
              <div className="flex flex-col gap-2">
                {cajaResult.items.map((it) => (
                  <div key={it.tempId} className="flex flex-wrap items-center gap-2 p-2 rounded" style={{ background: !it.recipeId ? "#F6E4DF" : T.paper }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, flex: 1, minWidth: 130 }}>{it.nombre}</span>
                    <TextInput type="number" value={it.cantidad} onChange={(e) => updateCajaItem(it.tempId, "cantidad", e.target.value)} style={{ width: 80 }} />
                    <Select value={it.recipeId} onChange={(e) => updateCajaItem(it.tempId, "recipeId", e.target.value)} style={{ minWidth: 180 }}>
                      <option value="">— Ignorar —</option>
                      {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                    <button onClick={() => removeCajaItem(it.tempId)}><Trash2 size={15} color={T.rust} /></button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Btn variant="ghost" onClick={() => { setCajaResult(null); setCajaFile(null); setCajaPreview(null); }}>Descartar</Btn>
                <Btn variant="primary" onClick={confirmCaja}>
                  <Check size={15} /> Añadir {cajaResult.items.filter((it) => it.recipeId && it.cantidad > 0).length} ventas
                </Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Fecha"><TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="Producto vendido">
            <Select value={draft.recipeId} onChange={(e) => setDraft({ ...draft, recipeId: e.target.value })} style={{ minWidth: 180 }}>
              {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Unidades"><TextInput type="number" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} style={{ width: 90 }} /></Field>
          <Btn variant="copper" onClick={addSale}><Plus size={15} /> Registrar venta</Btn>
        </div>
        {recipes.length === 0 && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.rust, marginTop: 10 }}>Crea antes algún escandallo para poder registrar ventas.</p>}
        <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 10 }}>Cada venta descuenta automáticamente el stock de los ingredientes usados (lo verás en Inventario).</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card style={{ padding: 16 }}>
          <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, marginBottom: 10, color: T.ink }}>Ingresos por día</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={byDate}>
              <CartesianGrid stroke={T.line} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <YAxis tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <Tooltip formatter={(v) => eur(v)} />
              <Line type="monotone" dataKey="ingresos" stroke={T.copper} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 16 }}>
          <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, marginBottom: 10, color: T.ink }}>Productos más vendidos</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byProduct}>
              <CartesianGrid stroke={T.line} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <YAxis tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <Tooltip formatter={(v) => eur(v)} />
              <Bar dataKey="ingresos" fill={T.bottle} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bottle }}>
              {["Fecha", "Producto", "Unidades", "Ingresos", ""].map((h) => (
                <th key={h} style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.paper, textTransform: "uppercase", textAlign: "left", padding: "10px 14px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((s, i) => {
              const r = recipes.find((x) => x.id === s.recipeId);
              return (
                <tr key={s.id} style={{ background: i % 2 ? T.paper : T.white, borderBottom: `1px solid ${T.line}` }}>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{s.date}</td>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_BODY, fontSize: 13 }}>{r?.name || "—"}</td>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{s.qty}</td>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{eur((r?.pvp || 0) * s.qty)}</td>
                  <td style={{ padding: "8px 14px" }}><button onClick={() => removeSale(s.id)}><Trash2 size={14} color={T.rust} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sales.length === 0 && <p style={{ padding: 20, textAlign: "center", fontFamily: FONT_BODY, color: T.inkSoft }}>Todavía no hay ventas registradas.</p>}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  INFORMES TAB                                                        */
/* ------------------------------------------------------------------ */
function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function InformesTab({ sales, recipes, products, config }) {
  const [period, setPeriod] = useState("diario");
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0, 10));

  const range = useMemo(() => {
    const d = new Date(refDate);
    if (period === "diario") return { start: d, end: d, label: refDate };
    if (period === "semanal") {
      const start = startOfWeek(d);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end, label: `Semana del ${start.toLocaleDateString("es-ES")} al ${end.toLocaleDateString("es-ES")}` };
    }
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start, end, label: start.toLocaleDateString("es-ES", { month: "long", year: "numeric" }) };
  }, [period, refDate]);

  const inRange = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(12);
    const s = new Date(range.start); s.setHours(0);
    const e = new Date(range.end); e.setHours(23, 59);
    return d >= s && d <= e;
  };

  const filtered = sales.filter((s) => inRange(s.date));

  const rows = useMemo(() => {
    const map = {};
    filtered.forEach((s) => {
      const r = recipes.find((x) => x.id === s.recipeId);
      if (!r) return;
      const cost = recipeCost(r, products, config.mermas) * s.qty;
      const revenue = r.pvp * s.qty;
      map[r.id] = map[r.id] || { name: r.name, unidades: 0, ingresos: 0, coste: 0 };
      map[r.id].unidades += s.qty;
      map[r.id].ingresos += revenue;
      map[r.id].coste += cost;
    });
    return Object.values(map);
  }, [filtered, recipes, products, config]);

  const totals = rows.reduce((a, r) => ({ ingresos: a.ingresos + r.ingresos, coste: a.coste + r.coste, unidades: a.unidades + r.unidades }), { ingresos: 0, coste: 0, unidades: 0 });
  const margin = totals.ingresos - totals.coste;
  const marginPct = totals.ingresos ? (margin / totals.ingresos) * 100 : 0;

  const exportExcel = () => {
    const wsData = [
      [`Informe ${period} — ${config.barName}`],
      [range.label],
      [],
      ["Producto", "Unidades", "Ingresos (€)", "Coste (€)", "Margen (€)"],
      ...rows.map((r) => [r.name, r.unidades, r.ingresos.toFixed(2), r.coste.toFixed(2), (r.ingresos - r.coste).toFixed(2)]),
      [],
      ["TOTAL", totals.unidades, totals.ingresos.toFixed(2), totals.coste.toFixed(2), margin.toFixed(2)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Informe");
    XLSX.writeFile(wb, `informe-${period}-${refDate}.xlsx`);
  };

  const exportPdf = () => {
    const colors = { ...DEFAULT_PALETTE, ...(config.colors || {}) };
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.barName} — Informe ${period}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:${colors.paper};color:${colors.ink};padding:32px 20px 60px}
  .page{max-width:720px;margin:0 auto}
  .hd{border-bottom:2px solid ${colors.ink};padding-bottom:14px;margin-bottom:20px}
  .brand{font-family:'Fraunces',serif;font-size:26px;font-weight:700}
  .sub{font-family:'IBM Plex Mono',monospace;font-size:12px;color:${colors.inkSoft};text-transform:capitalize;margin-top:4px}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .stat b{display:block;font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700}
  .stat span{font-size:11px;color:${colors.inkSoft};text-transform:uppercase}
  table{width:100%;border-collapse:collapse;background:${colors.white}}
  th{text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid ${colors.ink}}
  td{padding:7px 10px;font-size:13px;border-bottom:1px dashed ${colors.line}}
  tfoot td{font-weight:700;border-top:2px solid ${colors.ink};border-bottom:none}
  .num{font-family:'IBM Plex Mono',monospace;font-size:12.5px}
  .foot{text-align:center;margin-top:26px;font-size:11px;color:${colors.inkSoft}}
  @media print { body{background:#fff} }
</style></head><body><div class="page">
  <div class="hd">
    <div class="brand">${config.barName}</div>
    <div class="sub">Informe ${period} · ${range.label}</div>
  </div>
  <div class="stats">
    <div class="stat"><b>${eur(totals.ingresos)}</b><span>Ingresos</span></div>
    <div class="stat"><b>${eur(totals.coste)}</b><span>Coste</span></div>
    <div class="stat"><b style="color:${colors.sage}">${eur(margin)} (${pct(marginPct)})</b><span>Margen</span></div>
  </div>
  <table>
    <thead><tr><th>Producto</th><th>Uds.</th><th>Ingresos</th><th>Coste</th><th>Margen</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td>${r.name}</td><td class="num">${r.unidades}</td><td class="num">${eur(r.ingresos)}</td><td class="num">${eur(r.coste)}</td><td class="num">${eur(r.ingresos - r.coste)}</td></tr>`).join("")}
    </tbody>
    <tfoot><tr><td>TOTAL</td><td class="num">${totals.unidades}</td><td class="num">${eur(totals.ingresos)}</td><td class="num">${eur(totals.coste)}</td><td class="num">${eur(margin)}</td></tr></tfoot>
  </table>
  ${rows.length === 0 ? `<p style="text-align:center;color:${colors.inkSoft};padding:20px 0">No hay ventas registradas en este periodo.</p>` : ""}
  <div class="foot">${config.barName} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
</div></body></html>`;
    downloadBlob(html, `informe-${period}-${refDate}.html`, "text/html;charset=utf-8");
  };

  return (
    <div>
      <SectionTitle eyebrow="Descargas" title="Informes" />

      <Card style={{ padding: 20, marginBottom: 20 }} className="no-print">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Periodo">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
            </Select>
          </Field>
          <Field label="Fecha de referencia"><TextInput type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} /></Field>
          <Btn variant="ghost" onClick={exportExcel}><FileDown size={15} /> Descargar Excel</Btn>
          <Btn variant="copper" onClick={exportPdf}><FileDown size={15} /> Descargar informe (PDF)</Btn>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 10 }}>
          <Info size={12} style={{ display: "inline", marginRight: 4 }} />
          Se descarga como archivo HTML con buen formato; ábrelo y usa "Imprimir → Guardar como PDF" desde tu navegador si necesitas el PDF.
        </p>
      </Card>

      <Card style={{ padding: 24 }} className="print-area">
        <div style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 12, marginBottom: 16 }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 24 }}>{config.barName}</h3>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkSoft, textTransform: "capitalize" }}>Informe {period} · {range.label}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div><div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>{eur(totals.ingresos)}</div><div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft, textTransform: "uppercase" }}>Ingresos</div></div>
          <div><div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>{eur(totals.coste)}</div><div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft, textTransform: "uppercase" }}>Coste</div></div>
          <div><div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600, color: T.sage }}>{eur(margin)} ({pct(marginPct)})</div><div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft, textTransform: "uppercase" }}>Margen</div></div>
        </div>

        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${T.ink}` }}>
              {["Producto", "Uds.", "Ingresos", "Coste", "Margen"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontFamily: FONT_BODY, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} style={{ borderBottom: `1px dashed ${T.line}` }}>
                <td style={{ padding: "6px 8px", fontFamily: FONT_BODY, fontSize: 13 }}>{r.name}</td>
                <td style={{ padding: "6px 8px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{r.unidades}</td>
                <td style={{ padding: "6px 8px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{eur(r.ingresos)}</td>
                <td style={{ padding: "6px 8px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{eur(r.coste)}</td>
                <td style={{ padding: "6px 8px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{eur(r.ingresos - r.coste)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ fontFamily: FONT_BODY, color: T.inkSoft, padding: "20px 0", textAlign: "center" }}>No hay ventas registradas en este periodo.</p>}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GASTOS TAB (facturas de compra: cantidades y gasto por proveedor)   */
/* ------------------------------------------------------------------ */
function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1);
}

function GastosTab({ invoices, setInvoices, suppliers, config }) {
  const [period, setPeriod] = useState("mensual");
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0, 10));
  const [deleteId, setDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const range = useMemo(() => {
    const d = new Date(refDate);
    if (period === "diario") return { start: d, end: d, label: refDate };
    if (period === "semanal") {
      const start = startOfWeek(d);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end, label: `Semana del ${start.toLocaleDateString("es-ES")} al ${end.toLocaleDateString("es-ES")}` };
    }
    if (period === "mensual") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start, end, label: start.toLocaleDateString("es-ES", { month: "long", year: "numeric" }) };
    }
    const start = startOfYear(d);
    const end = new Date(d.getFullYear(), 11, 31);
    return { start, end, label: `Año ${d.getFullYear()}` };
  }, [period, refDate]);

  const inRange = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(12);
    const s = new Date(range.start); s.setHours(0);
    const e = new Date(range.end); e.setHours(23, 59);
    return d >= s && d <= e;
  };

  const filtered = useMemo(() => invoices.filter((i) => inRange(i.date)).sort((a, b) => b.date.localeCompare(a.date)), [invoices, range]);

  const totalPeriodo = filtered.reduce((sum, i) => sum + (i.total || 0), 0);

  const bySupplier = useMemo(() => {
    const map = {};
    filtered.forEach((i) => {
      const key = i.supplierId || i.supplierName;
      map[key] = map[key] || { name: i.supplierName, total: 0, facturas: 0 };
      map[key].total += i.total || 0;
      map[key].facturas += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Serie temporal dentro del rango para el gráfico (agrupada por día).
  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach((i) => {
      map[i.date] = (map[i.date] || 0) + (i.total || 0);
    });
    return Object.entries(map).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // Totales generales (todo el histórico) por proveedor, para la vista de conjunto.
  const totalGeneralPorProveedor = useMemo(() => {
    const map = {};
    invoices.forEach((i) => {
      const key = i.supplierId || i.supplierName;
      map[key] = map[key] || { name: i.supplierName, total: 0 };
      map[key].total += i.total || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const exportExcel = () => {
    const wsData = [
      [`Gastos ${period} — ${config.barName}`],
      [range.label],
      [],
      ["Fecha", "Proveedor", "Nº líneas", "Subtotal (€)", "IVA (%)", "Importe IVA (€)", "Total (€)"],
      ...filtered.map((i) => [
        i.date, i.supplierName, i.items.length,
        (i.subtotal ?? i.total).toFixed(2),
        i.ivaPercent ?? 0,
        (i.ivaAmount ?? 0).toFixed(2),
        i.total.toFixed(2),
      ]),
      [],
      ["TOTAL", "", "", "", "", "", totalPeriodo.toFixed(2)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, `gastos-${period}-${refDate}.xlsx`);
  };

  const exportPdf = () => {
    const colors = { ...DEFAULT_PALETTE, ...(config.colors || {}) };
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.barName} — Gastos ${period}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:${colors.paper};color:${colors.ink};padding:32px 20px 60px}
  .page{max-width:720px;margin:0 auto}
  .hd{border-bottom:2px solid ${colors.ink};padding-bottom:14px;margin-bottom:20px}
  .brand{font-family:'Fraunces',serif;font-size:26px;font-weight:700}
  .sub{font-family:'IBM Plex Mono',monospace;font-size:12px;color:${colors.inkSoft};text-transform:capitalize;margin-top:4px}
  .stat{margin-bottom:24px}
  .stat b{display:block;font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:700}
  .stat span{font-size:11px;color:${colors.inkSoft};text-transform:uppercase}
  table{width:100%;border-collapse:collapse;background:${colors.white}}
  th{text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid ${colors.ink}}
  td{padding:7px 10px;font-size:13px;border-bottom:1px dashed ${colors.line}}
  tfoot td{font-weight:700;border-top:2px solid ${colors.ink};border-bottom:none}
  .num{font-family:'IBM Plex Mono',monospace;font-size:12.5px}
  .foot{text-align:center;margin-top:26px;font-size:11px;color:${colors.inkSoft}}
  @media print { body{background:#fff} }
</style></head><body><div class="page">
  <div class="hd">
    <div class="brand">${config.barName}</div>
    <div class="sub">Gastos ${period} · ${range.label}</div>
  </div>
  <div class="stat"><b>${eur(totalPeriodo)}</b><span>${filtered.length} factura${filtered.length !== 1 ? "s" : ""} en este periodo</span></div>
  <table>
    <thead><tr><th>Fecha</th><th>Proveedor</th><th>Líneas</th><th>Subtotal</th><th>IVA</th><th>Total</th></tr></thead>
    <tbody>
      ${filtered.map((i) => `<tr><td class="num">${i.date}</td><td>${i.supplierName}</td><td class="num">${i.items.length}</td><td class="num">${eur(i.subtotal ?? i.total)}</td><td class="num">${eur(i.ivaAmount ?? 0)}</td><td class="num">${eur(i.total)}</td></tr>`).join("")}
    </tbody>
    <tfoot><tr><td colspan="5">TOTAL</td><td class="num">${eur(totalPeriodo)}</td></tr></tfoot>
  </table>
  ${filtered.length === 0 ? `<p style="text-align:center;color:${colors.inkSoft};padding:20px 0">No hay facturas registradas en este periodo.</p>` : ""}
  <div class="foot">${config.barName} · Generado el ${new Date().toLocaleDateString("es-ES")}</div>
</div></body></html>`;
    downloadBlob(html, `gastos-${period}-${refDate}.html`, "text/html;charset=utf-8");
  };

  return (
    <div>
      <SectionTitle eyebrow="Compras y proveedores" title="Gastos" />

      <Card style={{ padding: 20, marginBottom: 20 }} className="no-print">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Periodo">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </Select>
          </Field>
          <Field label="Fecha de referencia"><TextInput type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} /></Field>
          <Btn variant="ghost" onClick={exportExcel}><FileDown size={15} /> Descargar Excel</Btn>
          <Btn variant="copper" onClick={exportPdf}><FileDown size={15} /> Descargar informe (PDF)</Btn>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 10 }}>
          <Info size={12} style={{ display: "inline", marginRight: 4 }} />
          Se descarga como archivo HTML con buen formato; ábrelo y usa "Imprimir → Guardar como PDF" desde tu navegador si necesitas el PDF.
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.copper, textTransform: "uppercase", letterSpacing: "0.08em" }}>{period} · {range.label}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.ink, marginTop: 4 }}>{eur(totalPeriodo)}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft }}>{filtered.length} factura{filtered.length !== 1 ? "s" : ""} en este periodo</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={byDate}>
              <CartesianGrid stroke={T.line} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <YAxis tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <Tooltip formatter={(v) => eur(v)} />
              <Line type="monotone" dataKey="total" stroke={T.copper} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 20 }}>
          <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, marginBottom: 10, color: T.ink }}>Gasto por proveedor (este periodo)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySupplier} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke={T.line} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10, fontFamily: FONT_MONO }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontFamily: FONT_BODY }} />
              <Tooltip formatter={(v) => eur(v)} />
              <Bar dataKey="total" fill={T.bottle} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {bySupplier.length === 0 && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft, textAlign: "center", padding: 20 }}>Sin gastos en este periodo.</p>}
        </Card>
      </div>

      <Card style={{ padding: 20, marginBottom: 24 }}>
        <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, marginBottom: 10, color: T.ink }}>Total histórico por proveedor</h4>
        <div className="flex flex-col gap-2">
          {totalGeneralPorProveedor.map((s) => (
            <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: T.paper }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{s.name}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13.5, color: T.copper }}>{eur(s.total)}</span>
            </div>
          ))}
          {totalGeneralPorProveedor.length === 0 && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>Todavía no hay facturas registradas. Analiza una factura en la pestaña Facturas y aparecerá aquí.</p>}
        </div>
      </Card>

      <Card>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bottle }}>
              {["Fecha", "Proveedor", "Líneas", "Importe", ""].map((h) => (
                <th key={h} style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.paper, textTransform: "uppercase", textAlign: "left", padding: "10px 14px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i, idx) => (
              <React.Fragment key={i.id}>
                <tr
                  style={{ background: idx % 2 ? T.paper : T.white, borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}
                  onClick={() => setExpandedId(expandedId === i.id ? null : i.id)}
                >
                  <td style={{ padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{i.date}</td>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_BODY, fontSize: 13 }}>{i.supplierName}</td>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{i.items.length}</td>
                  <td style={{ padding: "8px 14px", fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 600 }}>{eur(i.total)}</td>
                  <td style={{ padding: "8px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setDeleteId(i.id)}><Trash2 size={14} color={T.rust} /></button>
                  </td>
                </tr>
                {expandedId === i.id && (
                  <tr style={{ background: T.paperDark }}>
                    <td colSpan={5} style={{ padding: "10px 14px" }}>
                      <div className="flex flex-col gap-1">
                        {i.items.map((it, k) => (
                          <div key={k} className="flex justify-between" style={{ fontFamily: FONT_MONO, fontSize: 12 }}>
                            <span>{it.name} — {it.quantity} {it.unit} {it.iva != null ? `(IVA ${it.iva}%)` : ""}</span>
                            <span>{eur(it.price)}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: `1px dashed ${T.line}`, marginTop: 6, paddingTop: 6 }}>
                          <div className="flex justify-between" style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkSoft }}>
                            <span>Subtotal</span><span>{eur(i.subtotal ?? i.total)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.inkSoft }}>
                          <span>IVA ({i.ivaPercent ?? 0}%)</span><span>{eur(i.ivaAmount ?? 0)}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: T.ink }}>
                          <span>Total</span><span>{eur(i.total)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ padding: 20, textAlign: "center", fontFamily: FONT_BODY, color: T.inkSoft }}>No hay facturas registradas en este periodo.</p>}
      </Card>

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar factura registrada"
        body="Se eliminará este registro de gasto. Los productos que ya se añadieron al catálogo no se verán afectados."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { setInvoices((inv) => inv.filter((x) => x.id !== deleteId)); setDeleteId(null); }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CONSEJOS TAB                                                        */
/* ------------------------------------------------------------------ */
function ConsejosTab({ config }) {
  const items = [
    { t: "¿Qué es un escandallo?", d: "Es la ficha de coste de cada producto que vendes. Desglosa cuánto cuesta prepararlo para saber el margen real y fijar bien el precio de venta." },
    { t: "Cantidad exacta", d: "Anota siempre la cantidad exacta de cada ingrediente (ml, g o unidades). Los escandallos aproximados dan precios equivocados." },
    { t: "Coste por ración", d: "Coste del ingrediente = precio de compra del envase ÷ cantidad del envase × cantidad usada. Ej: ginebra de 700 ml a 18€, dosis de 50 ml → 18/700×50 = 1,29 €." },
    { t: "No olvides las guarniciones", d: "Hielo, limón, decoración y pajitas también cuestan dinero y se olvidan fácilmente al calcular." },
    { t: "Mermas", d: "Aplica un % de mermas (hielo que se derrite, derrames, producto caducado). Suele rondar el 3-5%. En esta app puedes ajustarlo en Ajustes." },
    { t: "Objetivo de coste", d: "En bebidas suele buscarse un coste del 15-20% sobre el PVP; en coctelería, 20-25%; en raciones y tapas, alrededor del 28-32%; en platos y menús, 30-35% (llevan más elaboración y mano de obra). Son valores orientativos y los tienes editables en Ajustes." },
    { t: "Revisa precios a menudo", d: "Actualiza los escandallos cada vez que cambien los precios de compra, al menos una vez al trimestre." },
    { t: "Precios psicológicos", d: "Redondea el PVP a cifras como 8,90 € en vez de 8,73 €, pero comprueba después que el margen siga siendo el que necesitas." },
    { t: "Compara con el sector", d: "Usa los porcentajes objetivo como referencia, pero ajusta según tu ubicación, tipo de clientela y competencia." },
  ];
  return (
    <div>
      <SectionTitle eyebrow="Guía rápida" title="Consejos e instrucciones" />
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 8 }}>Porcentajes objetivo actuales de {config.barName}</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(config.percentages).map(([k, v]) => (
            <div key={k} style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 20, fontWeight: 600, color: T.copper }}>{v}%</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft, textTransform: "capitalize" }}>{k}</div>
            </div>
          ))}
          <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 20, fontWeight: 600, color: T.rust }}>{config.mermas}%</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.inkSoft }}>mermas</div>
          </div>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginTop: 10 }}>Puedes cambiar estos valores en la pestaña Ajustes.</p>
      </Card>

      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <Card key={i} style={{ padding: 16 }}>
            <div className="flex gap-3">
              <span style={{ fontFamily: FONT_MONO, color: T.copper, fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16.5, color: T.ink, marginBottom: 2 }}>{it.t}</h4>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.inkSoft }}>{it.d}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AJUSTES TAB                                                         */
/* ------------------------------------------------------------------ */
function AjustesTab({ config, setConfig, onResetClick, storageOk, onExport, onImport, backupMsg, currentRole }) {
  const [local, setLocal] = useState(config);
  useEffect(() => setLocal(config), [config]);
  const importRef = useRef(null);
  const isOwner = currentRole === "dueño";

  const save = () => setConfig(local);

  const setColor = (key, value) => setLocal((l) => ({ ...l, colors: { ...l.colors, [key]: value } }));
  const applyPreset = (preset) => setLocal((l) => ({ ...l, colors: { ...preset.colors } }));
  const resetPalette = () => setLocal((l) => ({ ...l, colors: { ...DEFAULT_PALETTE } }));

  // ── Gestión de usuarios (solo Dueño) ──
  const [userDraft, setUserDraft] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const blankUser = () => ({ id: uid(), name: "", role: "camarero", pin: "" });
  const saveUser = () => {
    if (!userDraft.name.trim() || userDraft.pin.length !== 4) return;
    setConfig((c) => {
      const users = c.users || [];
      const exists = users.some((u) => u.id === userDraft.id);
      return { ...c, users: exists ? users.map((u) => (u.id === userDraft.id ? userDraft : u)) : [...users, userDraft] };
    });
    setUserDraft(null);
  };
  const removeUser = (id) => {
    setConfig((c) => ({
      ...c,
      users: (c.users || []).filter((u) => u.id !== id),
      activeUserId: c.activeUserId === id ? "" : c.activeUserId,
    }));
    setDeleteUserId(null);
  };

  return (
    <div>
      <SectionTitle eyebrow="Configuración" title="Ajustes" />

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 12 }}>Datos del negocio</h3>
        <Field label="Nombre del bar" hint="Aparece en la cabecera y en los informes descargables.">
          <TextInput value={local.barName} onChange={(e) => setLocal({ ...local, barName: e.target.value })} style={{ maxWidth: 320 }} />
        </Field>
      </Card>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>Clave API de Anthropic</h3>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 10 }}>
          Necesaria para las funciones de IA: lectura de facturas, cierre de caja y creación de escandallos desde imagen/PDF. Consíguela gratis en <strong>console.anthropic.com</strong> (Configuración → API Keys) y añade saldo de pago según uso. Se guarda solo en este dispositivo.
        </p>
        <Field label="Clave API (empieza por sk-ant-...)">
          <TextInput type="password" value={local.apiKey} onChange={(e) => setLocal({ ...local, apiKey: e.target.value })} placeholder="sk-ant-api03-…" style={{ maxWidth: 420, fontFamily: FONT_MONO }} />
        </Field>
      </Card>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>Porcentajes objetivo de coste</h3>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 12 }}>Se usan para calcular el PVP sugerido y avisarte si un escandallo se pasa del objetivo.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Bebidas (%)"><TextInput type="number" value={local.percentages.bebida} onChange={(e) => setLocal({ ...local, percentages: { ...local.percentages, bebida: Number(e.target.value) } })} /></Field>
          <Field label="Coctelería (%)"><TextInput type="number" value={local.percentages.cocteleria} onChange={(e) => setLocal({ ...local, percentages: { ...local.percentages, cocteleria: Number(e.target.value) } })} /></Field>
          <Field label="Raciones / tapas (%)"><TextInput type="number" value={local.percentages.raciones} onChange={(e) => setLocal({ ...local, percentages: { ...local.percentages, raciones: Number(e.target.value) } })} /></Field>
          <Field label="Platos / menús (%)"><TextInput type="number" value={local.percentages.platos} onChange={(e) => setLocal({ ...local, percentages: { ...local.percentages, platos: Number(e.target.value) } })} /></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Field label="Mermas (%)" hint="Se aplica sobre el coste de cada escandallo (derrames, hielo derretido, roturas…).">
            <TextInput type="number" value={local.mermas} onChange={(e) => setLocal({ ...local, mermas: Number(e.target.value) })} style={{ maxWidth: 140 }} />
          </Field>
          <Field label="IVA por defecto (%)" hint="Se usa al leer una factura si no se detecta el IVA en la imagen.">
            <TextInput type="number" value={local.ivaDefecto} onChange={(e) => setLocal({ ...local, ivaDefecto: Number(e.target.value) })} style={{ maxWidth: 140 }} />
          </Field>
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>Paleta de colores</h3>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
          Elige un ambiente ya montado o toca cada color para personalizarlo. Los cambios se ven en la vista previa al momento; pulsa "Guardar ajustes" para aplicarlos a toda la app.
        </p>

        <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
          Ambientes predefinidos
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {PALETTE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 px-3 py-2 rounded-md"
              style={{ border: `1px solid ${T.line}`, background: T.paper, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: T.ink }}
            >
              <span className="flex" style={{ gap: 2 }}>
                {["bottle", "copper", "sage", "rust"].map((k) => (
                  <span key={k} style={{ width: 12, height: 12, borderRadius: "50%", background: preset.colors[k], border: "1px solid rgba(0,0,0,0.15)" }} />
                ))}
              </span>
              {preset.name}
            </button>
          ))}
        </div>

        <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
          Colores individuales
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.keys(DEFAULT_PALETTE).map((key) => (
            <div key={key} className="flex items-center gap-3 p-2 rounded-md" style={{ border: `1px solid ${T.line}`, background: T.paper }}>
              <input
                type="color"
                value={local.colors?.[key] || DEFAULT_PALETTE[key]}
                onChange={(e) => setColor(key, e.target.value)}
                style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: T.ink }}>{PALETTE_LABELS[key]}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.inkSoft, textTransform: "uppercase" }}>{local.colors?.[key] || DEFAULT_PALETTE[key]}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Btn variant="ghost" onClick={resetPalette}><RotateCcw size={14} /> Restaurar paleta de fábrica</Btn>
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 20, borderColor: storageOk ? T.line : T.rust }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>Copia de seguridad</h3>
        {storageOk ? (
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            La app guarda los cambios automáticamente en este dispositivo. Aun así, es buena idea descargar una copia de vez en cuando por si acaso.
          </p>
        ) : (
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.rust, marginBottom: 14, fontWeight: 600 }}>
            ⚠ El guardado automático no está funcionando en este dispositivo. Descarga una copia de seguridad antes de cerrar la app, y vuelve a importarla la próxima vez que la abras para no perder tu trabajo.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Btn variant="copper" onClick={onExport}><FileDown size={15} /> Exportar copia de seguridad</Btn>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { if (e.target.files[0]) onImport(e.target.files[0]); e.target.value = ""; }} />
          <Btn variant="ghost" onClick={() => importRef.current.click()}><Upload size={15} /> Importar copia de seguridad</Btn>
        </div>
        {backupMsg && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ink, marginTop: 10 }}>{backupMsg}</p>}
        <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.inkSoft, marginTop: 10 }}>
          El archivo exportado incluye el nombre del bar, los porcentajes, la paleta de colores, productos, escandallos, proveedores y ventas.
        </p>
      </Card>

      {isOwner && (
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4 }}>Usuarios</h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            Crea un usuario por persona con un PIN de 4 dígitos. Sirve para que cada uno, al entrar con su PIN desde el botón de arriba a la derecha, vea solo lo que le corresponde: <strong>Dueño/a</strong> y <strong>Encargado/a</strong> ven toda la app; <strong>Camarero/a</strong> solo ve Ventas, Inventario y Consejos. Esto organiza el acceso, pero no es una contraseña de seguridad real: todo sigue guardado en este mismo dispositivo.
          </p>

          {userDraft && (
            <div className="flex flex-wrap items-end gap-3 p-3 rounded-md mb-3" style={{ background: T.paper }}>
              <Field label="Nombre"><TextInput value={userDraft.name} onChange={(e) => setUserDraft({ ...userDraft, name: e.target.value })} style={{ width: 160 }} /></Field>
              <Field label="Rol">
                <Select value={userDraft.role} onChange={(e) => setUserDraft({ ...userDraft, role: e.target.value })} style={{ width: 150 }}>
                  {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
                </Select>
              </Field>
              <Field label="PIN (4 dígitos)">
                <TextInput
                  type="password" inputMode="numeric" maxLength={4} value={userDraft.pin}
                  onChange={(e) => setUserDraft({ ...userDraft, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  style={{ width: 100, textAlign: "center", letterSpacing: "0.3em" }}
                />
              </Field>
              <Btn variant="ghost" onClick={() => setUserDraft(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveUser} disabled={!userDraft.name.trim() || userDraft.pin.length !== 4}><Check size={15} /> Guardar</Btn>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-3">
            {(config.users || []).map((u) => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-md" style={{ background: T.paper }}>
                <div>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{u.name}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: T.copper, textTransform: "uppercase", marginLeft: 8 }}>{ROLES[u.role]?.label}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setUserDraft(u)}><Pencil size={15} color={T.inkSoft} /></button>
                  <button onClick={() => setDeleteUserId(u.id)}><Trash2 size={15} color={T.rust} /></button>
                </div>
              </div>
            ))}
            {(config.users || []).length === 0 && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>Todavía no has creado ningún usuario.</p>}
          </div>
          <Btn variant="ghost" onClick={() => setUserDraft(blankUser())}><Plus size={14} /> Añadir usuario</Btn>

          <ConfirmModal
            open={!!deleteUserId}
            title="Eliminar usuario"
            body="Esta persona ya no podrá entrar con su PIN."
            onCancel={() => setDeleteUserId(null)}
            onConfirm={() => removeUser(deleteUserId)}
          />
        </Card>
      )}

      <div className="flex justify-end mb-8">
        <Btn variant="primary" onClick={save}><Check size={16} /> Guardar ajustes</Btn>
      </div>

      {isOwner && (
        <Card style={{ padding: 20, borderColor: T.rust }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 4, color: T.rust }}>Zona de restauración</h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginBottom: 12 }}>
            Borra todos los productos, escandallos, proveedores y ventas, y devuelve la app a los valores con los que empezó.
          </p>
          <Btn variant="danger" onClick={onResetClick}><RotateCcw size={15} /> Restaurar valores predeterminados</Btn>
        </Card>
      )}
    </div>
  );
}
