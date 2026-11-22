from nav.constants import SPACECRAFT_MASS_KG


def delta_v(records):
    total_impulse_ns = sum(record["impulse"] for record in records)
    return total_impulse_ns / SPACECRAFT_MASS_KG


def corrected_periapsis(predicted_km, records, km_per_mps):
    return predicted_km - delta_v(records) * km_per_mps
