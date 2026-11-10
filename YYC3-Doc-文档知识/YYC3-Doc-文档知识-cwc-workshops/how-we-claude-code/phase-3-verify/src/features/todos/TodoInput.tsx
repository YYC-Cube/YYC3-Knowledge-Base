// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { verifyAttrs } from "../../verify/core/contract";

export interface TodoInputProps {
  onAdd: (text: string) => void;
  placeholder?: string;
}

export function TodoInput({ onAdd, placeholder = "What needs doing?" }: TodoInputProps) {
  const [text, setText] = useState("");
  const canSubmit = text.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onAdd(text);
    setText("");
  };

  return (
    <form
      className="todo-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      {...verifyAttrs({
        unit: "TodoInput",
        value: text,
        "can-submit": canSubmit,
      })}
    >
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        aria-label="New todo"
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={!canSubmit} aria-label="Add todo">
        Add
      </button>
    </form>
  );
}
