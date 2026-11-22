import json

from sensor.interpreter import ContentInterpreter
from sensor.ipc import IpcMonitor


def instance(criteria):
    return {"id": "t", "type": "ipc", "name": "test", "criteria": criteria}


def test_channel_291_does_not_crash_the_sensor():
    with open("content/channel_291.json") as handle:
        channel = json.load(handle)
    monitor = IpcMonitor()
    inputs = monitor.inputs_for(monitor._next_event())
    list(ContentInterpreter(channel["instances"]).evaluate(inputs))


def test_a_criterion_past_the_inputs_never_matches():
    interpreter = ContentInterpreter([instance(["*"] * 20 + ["anything"])])
    assert list(interpreter.evaluate(["x"] * 20)) == []


def test_real_matches_still_fire():
    interpreter = ContentInterpreter([instance(["spoolss"] + ["*"] * 20)])
    monitor = IpcMonitor()
    assert len(list(interpreter.evaluate(monitor.inputs_for(monitor._next_event())))) == 1
