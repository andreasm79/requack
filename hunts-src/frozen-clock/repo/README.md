# study-planner

Schedules spaced-repetition reviews for the society's revision app.

- `planner/schedule.py` decides when a card is due next
- `planner/clock.py` wraps the system clock so it can be faked in tests
- `planner/api.py` is the thin layer the web app calls

Run the tests with the Run tests button, or `python -m pytest` locally.
