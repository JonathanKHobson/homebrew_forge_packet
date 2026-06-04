import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';

interface CreateFlowStatusMessageProps {
  state: CreateFlowStatus;
  error?: string;
}

export function CreateFlowStatusMessage({ state, error }: CreateFlowStatusMessageProps) {
  if (state === 'idle' || state === 'dirty') {
    return null;
  }
  return (
    <p className={`create-flow-status ${state}`} role={state === 'error' ? 'alert' : 'status'}>
      {state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved.' : error || 'Something went wrong.'}
    </p>
  );
}
