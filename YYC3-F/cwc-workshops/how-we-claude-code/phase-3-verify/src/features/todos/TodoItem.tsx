// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { verifyAttrs } from "../../verify/core/contract";
import type { Todo } from "./types";

export interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onRemove }: TodoItemProps) {
  return (
    <li
      className={`todo-item ${todo.done ? "done" : ""}`}
      {...verifyAttrs({
        unit: "TodoItem",
        id: todo.id,
        done: todo.done,
        empty: todo.text.trim().length === 0,
        len: todo.text.length,
      })}
    >
      <label className="todo-item-label">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo.id)}
          aria-label={`Mark "${todo.text || "(empty)"}" ${todo.done ? "active" : "done"}`}
        />
        <span className="todo-text">{todo.text || "(empty)"}</span>
      </label>
      <button
        className="todo-remove"
        onClick={() => onRemove(todo.id)}
        aria-label={`Remove "${todo.text || "(empty)"}"`}
      >
        ×
      </button>
    </li>
  );
}
