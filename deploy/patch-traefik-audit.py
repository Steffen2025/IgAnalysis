#!/usr/bin/env python3
"""Insert audit.botlogix.ca routes into BoxBuddy Traefik file provider config."""
from __future__ import annotations

import shutil
import sys
from datetime import datetime
from pathlib import Path

DYNAMIC = Path("/opt/boxbuddy/traefik/dynamic.yml")
MARKER = "audit.botlogix.ca"

ROUTERS_BLOCK = """    botlogix-audit-http:
      rule: Host(`audit.botlogix.ca`)
      entryPoints:
      - web
      middlewares:
      - redirect-to-https
      service: botlogix-ig-audit
      priority: 5
    botlogix-audit:
      rule: Host(`audit.botlogix.ca`)
      entryPoints:
      - websecure
      middlewares:
      - hsts-header
      service: botlogix-ig-audit
      tls:
        certResolver: letsencrypt
      priority: 5
"""

SERVICE_BLOCK = """    botlogix-ig-audit:
      loadBalancer:
        servers:
        - url: http://botlogix-ig-audit:5057
"""


def main() -> int:
    if not DYNAMIC.is_file():
        print(f"missing {DYNAMIC}", file=sys.stderr)
        return 1
    text = DYNAMIC.read_text(encoding="utf-8")
    if MARKER in text:
        print("audit.botlogix.ca routes already present")
        return 0

    middlewares_needle = "  middlewares:\n    redirect-to-https:"
    if middlewares_needle not in text:
        print("could not find middlewares anchor in dynamic.yml", file=sys.stderr)
        return 1
    text = text.replace(middlewares_needle, ROUTERS_BLOCK + middlewares_needle, 1)

    studio_needle = "    botlogix-social-studio:\n      loadBalancer:"
    if studio_needle not in text:
        print("could not find services anchor in dynamic.yml", file=sys.stderr)
        return 1
    text = text.replace(studio_needle, SERVICE_BLOCK + studio_needle, 1)

    backup = DYNAMIC.with_name(
        f"dynamic.yml.bak-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    )
    shutil.copy2(DYNAMIC, backup)
    DYNAMIC.write_text(text, encoding="utf-8")
    print(f"patched {DYNAMIC} (backup {backup.name})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
