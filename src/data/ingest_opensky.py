"""Fetch ADS-B state vectors from OpenSky for a Southern California bounding box."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import os
import requests
from dotenv import load_dotenv

OPENSKY_STATES_URL = "https://opensky-network.org/api/states/all"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
MAX_CIVILIAN_SPEED_KNOTS = 1500.0
MPS_TO_KNOTS = 1.94384449

# Southern California bounding box from the project plan.
DEFAULT_BBOX = {
    "lamin": 32.0,
    "lomin": -120.0,
    "lamax": 36.0,
    "lomax": -115.0,
}

# OpenSky states/all vector index positions used by this script.
IDX_CALLSIGN = 1
IDX_LONGITUDE = 5
IDX_LATITUDE = 6
IDX_BARO_ALTITUDE_M = 7
IDX_VELOCITY_MPS = 9
IDX_GEO_ALTITUDE_M = 13


def _require_env(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {var_name}. "
            "Set it in your .env file."
        )
    return value


def fetch_opensky_states() -> dict[str, Any]:
    """Fetch raw JSON state vectors from OpenSky using configured credentials."""
    load_dotenv()

    username = _require_env("OPENSKY_USERNAME")
    password = _require_env("OPENSKY_PASSWORD")

    response = requests.get(
        OPENSKY_STATES_URL,
        params=DEFAULT_BBOX,
        auth=(username, password),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def _snapshot_key_now() -> str:
    """Build a UTC minute key used to name raw snapshot files."""
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")


def _snapshot_path(snapshot_key: str) -> Path:
    return RAW_DATA_DIR / f"opensky_states_{snapshot_key}.json"


def _load_snapshot(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _save_snapshot(path: Path, payload: dict[str, Any]) -> None:
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)


def get_or_fetch_snapshot(force_fetch: bool = False) -> tuple[dict[str, Any], Path, bool]:
    """Load current-minute snapshot from disk or fetch and save a new one."""
    snapshot_key = _snapshot_key_now()
    path = _snapshot_path(snapshot_key)

    if path.exists() and not force_fetch:
        return _load_snapshot(path), path, True

    payload = fetch_opensky_states()
    _save_snapshot(path, payload)
    return payload, path, False


def extract_preview(payload: dict[str, Any], max_rows: int = 5) -> list[dict[str, Any]]:
    """Extract key aircraft fields for quick verification in terminal output."""
    states = payload.get("states") or []
    preview: list[dict[str, Any]] = []

    for state in states[:max_rows]:
        preview.append(
            {
                "callsign": state[1].strip() if state[1] else None,
                "longitude": state[5],
                "latitude": state[6],
                "altitude_m": state[13] if state[13] is not None else state[7],
                "velocity_m_s": state[9],
                "heading_deg": state[10],
                "last_contact": state[4],
            }
        )

    return preview


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _is_valid_state(state: list[Any]) -> bool:
    callsign_raw = state[IDX_CALLSIGN]
    callsign = callsign_raw.strip() if isinstance(callsign_raw, str) else ""
    if not callsign:
        return False

    latitude = _to_float(state[IDX_LATITUDE])
    longitude = _to_float(state[IDX_LONGITUDE])
    if latitude is None or longitude is None:
        return False

    altitude_m = _to_float(state[IDX_GEO_ALTITUDE_M])
    if altitude_m is None:
        altitude_m = _to_float(state[IDX_BARO_ALTITUDE_M])
    if altitude_m is not None and altitude_m < 0:
        return False

    velocity_mps = _to_float(state[IDX_VELOCITY_MPS])
    if velocity_mps is not None and (velocity_mps * MPS_TO_KNOTS) > MAX_CIVILIAN_SPEED_KNOTS:
        return False

    return True


def validate_adsb_states(payload: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """Return a filtered payload and number of rejected records."""
    states = payload.get("states") or []
    valid_states = [state for state in states if _is_valid_state(state)]
    rejected_count = len(states) - len(valid_states)

    validated_payload = dict(payload)
    validated_payload["states"] = valid_states
    return validated_payload, rejected_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch OpenSky state vectors for Southern California.")
    parser.add_argument(
        "--force-fetch",
        action="store_true",
        help="Fetch from OpenSky even if a current-minute snapshot already exists.",
    )
    args = parser.parse_args()

    payload, raw_file_path, loaded_from_cache = get_or_fetch_snapshot(force_fetch=args.force_fetch)
    states = payload.get("states") or []
    validated_payload, rejected_count = validate_adsb_states(payload)
    valid_states = validated_payload.get("states") or []

    if loaded_from_cache:
        print(f"Loaded {len(states)} aircraft state vectors from saved snapshot.")
    else:
        print(f"Fetched {len(states)} aircraft state vectors from OpenSky and saved snapshot.")

    print(
        "Validation summary: "
        f"accepted={len(valid_states)}, rejected={rejected_count}, total={len(states)}"
    )
    print(f"Raw JSON file: {raw_file_path}")
    print(json.dumps(extract_preview(validated_payload), indent=2))


if __name__ == "__main__":
    main()
