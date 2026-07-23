// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export type Filter = "all" | "active" | "done";
