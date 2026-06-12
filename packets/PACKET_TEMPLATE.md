# Packet <ID>: <title>
**Subsystem:** <kernel|store|runtime|...>     **Depends on:** <packet ids>
**Spec:** specs/<x>/SPEC.md §<n>              **Blueprint:** docs/BLUEPRINT.md §<n>
**Fixtures in scope:** <list — these must pass at exit>
**Out of scope:** <explicit exclusions>
**Deliverables:** <files/exports>
**Exit:** `make verify` green + listed fixtures pass + self-review note in commit description.
**Protected paths touched:** <none | list + 'Approved-Protected-Change' trailer required>
