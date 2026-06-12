export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeError";
  }
}

export class ParserError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "ParserError";
  }
}

export class ProcessIrError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "ProcessIrError";
  }
}

export class ObligationLedgerError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "ObligationLedgerError";
  }
}
