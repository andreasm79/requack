import csv

FIELDS = ["time", "thruster", "impulse"]


def write_amd(path, records):
    with open(path, "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow({**record, "impulse": f"{record['impulse']:.6f}"})


def read_amd(path):
    with open(path, newline="") as handle:
        return [
            {**row, "impulse": float(row["impulse"])}
            for row in csv.DictReader(handle)
        ]
