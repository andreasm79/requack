# SMARS order router

Splits parent orders into child orders and routes them to venues.

- `src/` is the current release (5.0).
- `legacy/smars-4.1/` is kept for reference while 4.1 is phased out.
- `tools/Deploy.java` copies the built jar to every host in `deploy/hosts.txt`
  and restarts the service.

Release 5.0 adds the NYSE Retail Liquidity Program (RLP) using flag `0x08`.
