import re


class ContentInterpreter:
    def __init__(self, instances):
        self.instances = [
            {
                **instance,
                "compiled": [
                    None if criterion == "*" else re.compile(criterion)
                    for criterion in instance["criteria"]
                ],
            }
            for instance in instances
        ]

    def evaluate(self, inputs):
        for instance in self.instances:
            if self._matches(instance["compiled"], inputs):
                yield {"id": instance["id"], "name": instance["name"]}

    def _matches(self, compiled, inputs):
        for index, pattern in enumerate(compiled):
            if pattern is None:
                continue
!!            if not pattern.search(inputs[index]):
                return False
        return True
