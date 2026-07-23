// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { createElement } from "react";
import { z } from "zod";
import { registerUnit } from "../core/registry";
import type { TodoStatsProps } from "../../features/todos/TodoStats";
import { TodoStats } from "../../features/todos/TodoStats";

const noop = () => {};

registerUnit<TodoStatsProps>({
  id: "TodoStats",
  title: "TodoStats",
  description: "Footer: counts, filter buttons, clear-done.",
  kind: "component",
  render: (props) => createElement(TodoStats, props),
  propsSchema: z
    .object({
      total: z.number().int().nonnegative(),
      done: z.number().int().nonnegative(),
      active: z.number().int().nonnegative(),
      filter: z.enum(["all", "active", "done"]),
      onFilter: z.function(),
      onClearDone: z.function(),
    })
    .refine((d) => d.total === d.done + d.active, {
      message: "total must equal done + active",
    }),
  fixtures: [
    {
      id: "mixed",
      description: "3 total, 1 done, 2 active.",
      props: {
        total: 3,
        done: 1,
        active: 2,
        filter: "all",
        onFilter: noop,
        onClearDone: noop,
      },
    },
    {
      id: "none-done",
      description: "Nothing done — Clear completed should be disabled.",
      props: {
        total: 2,
        done: 0,
        active: 2,
        filter: "all",
        onFilter: noop,
        onClearDone: noop,
      },
    },
    {
      id: "all-done",
      description: "Everything complete.",
      props: {
        total: 4,
        done: 4,
        active: 0,
        filter: "done",
        onFilter: noop,
        onClearDone: noop,
      },
    },
    {
      id: "inconsistent-counts",
      probe: true,
      description:
        "Probe: total !== done + active. The schema refine should FAIL this — demonstrates the framework catching a lie.",
      props: {
        total: 10,
        done: 3,
        active: 4, // 3 + 4 = 7, not 10 — intentional violation
        filter: "all",
        onFilter: noop,
        onClearDone: noop,
      },
    },
  ],
  invariants: [
    {
      id: "active-count-rendered",
      description: "rendered active count matches props.active",
      check: ({ root, props }) => {
        const strong = root.querySelector(".todo-count strong");
        return (
          strong?.textContent?.trim() === String(props.active) ||
          `rendered "${strong?.textContent}", expected "${props.active}"`
        );
      },
    },
    {
      id: "active-filter-pressed",
      description: "selected filter button has aria-pressed=true",
      check: ({ root, props }) => {
        const btn = Array.from(
          root.querySelectorAll<HTMLElement>(".todo-filters button")
        ).find((b) => b.textContent?.trim() === props.filter);
        if (!btn) return `no filter button for "${props.filter}"`;
        return (
          btn.getAttribute("aria-pressed") === "true" ||
          `filter "${props.filter}" has aria-pressed=${btn.getAttribute(
            "aria-pressed"
          )}`
        );
      },
    },
    {
      id: "clear-disabled-iff-none-done",
      description: "Clear completed disabled exactly when done === 0",
      check: ({ root, props }) => {
        const btn = root.querySelector<HTMLButtonElement>(".todo-clear");
        if (!btn) return "no clear button";
        const shouldBeDisabled = props.done === 0;
        return (
          btn.disabled === shouldBeDisabled ||
          `disabled=${btn.disabled} but done=${props.done}`
        );
      },
    },
    {
      id: "contract-consistency-flag",
      description: "data-verify-consistent reflects whether counts add up",
      check: ({ contract, props }) => {
        const expected = String(props.total === props.done + props.active);
        return (
          contract.consistent === expected ||
          `consistent="${contract.consistent}", expected "${expected}"`
        );
      },
    },
  ],
});
