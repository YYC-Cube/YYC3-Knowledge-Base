# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Python client for the Layer 1 mineflayer bot HTTP seam.

Mirrors bot/bot.js exactly. Field names match what the bot emits, not any
external spec — see snapshotState() in bot.js. The dataclasses are tolerant:
missing fields become None or empty lists, and the original dict is kept on
GameState.raw for logging.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import requests


# Bot HTTP API runs on :8088 in this environment because rootlesskit holds
# :8080. Override via the constructor or BOT_API_URL env var.
DEFAULT_BASE_URL = "http://localhost:8088"


def _xyz(d: Any) -> tuple[float, float, float]:
    if not isinstance(d, dict):
        return (0.0, 0.0, 0.0)
    return (float(d.get("x") or 0), float(d.get("y") or 0), float(d.get("z") or 0))


@dataclass(frozen=True)
class Item:
    name: str
    count: int
    slot: Optional[int] = None


@dataclass(frozen=True)
class Block:
    name: str
    pos: tuple[float, float, float]
    distance: float


@dataclass(frozen=True)
class Entity:
    name: str
    type: str
    pos: tuple[float, float, float]
    distance: float


@dataclass(frozen=True)
class GameState:
    position: tuple[float, float, float]
    health: float
    food: float
    time_of_day: Optional[int]
    dimension: Optional[str]
    inventory: list[Item]
    equipped: dict
    nearby_blocks: list[Block]
    nearby_entities: list[Entity]
    busy: bool
    last_error: Optional[str]
    raw: dict = field(default_factory=dict)

    def has(self, name: str, n: int = 1) -> bool:
        """True if inventory contains at least n of `name`."""
        return sum(i.count for i in self.inventory if i.name == name) >= n

    def count(self, name: str) -> int:
        """Total count of `name` in inventory across all stacks."""
        return sum(i.count for i in self.inventory if i.name == name)

    def find_block_by_suffix(self, suffix: str) -> Optional[Block]:
        """First nearby block whose name ends with suffix (e.g. '_log')."""
        for b in self.nearby_blocks:
            if b.name.endswith(suffix):
                return b
        return None

    @classmethod
    def from_dict(cls, d: dict) -> "GameState":
        inv = [
            Item(name=i.get("name", ""), count=int(i.get("count", 0)), slot=i.get("slot"))
            for i in (d.get("inventory") or [])
        ]
        blocks = [
            Block(name=b.get("name", ""), pos=_xyz(b.get("pos")), distance=float(b.get("distance") or 0))
            for b in (d.get("nearby_blocks") or [])
        ]
        ents = [
            Entity(
                name=e.get("name", ""),
                type=str(e.get("type", "")),
                pos=_xyz(e.get("pos")),
                distance=float(e.get("distance") or 0),
            )
            for e in (d.get("nearby_entities") or [])
        ]
        return cls(
            position=_xyz(d.get("position")),
            health=float(d.get("health") or 0),
            food=float(d.get("food") or 0),
            time_of_day=d.get("time_of_day"),
            dimension=d.get("dimension"),
            inventory=inv,
            equipped=d.get("equipped") or {},
            nearby_blocks=blocks,
            nearby_entities=ents,
            busy=bool(d.get("busy", False)),
            last_error=d.get("last_error"),
            raw=d,
        )


class BotError(RuntimeError):
    """Raised when the bot reports an error or the HTTP layer fails."""


class MinecraftClient:
    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        state_timeout: int = 10,
        action_timeout: int = 600,
        token: Optional[str] = None,
    ):
        """state_timeout is for fast /state polls; action_timeout must be
        long enough for the slowest synchronous action. Pathfinding +
        mining can legitimately take 5+ minutes when descending through
        20+ blocks of stone via go_near to a deep position, so we default
        to 10 minutes. The bot is genuinely working during that time, not
        hung — if you watch the prismarine viewer you'll see Steve dig.

        `token` is the bearer token for the bot's /action + /mcp routes.
        Defaults to BOT_TOKEN env var; empty = no Authorization header
        sent (works against a bot running without BOT_TOKEN set)."""
        self.base_url = base_url.rstrip("/")
        self.state_timeout = state_timeout
        self.action_timeout = action_timeout
        self._session = requests.Session()
        tok = token if token is not None else os.environ.get("BOT_TOKEN", "")
        if tok:
            self._session.headers["Authorization"] = f"Bearer {tok}"

    # Legacy single-knob timeout for callers that pass `timeout=`. Maps to
    # action_timeout because that's the strict bound.
    @property
    def timeout(self) -> int:
        return self.action_timeout

    def state(self) -> GameState:
        """One snapshot. Tolerant of partial responses."""
        r = self._session.get(f"{self.base_url}/state", timeout=self.state_timeout)
        r.raise_for_status()
        return GameState.from_dict(r.json())

    def act(self, action_name: str, /, **args) -> dict:
        """Send POST /action. Returns the parsed JSON; never raises on
        ok=false (the caller decides how to handle action failures).

        `action_name` is positional-only so callers can pass an action that
        itself takes a `name` kwarg (e.g. mine_block) without collisions.
        """
        body = {"name": action_name, "args": args}
        r = self._session.post(
            f"{self.base_url}/action", json=body, timeout=self.action_timeout
        )
        # The bot returns 4xx for malformed/unknown actions and 5xx for
        # server-internal failures. Both still ship a JSON {ok:false,error}.
        try:
            data = r.json()
        except ValueError:
            raise BotError(f"non-JSON response from /action ({r.status_code}): {r.text[:200]}")
        if not isinstance(data, dict) or "ok" not in data:
            raise BotError(f"malformed /action response: {data!r}")
        return data

    def wait_until_idle(self, timeout: int = 600, poll: float = 0.5) -> GameState:
        """Poll /state until busy is False. Raises BotError on timeout.

        Default matches the bot's action_timeout (600s / 10 min): pathfinding
        plus mining through 20+ blocks of stone can legitimately take minutes,
        and we don't want wait_until_idle to give up before the action itself.
        """
        deadline = time.monotonic() + timeout
        while True:
            s = self.state()
            if not s.busy:
                return s
            if time.monotonic() > deadline:
                raise BotError(f"wait_until_idle timed out after {timeout}s (last_error={s.last_error})")
            time.sleep(poll)

    def act_and_wait(self, action_name: str, /, **args) -> tuple[dict, GameState]:
        """Send action, wait for the bot to finish, return (result, state).

        Note: actions on bot.js are synchronous from the HTTP caller's POV
        (the response only comes back when the action completes), so the
        wait_until_idle is mostly belt-and-braces — it also makes sure any
        post-action settling has happened before we read state.
        """
        result = self.act(action_name, **args)
        state = self.wait_until_idle()
        return result, state
