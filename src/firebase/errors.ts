
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  private readonly rawMessage: string;

  constructor(context: SecurityRuleContext) {
    const message = `FirestorePermissionError: Insufficient permissions for ${context.operation} at ${context.path}.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    this.rawMessage = message;
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  public toObject() {
    return {
      message: this.message,
      context: this.context,
    };
  }
}

export function isFirestorePermissionError(
  error: any
): error is FirestorePermissionError {
  return error instanceof FirestorePermissionError;
}
