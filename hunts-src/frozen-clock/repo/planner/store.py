class CardStore:
    def __init__(self):
        self._cards = {}

    def put(self, card):
        self._cards[card["id"]] = card

    def get(self, card_id):
        return self._cards[card_id]

    def all(self):
        return list(self._cards.values())
