import datetime

_override = None


def today():
    return _override or datetime.date.today()


def set_today(value):
    global _override
    _override = value


def reset():
    set_today(None)
