from __future__ import annotations

import argparse
import concurrent.futures
import time
from dataclasses import dataclass
from typing import Any, Iterable

import pandas as pd
import requests

BASE_URL = "https://data.ntsb.gov/carol-main-public"


@dataclass
class CaseSummary:
    mkey: int
    ntsb_no: str | None
    event_date: str | None
    city: str | None
    state: str | None
    country: str | None


def _first(values: list[str] | None) -> str | None:
    if not values:
        return None
    value = values[0]
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _fields_to_map(fields: list[dict[str, Any]]) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for field in fields:
        name = field.get("FieldName")
        if not name:
            continue
        out[str(name)] = _first(field.get("Values"))
    return out


def create_session(http: requests.Session) -> int:
    resp = http.post(f"{BASE_URL}/api/Session/CreateSession", json={}, timeout=60)
    resp.raise_for_status()
    return int(resp.json())


def load_template(http: requests.Session) -> dict[str, Any]:
    resp = http.get(f"{BASE_URL}/api/Query/BasicSearchTemplate", timeout=60)
    resp.raise_for_status()
    return resp.json()


def build_query_payload(
    template: dict[str, Any],
    session_id: int,
    offset: int,
    page_size: int,
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    query_groups = template["QueryGroups"]
    for rule in query_groups[0]["QueryRules"]:
        if rule.get("FieldName") == "Mode":
            rule["Values"] = ["Aviation"]
        if rule.get("FieldName") == "EventDate":
            rule["Operator"] = "is in the range"
            rule["Values"] = [start_date, end_date]

    return {
        "ResultSetSize": page_size,
        "ResultSetOffset": offset,
        "QueryGroups": query_groups,
        "AndOr": template.get("AndOr", "AND"),
        "SortColumn": None,
        "SortDescending": True,
        "TargetCollection": "cases",
        "SessionId": session_id,
    }


def fetch_case_summaries(
    http: requests.Session,
    session_id: int,
    max_records: int,
    page_size: int,
    start_date: str,
    end_date: str,
) -> list[CaseSummary]:
    template = load_template(http)
    summaries: list[CaseSummary] = []
    offset = 0
    total_count: int | None = None

    while True:
        payload = build_query_payload(
            template=template,
            session_id=session_id,
            offset=offset,
            page_size=page_size,
            start_date=start_date,
            end_date=end_date,
        )

        resp = http.post(f"{BASE_URL}/api/Query/Main", json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()

        if total_count is None:
            total_count = int(data.get("ResultListCount", 0))
            print(f"Total matching aviation records: {total_count}")

        results = data.get("Results", [])
        if not results:
            break

        for item in results:
            fields_map = _fields_to_map(item.get("Fields", []))
            mkey_raw = fields_map.get("Mkey")
            if not mkey_raw:
                continue

            summaries.append(
                CaseSummary(
                    mkey=int(mkey_raw),
                    ntsb_no=fields_map.get("NtsbNo"),
                    event_date=fields_map.get("EventDate"),
                    city=fields_map.get("City"),
                    state=fields_map.get("State"),
                    country=fields_map.get("Country"),
                )
            )

            if len(summaries) >= max_records:
                return summaries

        offset += len(results)
        if total_count is not None and offset >= total_count:
            break

    return summaries


def _coalesce(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        return value
    return None


def _extract_aircraft_type(vehicle: dict[str, Any]) -> str | None:
    make = _coalesce(vehicle.get("Make"), vehicle.get("VehicleMake"))
    model = _coalesce(vehicle.get("Model"), vehicle.get("VehicleModel"))
    category = _coalesce(vehicle.get("AircraftCategory"), vehicle.get("AircraftType"))
    parts = [str(x).strip() for x in [make, model, category] if x is not None and str(x).strip()]
    if not parts:
        return None
    return " ".join(parts)


def _extract_phase(vehicle: dict[str, Any]) -> str | None:
    events = vehicle.get("Events") or []
    if not events:
        return None
    event = events[0] or {}
    return _coalesce(
        event.get("cm_tier1Name"),
        event.get("CicttPhaseSoeGroup"),
        event.get("cm_tier2Name"),
    )


def _extract_findings(vehicles: Iterable[dict[str, Any]]) -> tuple[list[str], list[str]]:
    codes: list[str] = []
    texts: list[str] = []
    for vehicle in vehicles:
        for finding in vehicle.get("Findings") or []:
            code = _coalesce(finding.get("FindingCode"))
            text = _coalesce(finding.get("FindingReportText"), finding.get("FindingText"))
            if code:
                code_text = str(code).strip()
                if code_text and code_text not in codes:
                    codes.append(code_text)
            if text:
                finding_text = str(text).strip()
                if finding_text:
                    texts.append(finding_text)
    return codes, texts


def fetch_case_record(http: requests.Session, mkey: int, retries: int = 3) -> dict[str, Any]:
    url = f"{BASE_URL}/api/Query/GetCaseRecord/{mkey}"
    for attempt in range(1, retries + 1):
        try:
            resp = http.get(url, timeout=120)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException:
            if attempt == retries:
                raise
            time.sleep(0.5 * attempt)
    raise RuntimeError("Unreachable")


def build_row(summary: CaseSummary, record: dict[str, Any]) -> dict[str, Any]:
    vehicles = record.get("Vehicles") or []
    first_vehicle = vehicles[0] if vehicles else {}

    codes, finding_texts = _extract_findings(vehicles)
    probable_cause = _coalesce(record.get("ProbableCause"))
    narrative_text = _coalesce(probable_cause, " | ".join(finding_texts) if finding_texts else None)

    return {
        "mkey": summary.mkey,
        "ntsb_no": summary.ntsb_no,
        "event_date": summary.event_date,
        "city": summary.city,
        "state": summary.state,
        "country": summary.country,
        "narrative_text": narrative_text,
        "aircraft_type": _extract_aircraft_type(first_vehicle),
        "phase_of_flight": _extract_phase(first_vehicle),
        "cause_codes": "|".join(codes) if codes else None,
    }


def process_ntsb_carol(
    output_csv: str,
    max_records: int,
    page_size: int,
    workers: int,
    start_date: str,
    end_date: str,
) -> pd.DataFrame:
    http = requests.Session()
    http.headers.update({"User-Agent": "airspace-collision-prevention/1.0"})

    session_id = create_session(http)
    summaries = fetch_case_summaries(
        http=http,
        session_id=session_id,
        max_records=max_records,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Collected {len(summaries)} case summaries. Fetching details...")

    rows: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_summary = {
            executor.submit(fetch_case_record, http, summary.mkey): summary for summary in summaries
        }
        completed = 0
        for future in concurrent.futures.as_completed(future_to_summary):
            summary = future_to_summary[future]
            try:
                record = future.result()
                rows.append(build_row(summary, record))
            except Exception as exc:  # noqa: BLE001
                print(f"Skipping mkey={summary.mkey} due to error: {exc}")
            finally:
                completed += 1
                if completed % 100 == 0 or completed == len(summaries):
                    print(f"Processed {completed}/{len(summaries)} records...")

    df = pd.DataFrame(rows)
    if not df.empty:
        df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce", utc=True)

    df = df.sort_values(by=["event_date", "mkey"], ascending=[False, False], na_position="last")
    df.to_csv(output_csv, index=False)
    print(f"Saved {len(df)} rows to {output_csv}")
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Build cleaned aviation dataset from NTSB CAROL API")
    parser.add_argument(
        "--output-csv",
        default="data/processed/ntsb_clean.csv",
        help="Where to write cleaned NTSB data",
    )
    parser.add_argument(
        "--max-records",
        type=int,
        default=2000,
        help="Maximum number of cases to fetch",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=500,
        help="Number of case summaries fetched per page",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Parallel workers for case detail calls",
    )
    parser.add_argument(
        "--start-date",
        default="01/01/2018",
        help="Start date (MM/DD/YYYY) for EventDate filter",
    )
    parser.add_argument(
        "--end-date",
        default="12/31/2026",
        help="End date (MM/DD/YYYY) for EventDate filter",
    )
    args = parser.parse_args()

    process_ntsb_carol(
        output_csv=args.output_csv,
        max_records=args.max_records,
        page_size=args.page_size,
        workers=args.workers,
        start_date=args.start_date,
        end_date=args.end_date,
    )


if __name__ == "__main__":
    main()
