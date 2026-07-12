import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { agentApi } from '../api/agentApi';
import ErrorBanner from '../components/shared/ErrorBanner';
import AgentTree from '../components/agents/AgentTree';
import WorkflowPanel from '../components/agents/WorkflowPanel';
import WorkflowGraph from '../components/agents/WorkflowGraph';
import StubPanel from '../components/agents/StubPanel';
import TestCasePanel from '../components/agents/TestCasePanel';
import YamlPreview from '../components/shared/YamlPreview';
import ExecutionTab from '../components/agents/ExecutionTab';
import type { AgentPackage } from '../types/agent';

const TABS = ['Overview', 'Workflows', 'Graph', 'Stubs', 'Tests', 'Execution', 'YAML Preview'] as const;
type Tab = (typeof TABS)[number];

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [pkg, setPkg] = useState<AgentPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    agentApi.getAgent(agentId)
      .then(setPkg)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-6 w-6 border-2 border-[#C0392B] border-t-transparent rounded-full" />
      <span className="ml-3 text-sm text-[#868E96]">Loading agent...</span>
    </div>
  );

  if (error) return <ErrorBanner message={error} />;
  if (!pkg) return <p className="text-sm text-[#868E96] py-8 text-center">Agent not found.</p>;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#212529]">{pkg.agent.name}</h2>
          {pkg.agent.version && (
            <span className="text-xs bg-[#F1F3F5] text-[#495057] px-2 py-0.5 rounded">
              v{pkg.agent.version}
            </span>
          )}
        </div>
        {pkg.agent.description && (
          <p className="text-sm text-[#868E96] mt-1">{pkg.agent.description}</p>
        )}
      </div>

      <div className="border-b border-[#DEE2E6] mb-6">
        <div className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === tab
                  ? 'border-[#C0392B] text-[#212529]'
                  : 'border-transparent text-[#868E96] hover:text-[#495057]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' && (
        <div>
          <h3 className="text-sm font-medium text-[#495057] mb-4">Agent Hierarchy</h3>
          <AgentTree
            agentId={pkg.agent.agent_id}
            name={pkg.agent.name}
            subAgents={pkg.sub_agents}
            workflowCount={pkg.workflows.length}
            stubCount={pkg.stubs.length}
            testCount={pkg.tests.length}
          />
        </div>
      )}

      {activeTab === 'Workflows' && <WorkflowPanel workflows={pkg.workflows} />}
      {activeTab === 'Graph' && <WorkflowGraph workflows={pkg.workflows} />}
      {activeTab === 'Stubs' && <StubPanel stubs={pkg.stubs} />}
      {activeTab === 'Tests' && <TestCasePanel tests={pkg.tests} agentId={agentId ?? ''} />}
      {activeTab === 'Execution' && <ExecutionTab agentId={agentId ?? ''} />}
      {activeTab === 'YAML Preview' && <YamlPreview files={pkg.raw_files} />}
    </div>
  );
}