import Link from "next/link";

import { getBackendHealth } from "@/lib/api";

const modules = [
  { name: "Console Frontend", detail: "Next.js App Router", status: "ready" },
  { name: "Console Backend", detail: "FastAPI service API", status: "checking" },
  { name: "Managed Projects", detail: "Tracked frontend and backend apps", status: "planned" }
];

export default async function Home() {
  const backend = await getBackendHealth();

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">DMS Console</div>
        <nav className="nav">
          <Link className="navItem active" href="/">
            Overview
          </Link>
          <Link className="navItem" href="/tasks">
            Task
          </Link>
          <Link className="navItem" href="/wbs">
            WBS
          </Link>
          <Link className="navItem" href="/issues">
            Issues
          </Link>
          <Link className="navItem" href="/work">
            Work
          </Link>
          <Link className="navItem" href="/agents">
            Agent
          </Link>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Development Management System Console</h1>
          </div>
          <div className={backend ? "health online" : "health offline"}>
            <span className="dot" />
            {backend ? "Backend online" : "Backend offline"}
          </div>
        </header>

        <section className="summary" aria-label="System summary">
          <div className="metric">
            <span className="metricLabel">Console Frontend</span>
            <strong>Next.js</strong>
          </div>
          <div className="metric">
            <span className="metricLabel">Console Backend</span>
            <strong>FastAPI</strong>
          </div>
          <div className="metric">
            <span className="metricLabel">API Base</span>
            <strong>{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</strong>
          </div>
        </section>

        <section className="panel" aria-labelledby="modules-title">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Runtime Map</p>
              <h2 id="modules-title">Deployable Apps</h2>
            </div>
          </div>
          <div className="table">
            <div className="row head">
              <span>App</span>
              <span>Role</span>
              <span>Status</span>
            </div>
            {modules.map((module) => (
              <div className="row" key={module.name}>
                <span>{module.name}</span>
                <span>{module.detail}</span>
                <span className={`badge ${module.status}`}>{module.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="backend-title">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">API Check</p>
              <h2 id="backend-title">FastAPI Health</h2>
            </div>
          </div>
          <pre className="code">
            {JSON.stringify(
              backend ?? {
                status: "offline",
                hint: "Run npm run dev:dms:backend in another terminal."
              },
              null,
              2
            )}
          </pre>
        </section>
      </section>
    </main>
  );
}
