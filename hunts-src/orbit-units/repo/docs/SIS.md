# AMD file interface (SIS-MSOP-07)

Ground software writes one Angular Momentum Desaturation (AMD) file per day.
Each row is one thruster firing.

| field    | type          | unit                  |
|----------|---------------|-----------------------|
| time     | ISO-8601 UTC  |                       |
| thruster | thruster id   |                       |
| impulse  | float         | newton-seconds (N·s)  |

Producers must write SI units. Navigation reads the file as-is.
