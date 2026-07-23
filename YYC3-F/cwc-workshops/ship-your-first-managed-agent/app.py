# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
import json
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

from ui import inject_style, alert_banner
from provided import chat_panel

load_dotenv()
st.set_page_config(page_title="Incident · 2277", page_icon="▮", layout="wide")
inject_style()

# Generate the synthetic log fixture on first run (~0.5 s, deterministic).
# Once data/app.log exists this branch is dead — a single stat() call —
# so reruns and code edits during the workshop don't regenerate it.
LOG_FIXTURE = Path(__file__).parent / "data" / "app.log"
if not LOG_FIXTURE.exists():
    with st.spinner("First run — generating `data/app.log` fixture…"):
        try:
            from data.generate_log import main as _generate_log
            _generate_log()
        except Exception as exc:  # disk full, permissions, etc.
            st.error(
                f"Couldn't generate `data/app.log` automatically (`{exc}`).\n\n"
                "Run it yourself, then reload:\n```\npython data/generate_log.py\n```"
            )
            st.stop()


def overview():
    main, side = st.columns([5, 3], gap="large")

    with main:
        st.title("INCIDENT-2277")
        alert_banner()

        DATA = Path(__file__).parent / "data"
        metrics = json.loads((DATA / "metrics.json").read_text())
        p99 = metrics["checkout"]["p99_latency_ms"]
        peak, base = max(d["value"] for d in p99), p99[0]["value"]
        err = max(d["value"] for d in metrics["checkout"]["error_rate"])

        r1c1, r1c2 = st.columns(2)
        r1c1.metric("P99 LATENCY", f"{peak:,.0f} ms", f"{(peak/base-1)*100:+.0f}%", delta_color="inverse")
        r1c2.metric("ERROR RATE", f"{err*100:.1f}%", f"+{err*100:.1f} pp", delta_color="inverse")
        r2c1, r2c2 = st.columns(2)
        r2c1.metric("DB POOL", "100%", "+90 pp", delta_color="inverse")
        r2c2.metric("DURATION", "28 min", "ongoing")

        st.divider()
        st.markdown("##### AFFECTED SERVICE")
        st.markdown(
            '<span class="pill crit">checkout</span> &nbsp; '
            '<span class="pill ok">cart</span> &nbsp; '
            '<span class="pill ok">auth</span> &nbsp; '
            '<span class="pill ok">inventory</span>',
            unsafe_allow_html=True,
        )
        st.markdown("##### SIGNAL")
        st.code(
            "14:32:07  alert fired   checkout.p99_latency_ms > 500 for 5m\n"
            "14:32:11  paged         @oncall-platform\n"
            "14:32:14  ack           —",
            language=None,
        )

    with side:
        chat_panel()


st.navigation([
    st.Page(overview, title="Overview", default=True),
    st.Page("pages/1_Metrics.py", title="Metrics"),
    st.Page("pages/2_Logs.py", title="Logs"),
    st.Page("pages/3_Deploys.py", title="Deploys"),
]).run()
