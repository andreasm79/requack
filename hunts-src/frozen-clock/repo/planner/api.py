from planner.schedule import is_due, next_review
from planner.store import CardStore

store = CardStore()


def review(card_id, rating):
    card = store.get(card_id)
    updated = next_review(card, rating)
    store.put(updated)
    return {"id": card_id, "due": updated["due"].isoformat()}


def due_cards():
    return [card for card in store.all() if is_due(card)]
