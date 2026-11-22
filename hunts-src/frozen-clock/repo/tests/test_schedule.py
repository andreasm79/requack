import datetime

from planner.schedule import is_due, next_review


def card(**fields):
    return {"id": "two-sum", "interval": 0, "due": None, **fields}


def test_first_good_review_is_four_days_out():
    today = datetime.date.today()
    updated = next_review(card(), "good")
    assert updated["due"] == today + datetime.timedelta(days=4)


def test_explicit_date_is_respected():
    start = datetime.date(2026, 11, 1)
    assert next_review(card(), "again", today=start)["due"] == datetime.date(2026, 11, 2)


def test_due_today_counts_as_due():
    today = datetime.date(2026, 11, 22)
    assert is_due(card(due=today), today=today)
