"""Base class for all generated Pydantic models.

Frozen + extra-forbid per docs/STANDARDS.md (immutability default, boundary
validation). Referenced by scripts/codegen.mjs via --base-class; not generated.
"""

from pydantic import BaseModel, ConfigDict


class UscFrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
