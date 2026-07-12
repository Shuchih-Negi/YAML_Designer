import type { Stub } from '../../types/agent';

interface StubPanelProps {
  stubs: Stub[];
}

export default function StubPanel({ stubs }: StubPanelProps) {
  if (stubs.length === 0) {
    return <p className="text-sm text-[#868E96] py-8 text-center">No stubs in this package.</p>;
  }

  return (
    <div className="space-y-4">
      {stubs.map((stub) => (
        <div key={stub.stub_id} className="border border-[#DEE2E6] rounded-lg p-4 relative">
          <span className="absolute top-3 right-3 bg-[#D9480F] text-white text-xs px-2 py-0.5 rounded font-medium">STUB</span>
          <h4 className="font-medium text-[#212529] mb-1">{stub.name}</h4>
          <p className="text-xs text-[#868E96] font-mono mb-2">{stub.stub_id}</p>
          {stub.description && <p className="text-sm text-[#495057] mb-3">{stub.description}</p>}

          <div className="mb-3">
            <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">Expected Inputs</h5>
            <table className="w-full text-sm border border-[#DEE2E6] rounded-md overflow-hidden">
              <tbody>
                {Object.entries(stub.inputs).map(([key, val]) => (
                  <tr key={key} className="border-b border-[#DEE2E6] last:border-0">
                    <td className="px-3 py-1.5 text-[#212529] font-mono">{key}</td>
                    <td className="px-3 py-1.5 text-[#868E96]">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">Success Output</h5>
              <pre className="text-xs bg-[#F1F3F5] p-2 rounded-md overflow-x-auto">{JSON.stringify(stub.success_output, null, 2)}</pre>
            </div>
            <div>
              <h5 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">Failure Output</h5>
              <pre className="text-xs bg-[#F1F3F5] p-2 rounded-md overflow-x-auto">{JSON.stringify(stub.failure_output, null, 2)}</pre>
            </div>
          </div>

          {stub.scenario_variations && stub.scenario_variations.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-[#495057] hover:text-[#212529]">
                Scenario Variations ({stub.scenario_variations.length})
              </summary>
              <div className="mt-2 space-y-2">
                {stub.scenario_variations.map((s) => (
                  <div key={s.scenario} className="border border-[#DEE2E6] rounded p-2">
                    <span className="text-xs font-medium text-[#495057]">{s.scenario}</span>
                    <pre className="text-xs bg-[#F1F3F5] p-1.5 rounded mt-1 overflow-x-auto">{JSON.stringify(s.output, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}