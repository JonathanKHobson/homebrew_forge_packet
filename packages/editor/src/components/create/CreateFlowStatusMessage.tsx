import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { StatusPill, type StatusPillTone } from '../forge-ui/index.js';

interface CreateFlowStatusMessageProps {
  state: CreateFlowStatus;
  error?: string;
}

export function CreateFlowStatusMessage({ state, error }: CreateFlowStatusMessageProps) {
  if (state === 'idle' || state === 'dirty') {
    return null;
  }
  const tone = toneForCreateFlowState(state);
  return (
    <div className={`create-flow-status ${state} forge-flow-status`} role={state === 'error' ? 'alert' : 'status'}>
      <StatusPill tone={tone}>{state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : 'Error'}</StatusPill>
      <span>{state === 'saving' ? 'Saving changes...' : state === 'saved' ? 'Saved.' : error || 'Something went wrong.'}</span>
    </div>
  );
}

function toneForCreateFlowState(state: CreateFlowStatus): StatusPillTone {
  if (state === 'saved') {
    return 'success';
  }
  if (state === 'saving') {
    return 'info';
  }
  if (state === 'error') {
    return 'danger';
  }
  return 'neutral';
}
