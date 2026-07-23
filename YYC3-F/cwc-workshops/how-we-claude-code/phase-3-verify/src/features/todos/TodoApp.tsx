// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { verifyAttrs } from "../../verify/core/contract";
import type { Todo } from "./types";
import { useTodos } from "./useTodos";
import { TodoInput } from "./TodoInput";
import { TodoList } from "./TodoList";
import { TodoStats } from "./TodoStats";

export interface TodoAppProps {
  initial?: Todo[];
}

/** The feature slice: the whole todo app as one verifiable unit. */
export function TodoApp({ initial = [] }: TodoAppProps) {
  const t = useTodos(initial);
  return (
    <section
      className="todo-app"
      {...verifyAttrs({
        unit: "TodoApp",
        total: t.stats.total,
        done: t.stats.done,
        active: t.stats.active,
        filter: t.filter,
        visible: t.visible.length,
      })}
    >
      <h2>Todos</h2>
      <TodoInput onAdd={t.add} />
      <TodoList todos={t.visible} onToggle={t.toggle} onRemove={t.remove} />
      <TodoStats
        total={t.stats.total}
        done={t.stats.done}
        active={t.stats.active}
        filter={t.filter}
        onFilter={t.setFilter}
        onClearDone={t.clearDone}
      />
    </section>
  );
}
