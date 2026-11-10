// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { verifyAttrs } from "../../verify/core/contract";
import type { Filter } from "./types";

export interface TodoStatsProps {
  total: number;
  done: number;
  active: number;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onClearDone: () => void;
}

const FILTERS: Filter[] = ["all", "active", "done"];

export function TodoStats({
  total,
  done,
  active,
  filter,
  onFilter,
  onClearDone,
}: TodoStatsProps) {
  return (
    <footer
      className="todo-stats"
      {...verifyAttrs({
        unit: "TodoStats",
        total,
        done,
        active,
        filter,
        consistent: total === done + active,
      })}
    >
      <span className="todo-count">
        <strong>{active}</strong> active / {total} total
      </span>
      <div className="todo-filters" role="group" aria-label="Filter todos">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            aria-pressed={filter === f}
            onClick={() => onFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <button
        className="todo-clear"
        onClick={onClearDone}
        disabled={done === 0}
        aria-label="Clear completed"
      >
        Clear done ({done})
      </button>
    </footer>
  );
}
