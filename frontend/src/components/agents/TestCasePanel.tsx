import { useState } from 'react';
import { Play, Loader, CheckCircle, XCircle } from 'lucide-react';
import { agentApi } from '../../api/agentApi';
import type { TestCase, TestResult } from '../../types/agent';

interface TestCasePanelProps {
  tests: TestCase[];
  agentId: string;
}

export default function TestCasePanel({ tests, agentId }: TestCasePanelProps) {
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [runningAll, setRunningAll] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [error, setError] = useState<string | null>(null);

  if (tests.length === 0) {
    return <p className="text-sm text-[#868E96] py-8 text-center">No test cases in this package.</p>;
  }

  const handleRunTest = async (testId: string) => {
    setRunningTests((prev) => new Set(prev).add(testId));
    setError(null);
    try {
      const result = await agentApi.runTest(agentId, testId);
      setResults((prev) => ({ ...prev, [testId]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    setError(null);
    try {
      const allResults = await agentApi.runAllTests(agentId);
      for (const r of allResults.results) {
        if (r.execution_id) {
          try {
            const detail = await agentApi.runTest(agentId, r.test_id);
            setResults((prev) => ({ ...prev, [r.test_id]: detail }));
          } catch {}
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Run all failed');
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleRunAll}
          disabled={runningAll}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-red-800 disabled:bg-[#F1F3F5] disabled:text-[#868E96] disabled:cursor-not-allowed transition-colors"
        >
          {runningAll ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {runningAll ? 'Running All...' : 'Run All Tests'}
        </button>
        {error && <span className="text-xs text-[#C0392B]">{error}</span>}
      </div>

      <div className="space-y-4">
        {tests.map((test) => {
          const result = results[test.test_id];
          const isRunning = runningTests.has(test.test_id);

          return (
            <div key={test.test_id} className="border border-[#DEE2E6] rounded-lg p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h4 className="font-medium text-[#212529]">{test.name}</h4>
                  <p className="text-xs text-[#868E96] font-mono">{test.test_id}</p>
                </div>
                {result && (
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                    result.status === 'completed' ? 'bg-[#EBFBEE] text-[#2F9E44]' : 'bg-[#FDECEA] text-[#C0392B]'
                  }`}>
                    {result.status === 'completed' ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {result.status}
                  </span>
                )}
              </div>
              {test.description && <p className="text-sm text-[#495057] mb-3">{test.description}</p>}

              <div className="grid grid-cols-2 gap-6 mb-3">
                <div>
                  <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">Initial Context</h5>
                  <table className="w-full text-sm border border-[#DEE2E6] rounded-md overflow-hidden">
                    <tbody>
                      {Object.entries(test.initial_context).map(([key, val]) => (
                        <tr key={key} className="border-b border-[#DEE2E6] last:border-0">
                          <td className="px-3 py-1.5 text-[#212529] font-mono">{key}</td>
                          <td className="px-3 py-1.5 text-[#868E96]">{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">Expected Outcomes</h5>
                  <table className="w-full text-sm border border-[#DEE2E6] rounded-md overflow-hidden">
                    <tbody>
                      {test.expected_status && (
                        <tr className="border-b border-[#DEE2E6]">
                          <td className="px-3 py-1.5 text-[#495057]">status</td>
                          <td className="px-3 py-1.5 text-[#212529]">{test.expected_status}</td>
                        </tr>
                      )}
                      {test.expected_route && (
                        <tr className="border-b border-[#DEE2E6]">
                          <td className="px-3 py-1.5 text-[#495057]">route</td>
                          <td className="px-3 py-1.5 text-[#212529] font-mono">{test.expected_route}</td>
                        </tr>
                      )}
                      {test.expected_final_message && (
                        <tr className="border-b border-[#DEE2E6] last:border-0">
                          <td className="px-3 py-1.5 text-[#495057]">final message</td>
                          <td className="px-3 py-1.5 text-[#212529]">{test.expected_final_message}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {test.messages.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">User Messages</h5>
                  <div className="space-y-1">
                    {test.messages.map((msg, i) => (
                      <div key={i} className="bg-[#F1F3F5] rounded-lg px-3 py-2 text-sm text-[#212529] inline-block max-w-lg">
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {test.expected_stub_invocations && test.expected_stub_invocations.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">Expected Invocations</h5>
                  <div className="flex flex-wrap gap-1">
                    {test.expected_stub_invocations.map((s) => (
                      <span key={s} className="text-xs bg-[#FFF4E6] text-[#D9480F] px-2 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleRunTest(test.test_id)}
                disabled={isRunning}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#C0392B] text-white rounded-md hover:bg-red-800 disabled:bg-[#F1F3F5] disabled:text-[#868E96] disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isRunning ? 'Running...' : 'Run Test'}
              </button>

              {result && (
                <div className="mt-3 pt-3 border-t border-[#DEE2E6]">
                  <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-2">Execution Result</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#868E96]">Status:</span>{' '}
                      <span className={result.status === 'completed' ? 'text-[#2F9E44]' : 'text-[#C0392B]'}>
                        {result.status}
                      </span>
                    </div>
                    <div><span className="text-[#868E96]">Steps:</span> {result.steps}</div>
                    <div className="col-span-2">
                      <span className="text-[#868E96]">Final message:</span> {result.final_message}
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#868E96]">Message log:</span>
                      <div className="mt-1 space-y-0.5">
                        {result.message_log.map((msg, i) => (
                          <div key={i} className="bg-[#F1F3F5] rounded px-2 py-1 text-xs">{msg}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}