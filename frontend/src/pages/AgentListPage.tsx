import { useEffect, useState } from 'react';
import { agentApi } from '../api/agentApi';
import ErrorBanner from '../components/shared/ErrorBanner';
import EmptyState from '../components/shared/EmptyState';
import AgentCard from '../components/agents/AgentCard';
import type { AgentSummary } from '../types/agent';

export default function AgentListPage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = () => {
    setLoading(true);
    setError(null);
    agentApi.listAgents()
      .then(setAgents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleDelete = (agentId: string) => {
    agentApi.deleteAgent(agentId)
      .then(() => setAgents((prev) => prev.filter((a) => a.agent_id !== agentId)))
      .catch((err: Error) => setError(err.message));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#212529] mb-4">Agents</h2>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-[#C0392B] border-t-transparent rounded-full" />
          <span className="ml-3 text-sm text-[#868E96]">Loading agents...</span>
        </div>
      )}

      {!loading && !error && agents.length === 0 && <EmptyState />}

      {!loading && agents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.agent_id} agent={agent} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}