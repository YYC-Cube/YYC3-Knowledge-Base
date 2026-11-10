// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo, useState } from "react";
import type { Filter, Todo } from "./types";

let nextId = 1;
const genId = () => `t${nextId++}`;

export function useTodos(initial: Todo[] = []) {
  const [todos, setTodos] = useState<Todo[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");

  const add = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos((t) => [
      ...t,
      { id: genId(), text: trimmed, done: false, createdAt: Date.now() },
    ]);
  }, []);

  const toggle = useCallback((id: string) => {
    setTodos((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }, []);

  const remove = useCallback((id: string) => {
    setTodos((t) => t.filter((x) => x.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setTodos((t) => t.filter((x) => !x.done));
  }, []);

  const visible = useMemo(() => {
    if (filter === "active") return todos.filter((t) => !t.done);
    if (filter === "done") return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  const stats = useMemo(
    () => ({
      total: todos.length,
      done: todos.filter((t) => t.done).length,
      active: todos.filter((t) => !t.done).length,
    }),
    [todos]
  );

  return { todos, visible, filter, stats, add, toggle, remove, clearDone, setFilter };
}

export type TodosApi = ReturnType<typeof useTodos>;
