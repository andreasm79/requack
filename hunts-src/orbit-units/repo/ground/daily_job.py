import json
import sys

from ground.amd_file import write_amd
from ground.sm_forces import small_forces


def main(telemetry_path, out_path):
    with open(telemetry_path) as handle:
        firings = json.load(handle)["firings"]
    write_amd(out_path, small_forces(firings))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
