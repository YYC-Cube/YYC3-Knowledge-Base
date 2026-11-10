// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { CheckStatus, Verdict } from "../core/types";

const ICON: Record<CheckStatus, string> = {
  ok: "✅",
  fail: "❌",
  warn: "⚠️",
  probe: "🔍",
};

export function CheckIcon({ status }: { status: CheckStatus }) {
  return <span className={`check-icon check-${status}`}>{ICON[status]}</span>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`verdict verdict-${verdict.toLowerCase()}`}
      data-verdict={verdict}
    >
      {verdict}
    </span>
  );
}
