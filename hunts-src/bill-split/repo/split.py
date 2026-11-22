def split_bill(total, people):
!!    share = round(total / people, 2)
    shares = [share] * people
    if sum(shares) != total:
!!        shares[-1] += total - sum(shares)
    return shares


def describe(total, names):
    shares = split_bill(total, len(names))
    return [f"{name} owes €{share}" for name, share in zip(names, shares)]
