#!/bin/bash
# Graceful wrapper for Entire CLI commands.
# Forwards all arguments to `entire` if installed, exits 0 silently otherwise.

if command -v entire >/dev/null 2>&1; then
  entire "$@"
else
  exit 0
fi
