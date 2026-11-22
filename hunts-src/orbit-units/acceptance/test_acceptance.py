from ground.sm_forces import small_forces


def test_impulse_follows_the_interface_spec_in_newton_seconds():
    record = small_forces([{"time": "1999-05-01T10:00:00Z", "thruster": "RCS-1", "duration_s": 2.0}])[0]
    assert abs(record["impulse"] - 0.2 * 4.448222 * 2.0) < 1e-6, f"impulse was {record['impulse']}"


def test_main_engine_firing_in_newton_seconds():
    record = small_forces([{"time": "1999-05-01T10:00:09Z", "thruster": "TCM-1", "duration_s": 1.5}])[0]
    assert abs(record["impulse"] - 5.0 * 4.448222 * 1.5) < 1e-6, f"impulse was {record['impulse']}"
