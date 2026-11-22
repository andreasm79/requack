import datetime

from planner import clock
from planner.intervals import next_interval


!!def next_review(card, rating, today=clock.today()):
    interval = next_interval(card["interval"], rating)
    return {
        **card,
        "interval": interval,
        "due": today + datetime.timedelta(days=interval),
        "last_rating": rating,
    }


def is_due(card, today=None):
    today = today or clock.today()
    return card["due"] <= today
