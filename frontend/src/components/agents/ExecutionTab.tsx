import { useEffect, useState } from 'react';
import { Clock, Play, CheckCircle, XCircle, Loader } from 'lucide-react';
import { agentApi } from '../../api/agentApi';
import ErrorBanner from '../shared/ErrorBanner';
import type { ExecutionSummary } from '../../types/agent';

interface ExecutionTabProps {
  agentId: string;
}

export default function ExecutionTab({ agentId }: ExecutionTabProps) {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  const fetchExecutions = () => {
    setLoading(true);
    setError(null);
    agentApi.listExecutions(agentId)
      .then(setExecutions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExecutions();
  }, [agentId]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader className="w-5 h-5 text-[#868E96] animate-spin" />
      <span className="ml-2 text-sm text-[#868E96]">Loading executions...</span>
    </div>
  );

  if (error) return <ErrorBanner message={error} onDismiss={() => setError(null)} />;

  if (executions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-[#DEE2E6] mx-auto mb-3" />
        <p className="text-sm text-[#868E96]">No executions yet. Run a test to see execution traces.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#495057]">Execution History ({executions.length})</h3>
        <button
          onClick={fetchExecutions}
          className="text-xs text-[#868E96] hover:text-[#212529] transition-colors flex items-center gap-1"
        >
          <Clock className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="space-y-2">
        {executions.map((exec) => (
          <div
            key={exec.execution_id}
            className="border border-[#DEE2E6] rounded-lg p-4 hover:border-[#ADB5BD] transition-colors cursor-pointer"
            onClick={() => setSelectedExecution(selectedExecution === exec.execution_id ? null : exec.execution_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {exec.status === 'completed' || exec.status === 'passed' ? (
                  <CheckCircle className="w-5 h-5 text-[#2F9E44]" />
                ) : exec.status === 'failed' || exec.status === 'error' ? (
                  <XCircle className="w-5 h-5 text-[#C0392B]" />
                ) : (
                  <Clock className="w-5 h-5 text-[#E67700]" />
                )}
                <div>
                  <span className="text-sm font-medium text-[#212529]">
                    {exec.test_id ?? exec.workflow_id}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#868E96] mt-0.5">
                    <span>{exec.execution_id}</span>
                    <span>·</span>
                    <span>{exec.steps} steps</span>
                    <span>·</span>
                    <span>{new Date(exec.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                exec.status === 'completed' || exec.status === 'passed'
                  ? 'bg-[#EBFBEE] text-[#2F9E44]'
                  : 'bg-[#FDECEA] text-[#C0392B]'
              }`}>
                {exec.status}
              </span>
            </div>

            {selectedExecution === exec.execution_id && (
              <div className="mt-3 pt-3 border-t border-[#DEE2E6] text-sm text-[#495057]">
                <p><span className="text-[#868E96]">Final message:</span> {exec.final_message}</p>
                <p className="mt-1"><span className="text-[#868E96]">Workflow:</span> {exec.workflow_id}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}