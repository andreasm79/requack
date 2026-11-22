from shared.thrusters import THRUSTERS


def impulse_for(firing):
    thruster = THRUSTERS[firing["thruster"]]
!!    return thruster["thrust_lbf"] * firing["duration_s"]


def small_forces(firings):
    return [
        {
            "time": firing["time"],
            "thruster": firing["thruster"],
            "impulse": impulse_for(firing),
        }
        for firing in firings
        if firing["duration_s"] > 0
    ]
