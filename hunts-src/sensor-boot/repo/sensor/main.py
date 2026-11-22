import json
import sys

from sensor.interpreter import ContentInterpreter
from sensor.ipc import IpcMonitor
from sensor.templates import load_template_types
from sensor.validator import validate_channel


def boot(channel_path):
    template_types = load_template_types()
    with open(channel_path) as handle:
        channel = json.load(handle)

    validate_channel(channel, template_types)
    interpreter = ContentInterpreter(channel["instances"])

    monitor = IpcMonitor()
    for event in monitor.events():
        for detection in interpreter.evaluate(monitor.inputs_for(event)):
            report(detection)


def report(detection):
    print(f"detection {detection['id']}: {detection['name']}", file=sys.stderr)


if __name__ == "__main__":
    boot(sys.argv[1])
