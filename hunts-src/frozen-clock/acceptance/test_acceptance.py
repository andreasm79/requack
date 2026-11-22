import datetime

from planner import clock
from planner.schedule import next_review


def test_reviews_follow_the_clock_after_startup():
    try:
        clock.set_today(datetime.date(2030, 1, 10))
        updated = next_review({"id": "a", "interval": 0, "due": None}, "good")
        assert updated["due"] == datetime.date(2030, 1, 14), f"due was {updated['due']}"
    finally:
        clock.reset()


def test_the_next_day_moves_too():
    try:
        clock.set_today(datetime.date(2030, 1, 11))
        updated = next_review({"id": "a", "interval": 0, "due": None}, "again")
        assert updated["due"] == datetime.date(2030, 1, 12), f"due was {updated['due']}"
    finally:
        clock.reset()
