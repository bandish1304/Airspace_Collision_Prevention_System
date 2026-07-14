"""Convert raw OpenSky JSON snapshots into a clean typed pandas DataFrame."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RAW_DIR = PROJECT_ROOT / "data" / "raw"
DEFAULT_OUTPUT_PATH = PROJECT_ROOT / "data" / "processed" / "adsb_clean.csv"

M_TO_FEET = 3.28084
MPS_TO_KNOTS = 1.94384449
MPS_TO_FEET_PER_MIN = 196.850394


def load_raw_payloads(raw_dir: Path) -> list[tuple[Path, dict[str, Any]]]:
    """Load all OpenSky raw snapshot JSON files from the raw data directory."""
    files = sorted(raw_dir.glob("opensky_states_*.json"))
    payloads: list[tuple[Path, dict[str, Any]]] = []

    for file_path in files:
        with file_path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
        payloads.append((file_path, payload))

    return payloads


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def payloads_to_dataframe(payloads: list[tuple[Path, dict[str, Any]]]) -> pd.DataFrame:
    """Convert OpenSky state vectors into a clean DataFrame with typed columns."""
    rows: list[dict[str, Any]] = []

    for source_file, payload in payloads:
        states = payload.get("states") or []

        for state in states:
            callsign_raw = state[1]
            callsign = callsign_raw.strip() if isinstance(callsign_raw, str) else None

            latitude = _to_float(state[6])
            longitude = _to_float(state[5])

            altitude_m = _to_float(state[13])
            if altitude_m is None:
                altitude_m = _to_float(state[7])

            velocity_mps = _to_float(state[9])
            heading_deg = _to_float(state[10])
            vertical_rate_mps = _to_float(state[11])

            last_contact = _to_float(state[4])
            if last_contact is None:
                last_contact = _to_float(state[3])

            rows.append(
                {
                    "callsign": callsign,
                    "latitude": latitude,
                    "longitude": longitude,
                    "altitude": altitude_m * M_TO_FEET if altitude_m is not None else None,
                    "velocity": velocity_mps * MPS_TO_KNOTS if velocity_mps is not None else None,
                    "heading": heading_deg,
                    "vertical_rate": (
                        vertical_rate_mps * MPS_TO_FEET_PER_MIN
                        if vertical_rate_mps is not None
                        else None
                    ),
                    "timestamp": last_contact,
                    "source_file": source_file.name,
                }
            )

    df = pd.DataFrame(
        rows,
        columns=[
            "callsign",
            "latitude",
            "longitude",
            "altitude",
            "velocity",
            "heading",
            "vertical_rate",
            "timestamp",
            "source_file",
        ],
    )

    if df.empty:
        return df

    df["callsign"] = df["callsign"].astype("string")
    numeric_cols = ["latitude", "longitude", "altitude", "velocity", "heading", "vertical_rate"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float64")

    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s", utc=True, errors="coerce")

    return df.sort_values("timestamp").reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Process raw OpenSky JSON files into a clean DataFrame.")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=DEFAULT_RAW_DIR,
        help="Directory containing OpenSky raw JSON files.",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Destination CSV path for the cleaned DataFrame.",
    )
    args = parser.parse_args()

    payloads = load_raw_payloads(args.raw_dir)
    if not payloads:
        raise FileNotFoundError(f"No raw OpenSky files found in: {args.raw_dir}")

    df = payloads_to_dataframe(payloads)
    if df.empty:
        print("No aircraft rows found in raw files.")
        return

    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output_csv, index=False)

    print(f"Processed {len(payloads)} raw files into {len(df)} rows.")
    print(f"Output CSV: {args.output_csv}")
    print(df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()
