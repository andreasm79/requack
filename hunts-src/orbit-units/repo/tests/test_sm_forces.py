from ground.sm_forces import small_forces


FIRINGS = [
    {"time": "1999-05-01T10:00:00Z", "thruster": "RCS-1", "duration_s": 2.0},
    {"time": "1999-05-01T10:00:05Z", "thruster": "RCS-2", "duration_s": 0.0},
    {"time": "1999-05-01T10:00:09Z", "thruster": "TCM-1", "duration_s": 1.5},
]


def test_one_record_per_real_firing():
    assert len(small_forces(FIRINGS)) == 2


def test_impulse_is_positive():
    assert all(record["impulse"] > 0 for record in small_forces(FIRINGS))


def test_longer_firing_means_more_impulse():
    short = small_forces([{**FIRINGS[0], "duration_s": 1.0}])[0]["impulse"]
    long = small_forces([{**FIRINGS[0], "duration_s": 3.0}])[0]["impulse"]
    assert long > short
