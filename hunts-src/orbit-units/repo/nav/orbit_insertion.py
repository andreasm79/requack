from ground.amd_file import read_amd
from nav.constants import MIN_SAFE_PERIAPSIS_KM, TARGET_PERIAPSIS_KM
from nav.trajectory import corrected_periapsis


def plan_insertion(amd_paths, predicted_km, km_per_mps):
    records = [record for path in amd_paths for record in read_amd(path)]
    periapsis = corrected_periapsis(predicted_km, records, km_per_mps)
    if periapsis < MIN_SAFE_PERIAPSIS_KM:
        raise RuntimeError(f"periapsis {periapsis:.0f} km is below the safe limit")
    return {
        "periapsis_km": periapsis,
        "error_km": periapsis - TARGET_PERIAPSIS_KM,
    }
