import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Workflow } from '../../types/agent';
import NodeBadge from './NodeBadge';

interface WorkflowPanelProps {
  workflows: Workflow[];
}

export default function WorkflowPanel({ workflows }: WorkflowPanelProps) {
  const [edgesOpen, setEdgesOpen] = useState<Record<string, boolean>>({});

  if (workflows.length === 0) {
    return <p className="text-sm text-[#868E96] py-8 text-center">No workflows in this package.</p>;
  }

  return (
    <div className="space-y-6">
      {workflows.map((wf) => (
        <div key={wf.workflow_id} className="border border-[#DEE2E6] rounded-lg p-4">
          <h4 className="font-medium text-[#212529] mb-1">{wf.name}</h4>
          <p className="text-xs text-[#868E96] font-mono mb-3">{wf.workflow_id}</p>
          {wf.description && (
            <p className="text-sm text-[#495057] mb-3">{wf.description}</p>
          )}
          <div className="space-y-2">
            {wf.nodes.map((node) => (
              <NodeBadge key={node.id} node={node} />
            ))}
          </div>
          {wf.edges && wf.edges.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setEdgesOpen((prev) => ({ ...prev, [wf.workflow_id]: !prev[wf.workflow_id] }))}
                className="flex items-center gap-1 text-sm text-[#495057] hover:text-[#212529] transition-colors"
              >
                {edgesOpen[wf.workflow_id] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Edges ({wf.edges.length})
              </button>
              {edgesOpen[wf.workflow_id] && (
                <table className="mt-2 w-full text-sm border border-[#DEE2E6] rounded-md overflow-hidden">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-left">
                      <th className="px-3 py-2 text-[#495057] font-medium">From</th>
                      <th className="px-3 py-2 text-[#495057] font-medium">To</th>
                      {wf.edges.some((e) => e.condition) && (
                        <th className="px-3 py-2 text-[#495057] font-medium">Condition</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {wf.edges.map((edge, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-[#F8F9FA]' : ''}>
                        <td className="px-3 py-2 text-[#212529] font-mono">{edge.from}</td>
                        <td className="px-3 py-2 text-[#212529] font-mono">{edge.to}</td>
                        {wf.edges.some((e) => e.condition) && (
                          <td className="px-3 py-2 text-[#868E96]">{edge.condition ?? '—'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}