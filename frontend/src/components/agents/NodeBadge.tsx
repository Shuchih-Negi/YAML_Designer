import type { WorkflowNode } from '../../types/agent';
import StatusBadge from '../shared/StatusBadge';

const NODE_BORDER_COLORS: Record<string, string> = {
  show_message:     '#1971C2',
  ask_user:         '#E67700',
  save_value:       '#495057',
  condition:        '#7048E8',
  invoke_sub_agent: '#3B5BDB',
  run_stub:         '#D9480F',
  finish:           '#2F9E44',
};

interface NodeBadgeProps {
  node: WorkflowNode;
}

export default function NodeBadge({ node }: NodeBadgeProps) {
  const borderColor = NODE_BORDER_COLORS[node.type] ?? '#868E96';

  return (
    <div className="border rounded-md p-3" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div className="flex items-center gap-2 mb-1">
        <StatusBadge type={node.type} />
        <span className="text-sm font-mono text-[#495057]">{node.id}</span>
      </div>
      <div className="text-xs text-[#868E96]">
        {node.message && <div>Message: {node.message}</div>}
        {node.prompt && <div>Prompt: {node.prompt}</div>}
        {node.stub_id && <div>Stub: {node.stub_id}</div>}
        {node.condition && <div>Condition: {node.condition}</div>}
        {node.saves_to && <div>Saves to: {node.saves_to}</div>}
        {node.next && <div>Next: {node.next}</div>}
      </div>
    </div>
  );
}