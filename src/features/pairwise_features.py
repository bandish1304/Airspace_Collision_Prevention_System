"""Pairwise feature engineering utilities for aircraft records."""

from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping

EARTH_RADIUS_NM = 3440.065
HORIZONTAL_RISK_THRESHOLD_NM = 3.0
VERTICAL_RISK_THRESHOLD_FEET = 1000.0
TIME_TO_CPA_RISK_THRESHOLD_MIN = 5.0
CPA_DISTANCE_RISK_THRESHOLD_NM = 3.0
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_lat_lon(record: Mapping[str, Any]) -> tuple[float, float]:
    latitude = _to_float(record.get("latitude"))
    if latitude is None:
        latitude = _to_float(record.get("lat"))

    longitude = _to_float(record.get("longitude"))
    if longitude is None:
        longitude = _to_float(record.get("lon"))

    if latitude is None or longitude is None:
        raise ValueError("Aircraft record is missing latitude/longitude coordinates.")

    return latitude, longitude


def _extract_heading_deg(record: Mapping[str, Any]) -> float:
    heading = _to_float(record.get("heading"))
    if heading is None:
        heading = _to_float(record.get("track"))
    if heading is None:
        heading = _to_float(record.get("bearing"))

    if heading is None:
        raise ValueError("Aircraft record is missing heading in degrees.")

    # Normalize to [0, 360) so wrap-around values compare correctly.
    return heading % 360.0


def _extract_altitude_feet(record: Mapping[str, Any]) -> float:
    altitude = _to_float(record.get("altitude"))
    if altitude is None:
        altitude = _to_float(record.get("altitude_ft"))
    if altitude is None:
        altitude = _to_float(record.get("geo_altitude_ft"))
    if altitude is None:
        altitude = _to_float(record.get("baro_altitude_ft"))

    if altitude is None:
        raise ValueError("Aircraft record is missing altitude in feet.")

    return altitude


def _extract_velocity_knots(record: Mapping[str, Any]) -> float:
    velocity = _to_float(record.get("velocity"))
    if velocity is None:
        velocity = _to_float(record.get("speed"))
    if velocity is None:
        velocity = _to_float(record.get("ground_speed"))
    if velocity is None:
        velocity = _to_float(record.get("groundspeed"))

    if velocity is None:
        raise ValueError("Aircraft record is missing velocity in knots.")

    if velocity < 0:
        raise ValueError("Aircraft velocity cannot be negative.")

    return velocity


def _extract_callsign(record: Mapping[str, Any]) -> str:
    raw = record.get("callsign")
    if raw is None:
        raw = record.get("icao24")

    if raw is None:
        raise ValueError("Aircraft record is missing callsign/identifier.")

    callsign = str(raw).strip()
    if not callsign:
        raise ValueError("Aircraft record has an empty callsign/identifier.")

    return callsign


def _extract_timestamp_seconds(record: Mapping[str, Any]) -> float | None:
    """Extract a record timestamp as Unix seconds if available."""
    raw = record.get("timestamp")
    if raw is None:
        raw = record.get("time")
    if raw is None:
        raw = record.get("last_contact")

    if raw is None:
        return None

    if isinstance(raw, datetime):
        dt = raw if raw.tzinfo is not None else raw.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    numeric = _to_float(raw)
    if numeric is not None:
        return numeric

    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(text)
            dt = dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except ValueError:
            return None

    return None


def haversine_distance_nm(
    aircraft_a: Mapping[str, Any],
    aircraft_b: Mapping[str, Any],
) -> float:
    """Compute great-circle distance between two aircraft records in nautical miles."""
    lat1_deg, lon1_deg = _extract_lat_lon(aircraft_a)
    lat2_deg, lon2_deg = _extract_lat_lon(aircraft_b)

    lat1 = math.radians(lat1_deg)
    lon1 = math.radians(lon1_deg)
    lat2 = math.radians(lat2_deg)
    lon2 = math.radians(lon2_deg)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    hav = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    )
    central_angle = 2.0 * math.asin(math.sqrt(hav))

    return EARTH_RADIUS_NM * central_angle


def compute_closing_speed_knots(
    previous_aircraft_a: Mapping[str, Any],
    previous_aircraft_b: Mapping[str, Any],
    current_aircraft_a: Mapping[str, Any],
    current_aircraft_b: Mapping[str, Any],
    time_delta_seconds: float | None = None,
) -> float:
    """Compute pair closing speed in knots; positive means aircraft are getting closer."""
    previous_distance_nm = haversine_distance_nm(previous_aircraft_a, previous_aircraft_b)
    current_distance_nm = haversine_distance_nm(current_aircraft_a, current_aircraft_b)

    delta_seconds = _to_float(time_delta_seconds)
    if delta_seconds is None:
        previous_time = _extract_timestamp_seconds(previous_aircraft_a)
        current_time = _extract_timestamp_seconds(current_aircraft_a)
        if previous_time is None or current_time is None:
            previous_time = _extract_timestamp_seconds(previous_aircraft_b)
            current_time = _extract_timestamp_seconds(current_aircraft_b)

        if previous_time is None or current_time is None:
            raise ValueError(
                "Could not infer time delta. Provide time_delta_seconds or timestamps in records."
            )

        delta_seconds = current_time - previous_time

    if delta_seconds <= 0:
        raise ValueError("time_delta_seconds must be positive.")

    distance_decrease_nm = previous_distance_nm - current_distance_nm
    delta_hours = delta_seconds / 3600.0
    return distance_decrease_nm / delta_hours


def compute_bearing_difference_deg(
    aircraft_a: Mapping[str, Any],
    aircraft_b: Mapping[str, Any],
) -> float:
    """Compute the absolute smallest heading difference between two aircraft in degrees."""
    heading_a = _extract_heading_deg(aircraft_a)
    heading_b = _extract_heading_deg(aircraft_b)

    raw_diff = abs(heading_a - heading_b)
    return min(raw_diff, 360.0 - raw_diff)


def compute_vertical_separation_feet(
    aircraft_a: Mapping[str, Any],
    aircraft_b: Mapping[str, Any],
) -> float:
    """Compute absolute altitude separation between two aircraft in feet."""
    altitude_a = _extract_altitude_feet(aircraft_a)
    altitude_b = _extract_altitude_feet(aircraft_b)
    return abs(altitude_a - altitude_b)


def _project_position(
    aircraft: Mapping[str, Any],
    delta_seconds: float,
) -> dict[str, float]:
    """Project aircraft position forward by delta_seconds using current heading and speed."""
    latitude_deg, longitude_deg = _extract_lat_lon(aircraft)
    heading_deg = _extract_heading_deg(aircraft)
    speed_knots = _extract_velocity_knots(aircraft)

    distance_nm = speed_knots * (delta_seconds / 3600.0)
    angular_distance = distance_nm / EARTH_RADIUS_NM

    lat1 = math.radians(latitude_deg)
    lon1 = math.radians(longitude_deg)
    bearing = math.radians(heading_deg)

    sin_lat1 = math.sin(lat1)
    cos_lat1 = math.cos(lat1)
    sin_ang = math.sin(angular_distance)
    cos_ang = math.cos(angular_distance)

    lat2 = math.asin(sin_lat1 * cos_ang + cos_lat1 * sin_ang * math.cos(bearing))
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * sin_ang * cos_lat1,
        cos_ang - sin_lat1 * math.sin(lat2),
    )

    lon2 = (lon2 + math.pi) % (2.0 * math.pi) - math.pi

    return {
        "latitude": math.degrees(lat2),
        "longitude": math.degrees(lon2),
    }


def compute_time_to_cpa(
    aircraft_a: Mapping[str, Any],
    aircraft_b: Mapping[str, Any],
    horizon_seconds: int = 600,
    step_seconds: int = 5,
) -> tuple[float, float]:
    """Return time-to-CPA (minutes) and CPA distance (NM) over a projected future horizon."""
    if horizon_seconds <= 0:
        raise ValueError("horizon_seconds must be positive.")
    if step_seconds <= 0:
        raise ValueError("step_seconds must be positive.")

    best_time_seconds = 0.0
    best_distance_nm = haversine_distance_nm(aircraft_a, aircraft_b)

    for t_seconds in range(0, horizon_seconds + 1, step_seconds):
        projected_a = _project_position(aircraft_a, float(t_seconds))
        projected_b = _project_position(aircraft_b, float(t_seconds))
        distance_nm = haversine_distance_nm(projected_a, projected_b)

        if distance_nm < best_distance_nm:
            best_distance_nm = distance_nm
            best_time_seconds = float(t_seconds)

    return best_time_seconds / 60.0, best_distance_nm


def label_collision_risk_pair(
    horizontal_separation_nm: float,
    vertical_separation_feet: float,
    time_to_cpa_min: float,
    cpa_distance_nm: float,
) -> int:
    """Label pair as 1 (risk) or 0 (safe) using Week 2 collision-risk rules."""
    horizontal_and_vertical_risk = (
        horizontal_separation_nm < HORIZONTAL_RISK_THRESHOLD_NM
        and vertical_separation_feet < VERTICAL_RISK_THRESHOLD_FEET
    )
    cpa_risk = (
        time_to_cpa_min < TIME_TO_CPA_RISK_THRESHOLD_MIN
        and cpa_distance_nm < CPA_DISTANCE_RISK_THRESHOLD_NM
    )

    return int(horizontal_and_vertical_risk or cpa_risk)


def generate_aircraft_pairs_within_radius(
    aircraft_records: Iterable[Mapping[str, Any]],
    max_distance_nm: float = 50.0,
) -> list[tuple[Mapping[str, Any], Mapping[str, Any], float]]:
    """Generate unique aircraft pairs within max_distance_nm from a single timestep."""
    if max_distance_nm <= 0:
        raise ValueError("max_distance_nm must be positive.")

    records = list(aircraft_records)
    pairs: list[tuple[Mapping[str, Any], Mapping[str, Any], float]] = []

    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            record_a = records[i]
            record_b = records[j]
            distance_nm = haversine_distance_nm(record_a, record_b)
            if distance_nm <= max_distance_nm:
                pairs.append((record_a, record_b, distance_nm))

    return pairs


def compute_pairwise_features_for_timestep(
    current_records: Iterable[Mapping[str, Any]],
    previous_records: Iterable[Mapping[str, Any]],
    max_distance_nm: float = 50.0,
    cpa_horizon_seconds: int = 600,
    cpa_step_seconds: int = 5,
) -> list[dict[str, float | str]]:
    """Compute all five pairwise features for pairs within max_distance_nm at current timestep."""
    previous_by_callsign: dict[str, Mapping[str, Any]] = {}
    for previous in previous_records:
        try:
            previous_by_callsign[_extract_callsign(previous)] = previous
        except ValueError:
            continue

    output_rows: list[dict[str, float | str]] = []

    for current_a, current_b, distance_nm in generate_aircraft_pairs_within_radius(
        current_records,
        max_distance_nm=max_distance_nm,
    ):
        callsign_a = _extract_callsign(current_a)
        callsign_b = _extract_callsign(current_b)

        previous_a = previous_by_callsign.get(callsign_a)
        previous_b = previous_by_callsign.get(callsign_b)
        if previous_a is None or previous_b is None:
            # Closing speed requires both aircraft at the previous timestep.
            continue

        closing_speed_knots = compute_closing_speed_knots(
            previous_a,
            previous_b,
            current_a,
            current_b,
        )
        bearing_difference_deg = compute_bearing_difference_deg(current_a, current_b)
        vertical_separation_feet = compute_vertical_separation_feet(current_a, current_b)
        time_to_cpa_min, cpa_distance_nm = compute_time_to_cpa(
            current_a,
            current_b,
            horizon_seconds=cpa_horizon_seconds,
            step_seconds=cpa_step_seconds,
        )

        label = label_collision_risk_pair(
            horizontal_separation_nm=distance_nm,
            vertical_separation_feet=vertical_separation_feet,
            time_to_cpa_min=time_to_cpa_min,
            cpa_distance_nm=cpa_distance_nm,
        )

        output_rows.append(
            {
                "callsign_a": callsign_a,
                "callsign_b": callsign_b,
                "haversine_distance_nm": distance_nm,
                "closing_speed_knots": closing_speed_knots,
                "bearing_difference_deg": bearing_difference_deg,
                "vertical_separation_feet": vertical_separation_feet,
                "time_to_cpa_min": time_to_cpa_min,
                "cpa_distance_nm": cpa_distance_nm,
                "label": label,
            }
        )

    return output_rows


def analyze_class_distribution(
    feature_rows: Iterable[Mapping[str, Any]],
) -> dict[str, float | int]:
    """Compute positive/negative class counts and ratios from labeled feature rows."""
    positive_count = 0
    negative_count = 0

    for row in feature_rows:
        label_value = _to_float(row.get("label"))
        if label_value is None:
            raise ValueError("Feature row is missing label.")

        if int(label_value) == 1:
            positive_count += 1
        elif int(label_value) == 0:
            negative_count += 1
        else:
            raise ValueError("Label must be 0 or 1.")

    total_count = positive_count + negative_count
    positive_ratio = (positive_count / total_count) if total_count else 0.0
    negative_ratio = (negative_count / total_count) if total_count else 0.0

    negative_to_positive_ratio = (
        (negative_count / positive_count) if positive_count > 0 else float("inf")
    )

    return {
        "positive_count": positive_count,
        "negative_count": negative_count,
        "total_count": total_count,
        "positive_ratio": positive_ratio,
        "negative_ratio": negative_ratio,
        "negative_to_positive_ratio": negative_to_positive_ratio,
    }


def print_class_distribution(distribution: Mapping[str, float | int]) -> None:
    """Print class distribution summary for quick terminal inspection."""
    positive_count = int(distribution["positive_count"])
    negative_count = int(distribution["negative_count"])
    total_count = int(distribution["total_count"])
    positive_ratio = float(distribution["positive_ratio"])
    negative_ratio = float(distribution["negative_ratio"])
    negative_to_positive_ratio = float(distribution["negative_to_positive_ratio"])

    print(
        "Class distribution: "
        f"positive={positive_count}, negative={negative_count}, total={total_count}"
    )
    print(
        "Class ratio: "
        f"positive={positive_ratio:.6f} ({positive_ratio * 100:.3f}%), "
        f"negative={negative_ratio:.6f} ({negative_ratio * 100:.3f}%), "
        f"negative_to_positive={negative_to_positive_ratio:.3f}"
    )


def log_class_distribution_to_mlflow(
    distribution: Mapping[str, float | int],
    experiment_name: str = "collision-risk-models",
    run_name: str = "data-preparation-v1",
) -> None:
    """Log class distribution metrics to an MLflow run."""
    import mlflow

    mlflow.set_experiment(experiment_name)

    with mlflow.start_run(run_name=run_name):
        mlflow.log_metric("class_positive_count", int(distribution["positive_count"]))
        mlflow.log_metric("class_negative_count", int(distribution["negative_count"]))
        mlflow.log_metric("class_total_count", int(distribution["total_count"]))
        mlflow.log_metric("class_positive_ratio", float(distribution["positive_ratio"]))
        mlflow.log_metric("class_negative_ratio", float(distribution["negative_ratio"]))
        mlflow.log_metric(
            "class_negative_to_positive_ratio",
            float(distribution["negative_to_positive_ratio"]),
        )


def analyze_print_and_log_class_distribution(
    feature_rows: Iterable[Mapping[str, Any]],
    experiment_name: str = "collision-risk-models",
    run_name: str = "data-preparation-v1",
) -> dict[str, float | int]:
    """Convenience wrapper for Step 8: analyze, print, and log class imbalance."""
    distribution = analyze_class_distribution(feature_rows)
    print_class_distribution(distribution)
    log_class_distribution_to_mlflow(
        distribution,
        experiment_name=experiment_name,
        run_name=run_name,
    )
    return distribution


def compute_feature_statistics(
    feature_rows: Iterable[Mapping[str, Any]],
    feature_columns: Iterable[str] | None = None,
) -> dict[str, dict[str, float]]:
    """Compute summary statistics for numeric feature columns."""
    import pandas as pd

    rows = [dict(row) for row in feature_rows]
    if not rows:
        raise ValueError("feature_rows is empty.")

    frame = pd.DataFrame(rows)

    columns = list(feature_columns) if feature_columns is not None else list(frame.columns)
    excluded = {"label", "callsign_a", "callsign_b"}
    columns = [col for col in columns if col in frame.columns and col not in excluded]
    if not columns:
        raise ValueError("No feature columns available for statistics.")

    numeric_frame = frame[columns].apply(pd.to_numeric, errors="coerce")
    valid_columns = [col for col in columns if numeric_frame[col].notna().any()]
    if not valid_columns:
        raise ValueError("No numeric feature columns available for statistics.")

    stats_frame = numeric_frame[valid_columns].describe(
        percentiles=[0.25, 0.5, 0.75]
    ).transpose()

    feature_stats: dict[str, dict[str, float]] = {}
    for feature_name, row in stats_frame.iterrows():
        feature_stats[str(feature_name)] = {
            "count": float(row["count"]),
            "mean": float(row["mean"]),
            "std": float(row["std"]),
            "min": float(row["min"]),
            "p25": float(row["25%"]),
            "p50": float(row["50%"]),
            "p75": float(row["75%"]),
            "max": float(row["max"]),
        }

    return feature_stats


def log_data_preparation_to_mlflow(
    feature_rows: Iterable[Mapping[str, Any]],
    smote_summary: Mapping[str, int | float] | None = None,
    experiment_name: str = "collision-risk-models",
    run_name: str = "data-preparation-v1",
    feature_columns: Iterable[str] | None = None,
) -> dict[str, Any]:
    """Step 13: log class distribution, feature stats, and SMOTE details to MLflow."""
    import mlflow

    rows = [dict(row) for row in feature_rows]
    if not rows:
        raise ValueError("feature_rows is empty.")

    distribution = analyze_class_distribution(rows)
    feature_stats = compute_feature_statistics(rows, feature_columns=feature_columns)

    mlflow.set_experiment(experiment_name)
    with mlflow.start_run(run_name=run_name):
        mlflow.log_metric("class_positive_count", int(distribution["positive_count"]))
        mlflow.log_metric("class_negative_count", int(distribution["negative_count"]))
        mlflow.log_metric("class_total_count", int(distribution["total_count"]))
        mlflow.log_metric("class_positive_ratio", float(distribution["positive_ratio"]))
        mlflow.log_metric("class_negative_ratio", float(distribution["negative_ratio"]))
        mlflow.log_metric(
            "class_negative_to_positive_ratio",
            float(distribution["negative_to_positive_ratio"]),
        )

        for feature_name, stats in feature_stats.items():
            safe_feature_name = feature_name.replace(" ", "_")
            for stat_name, value in stats.items():
                mlflow.log_metric(f"feature_{safe_feature_name}_{stat_name}", float(value))

        if smote_summary is not None:
            for key, value in smote_summary.items():
                if key.startswith("smote_"):
                    mlflow.log_param(key, value)
                else:
                    mlflow.log_metric(f"smote_{key}", float(value))

    return {
        "distribution": distribution,
        "feature_statistics": feature_stats,
        "smote_summary": dict(smote_summary) if smote_summary is not None else None,
        "experiment_name": experiment_name,
        "run_name": run_name,
    }


def apply_smote_to_training_set(
    X_train: Any,
    y_train: Any,
    random_state: int = 42,
    k_neighbors: int = 5,
) -> tuple[Any, Any, dict[str, int | float]]:
    """Apply SMOTE to the training set only and return balanced data plus summary stats."""
    from imblearn.over_sampling import SMOTE

    if k_neighbors <= 0:
        raise ValueError("k_neighbors must be positive.")

    before_counts = Counter(int(v) for v in y_train)

    smote = SMOTE(random_state=random_state, k_neighbors=k_neighbors)
    X_resampled, y_resampled = smote.fit_resample(X_train, y_train)

    after_counts = Counter(int(v) for v in y_resampled)

    summary: dict[str, int | float] = {
        "before_negative": before_counts.get(0, 0),
        "before_positive": before_counts.get(1, 0),
        "after_negative": after_counts.get(0, 0),
        "after_positive": after_counts.get(1, 0),
        "smote_random_state": random_state,
        "smote_k_neighbors": k_neighbors,
    }

    return X_resampled, y_resampled, summary


def compute_cost_sensitive_class_weights(
    false_negative_penalty: float = 10.0,
    false_positive_penalty: float = 1.0,
) -> dict[int, float]:
    """Return binary class weights with stronger penalty on missed collision-risk examples."""
    if false_negative_penalty <= 0 or false_positive_penalty <= 0:
        raise ValueError("Class penalties must be positive.")

    if false_negative_penalty < false_positive_penalty:
        raise ValueError(
            "false_negative_penalty should be greater than or equal to "
            "false_positive_penalty for cost-sensitive collision-risk modeling."
        )

    # Class 1 is collision risk (positive); higher weight penalizes false negatives more.
    return {
        0: float(false_positive_penalty),
        1: float(false_negative_penalty),
    }


def split_features_and_labels_stratified(
    feature_rows: Iterable[Mapping[str, Any]],
    train_size: float = 0.70,
    val_size: float = 0.15,
    test_size: float = 0.15,
    random_state: int = 42,
) -> dict[str, list[dict[str, Any]] | list[int]]:
    """Create stratified train/validation/test splits without leakage between sets."""
    from sklearn.model_selection import train_test_split

    total_size = train_size + val_size + test_size
    if abs(total_size - 1.0) > 1e-9:
        raise ValueError("train_size + val_size + test_size must sum to 1.0")

    rows = list(feature_rows)
    if not rows:
        raise ValueError("feature_rows is empty.")

    labels: list[int] = []
    cleaned_rows: list[dict[str, Any]] = []
    for row in rows:
        label_value = _to_float(row.get("label"))
        if label_value is None:
            raise ValueError("All rows must include a label field.")

        label = int(label_value)
        if label not in (0, 1):
            raise ValueError("Labels must be 0 or 1.")

        labels.append(label)
        cleaned_rows.append(dict(row))

    # First split: train (70%) vs temp (30%), stratified by label.
    train_rows, temp_rows, y_train, y_temp = train_test_split(
        cleaned_rows,
        labels,
        test_size=(1.0 - train_size),
        random_state=random_state,
        stratify=labels,
    )

    # Second split: split temp into val/test with 50/50 of temp => 15/15 overall.
    test_fraction_of_temp = test_size / (val_size + test_size)
    val_rows, test_rows, y_val, y_test = train_test_split(
        temp_rows,
        y_temp,
        test_size=test_fraction_of_temp,
        random_state=random_state,
        stratify=y_temp,
    )

    return {
        "X_train": train_rows,
        "y_train": y_train,
        "X_val": val_rows,
        "y_val": y_val,
        "X_test": test_rows,
        "y_test": y_test,
    }


def save_feature_splits_to_csv(
    splits: Mapping[str, Any],
    output_dir: Path | None = None,
) -> dict[str, Path]:
    """Save train/val/test feature rows and labels to required CSV outputs."""
    import pandas as pd

    out_dir = output_dir or DEFAULT_PROCESSED_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    def _to_frame(x_rows: Any, y_values: Any) -> pd.DataFrame:
        frame = pd.DataFrame(list(x_rows))
        labels = list(y_values)
        if len(frame) != len(labels):
            raise ValueError("Feature rows and labels length mismatch.")

        # Keep label column aligned with split labels.
        frame["label"] = labels
        return frame

    train_df = _to_frame(splits["X_train"], splits["y_train"])
    val_df = _to_frame(splits["X_val"], splits["y_val"])
    test_df = _to_frame(splits["X_test"], splits["y_test"])

    train_path = out_dir / "features_train.csv"
    val_path = out_dir / "features_val.csv"
    test_path = out_dir / "features_test.csv"

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    return {
        "train": train_path,
        "val": val_path,
        "test": test_path,
    }
