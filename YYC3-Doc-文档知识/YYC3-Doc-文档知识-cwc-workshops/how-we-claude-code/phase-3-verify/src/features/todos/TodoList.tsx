// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { verifyAttrs } from "../../verify/core/contract";
import type { Todo } from "./types";
import { TodoItem } from "./TodoItem";

export interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TodoList({ todos, onToggle, onRemove }: TodoListProps) {
  return (
    <ul
      className="todo-list"
      {...verifyAttrs({
        unit: "TodoList",
        count: todos.length,
        "done-count": todos.filter((t) => t.done).length,
        empty: todos.length === 0,
      })}
    >
      {todos.length === 0 ? (
        <li className="todo-empty">Nothing here yet.</li>
      ) : (
        todos.map((t) => (
          <TodoItem key={t.id} todo={t} onToggle={onToggle} onRemove={onRemove} />
        ))
      )}
    </ul>
  );
}
