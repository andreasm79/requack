from sensor.interpreter import ContentInterpreter
from sensor.ipc import IpcMonitor


def instance(criteria):
    return {"id": "t", "type": "ipc", "name": "test", "criteria": criteria}


def sample_inputs():
    monitor = IpcMonitor()
    return monitor.inputs_for(monitor._next_event())


def test_wildcards_match_anything():
    interpreter = ContentInterpreter([instance(["*"] * 21)])
    assert list(interpreter.evaluate(sample_inputs()))


def test_pipe_name_criterion():
    interpreter = ContentInterpreter([instance(["spoolss"] + ["*"] * 20)])
    assert list(interpreter.evaluate(sample_inputs()))


def test_non_matching_criterion():
    interpreter = ContentInterpreter([instance(["lsass"] + ["*"] * 20)])
    assert not list(interpreter.evaluate(sample_inputs()))
