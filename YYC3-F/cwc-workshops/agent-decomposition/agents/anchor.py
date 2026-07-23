# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
"""Single source of truth for the data snapshot date.

The seed data is frozen at this date. All system prompts reference it so
forecasts are reproducible regardless of when the workshop runs (SF May 7
vs Tokyo June 11) and regardless of what the SDK injects as "today."
"""
SNAPSHOT_DATE = "2026-04-27"

DATE_ANCHOR = (
    f"The current business date is {SNAPSHOT_DATE} — this is the latest "
    f"date in the data snapshot. Treat it as 'today' for all forecasts, "
    f"lead-time math, and 'next month' references, regardless of any other "
    f"date you may have been told."
)
