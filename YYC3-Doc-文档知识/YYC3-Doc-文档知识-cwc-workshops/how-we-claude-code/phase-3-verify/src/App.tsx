// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { Link } from "react-router-dom";
import { TodoApp } from "./features/todos/TodoApp";

export function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <strong>Verifiable React</strong>
        <Link to="/verify">→ verification dashboard</Link>
      </nav>
      <TodoApp
        initial={[
          { id: "seed1", text: "Read the /verify dashboard", done: false, createdAt: 1 },
          { id: "seed2", text: "Open the console: window.__verify", done: false, createdAt: 2 },
        ]}
      />
      <footer className="app-foot">
        <p>
          Every component emits a <code>data-verify-*</code> DOM contract.
          Every unit has isolated fixtures at <code>/verify/:unit/:fixture</code>.
          An agent can read <code>window.__verify</code> for structured results.
        </p>
      </footer>
    </div>
  );
}
