import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { Camera, Database, LineChart, Crown, Box } from "lucide-react";
import Collect from "./components/Collect";
import { DatasetLayout, SessionsPanel, DatasetsPanel, StatsPanel } from "./components/Dataset";
import Training from "./components/Training";
import Scan from "./components/Scan";

const TABS = [
  { to: "/collect", label: "Collect", icon: Camera },
  { to: "/scan", label: "Scan", icon: Box },
  { to: "/datasets", label: "Datasets", icon: Database },
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
            <Route path="/" element={<Navigate to="/collect" replace />} />
            <Route path="/collect" element={<Collect />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/datasets" element={<DatasetLayout />}>
              <Route index element={<Navigate to="sessions" replace />} />
              <Route path="sessions" element={<SessionsPanel />} />
              <Route path="curated" element={<DatasetsPanel />} />
              <Route path="stats" element={<StatsPanel />} />
            </Route>
            <Route path="/training" element={<Training />} />
            <Route path="*" element={<Navigate to="/collect" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
