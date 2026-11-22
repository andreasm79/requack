FIRST = {"again": 1, "hard": 2, "good": 4, "easy": 7}
GROWTH = {"again": 0.0, "hard": 1.2, "good": 2.5, "easy": 3.2}
MAX_DAYS = 180


def next_interval(previous, rating):
    if previous == 0:
        return FIRST[rating]
    if rating == "again":
        return 1
    return min(MAX_DAYS, max(previous + 1, round(previous * GROWTH[rating])))
