export class ArtifactStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactStoreError";
  }
}

export class ArtifactHashMismatchError extends ArtifactStoreError {
  constructor(expected: string, actual: string) {
    super(`artifact id mismatch: expected ${expected}, got ${actual}`);
    this.name = "ArtifactHashMismatchError";
  }
}

export class ArtifactNotFoundError extends ArtifactStoreError {
  constructor(id: string) {
    super(`artifact not found: ${id}`);
    this.name = "ArtifactNotFoundError";
  }
}

export class ImmutabilityViolationError extends ArtifactStoreError {
  constructor(message: string) {
    super(message);
    this.name = "ImmutabilityViolationError";
  }
}
