import time


class IpcMonitor:
    def events(self):
        while True:
            yield self._next_event()
            time.sleep(0.01)

    def _next_event(self):
        return {"pipe": "spoolss", "client_pid": 4120, "server_pid": 812}

    def inputs_for(self, event):
        return [
            event["pipe"], str(event["client_pid"]), "svchost.exe",
            str(event["server_pid"]), "spoolsv.exe", "0x12019f", "1", "high",
            "S-1-5-18", "services.exe", "", "Microsoft Windows", "true", "false",
!!            "ncacn_np", "spoolss", "pkt_privacy", "identify", "0", "6612",
        ]
