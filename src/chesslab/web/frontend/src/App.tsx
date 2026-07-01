import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { Camera, Crosshair, Database, SquarePen, LineChart, Crown, ScanEye, Hand, Box } from "lucide-react";
import Calibrate from "./components/Calibrate";
import Collect from "./components/Collect";
import ManualLabel from "./components/ManualLabel";
import { DatasetLayout, SessionsPanel, DatasetsPanel, StatsPanel } from "./components/Dataset";
import Review from "./components/Review";
import Training from "./components/Training";
import Inference from "./components/Inference";
import Scan from "./components/Scan";

const TABS = [
  { to: "/kalibrieren", label: "Kalibrieren", icon: Crosshair },
  { to: "/sammeln", label: "Sammeln", icon: Camera },
  { to: "/scan", label: "Scan", icon: Box },
  { to: "/manuell", label: "Manuell labeln", icon: Hand },
  { to: "/datensaetze", label: "Datensätze", icon: Database },
  { to: "/inference", label: "Inference", icon: ScanEye },
  { to: "/review", label: "Review / Relabel", icon: SquarePen },
  { to: "/training", label: "Training", icon: LineChart },
];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
    isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"}`;

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-full">
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
            <div className="flex items-center gap-2 font-semibold tracking-tight">
              <Crown className="h-5 w-5 text-sky-400" /> chesslab
            </div>
            <nav className="flex flex-wrap gap-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                return <NavLink key={t.to} to={t.to} className={linkCls}><Icon className="h-4 w-4" /> {t.label}</NavLink>;
              })}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/kalibrieren" replace />} />
            <Route path="/kalibrieren" element={<Calibrate />} />
            <Route path="/sammeln" element={<Collect />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/manuell" element={<ManualLabel />} />
            <Route path="/datensaetze" element={<DatasetLayout />}>
              <Route index element={<Navigate to="sessions" replace />} />
              <Route path="sessions" element={<SessionsPanel />} />
              <Route path="kuratiert" element={<DatasetsPanel />} />
              <Route path="statistik" element={<StatsPanel />} />
            </Route>
            <Route path="/inference" element={<Inference />} />
            <Route path="/review" element={<Review />} />
            <Route path="/training" element={<Training />} />
            <Route path="*" element={<Navigate to="/kalibrieren" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
