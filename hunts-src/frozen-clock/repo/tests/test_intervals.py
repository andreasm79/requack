from planner.intervals import MAX_DAYS, next_interval


def test_first_review_uses_fixed_steps():
    assert next_interval(0, "again") == 1
    assert next_interval(0, "easy") == 7


def test_good_grows_the_gap():
    assert next_interval(4, "good") == 10


def test_gap_is_capped():
    assert next_interval(170, "easy") == MAX_DAYS
