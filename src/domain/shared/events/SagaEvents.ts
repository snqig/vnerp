export interface SagaCompensateWorkOrderCompletion {
  sagaId: string;
  workOrderId: number;
  failedStep: string;
}

export interface SagaCompensateMaterialIssue {
  sagaId: string;
  pickOrderId: number;
  failedStep: string;
}

export interface SagaCompensateWorkReport {
  sagaId: string;
  reportId: number;
  failedStep: string;
}

export interface SagaCompleted {
  sagaId: string;
  sagaType: string;
  payload: Record<string, unknown>;
}

export interface SagaFailed {
  sagaId: string;
  sagaType: string;
  failedStep: string;
  errorMessage: string;
}

export interface SagaCompensated {
  sagaId: string;
  sagaType: string;
}