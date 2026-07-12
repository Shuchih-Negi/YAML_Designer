import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AgentSummary } from '../../types/agent';

interface AgentCardProps {
  agent: AgentSummary;
  onDelete: (id: string) => void;
}

export default function AgentCard({ agent, onDelete }: AgentCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white border border-[#DEE2E6] rounded-lg p-4 cursor-pointer hover:border-[#C0392B] transition-colors relative"
      onClick={() => navigate(`/agents/${agent.agent_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/agents/${agent.agent_id}`)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this agent package?')) onDelete(agent.agent_id);
        }}
        className="absolute top-3 right-3 p-1.5 text-[#868E96] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        aria-label={`Delete ${agent.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <h3 className="font-medium text-[#212529] text-base mb-1 pr-8">{agent.name}</h3>
      {agent.description && (
        <p className="text-sm text-[#868E96] line-clamp-2 mb-3">{agent.description}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 bg-[#F1F3F5] text-[#495057] rounded">
          {agent.workflow_count} workflows
        </span>
        <span className="text-xs px-2 py-0.5 bg-[#F1F3F5] text-[#495057] rounded">
          {agent.sub_agent_count} sub-agents
        </span>
        <span className="text-xs px-2 py-0.5 bg-[#F1F3F5] text-[#495057] rounded">
          {agent.stub_count} stubs
        </span>
        {agent.test_count > 0 && (
          <span className="text-xs px-2 py-0.5 bg-[#F1F3F5] text-[#495057] rounded">
            {agent.test_count} tests
          </span>
        )}
      </div>
    </div>
  );
}