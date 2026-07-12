import { useMemo, useState, useCallback, type PropsWithChildren } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { Workflow } from '../../types/agent';

const NODE_COLORS: Record<string, string> = {
  show_message: '#3B82F6',
  ask_user: '#F59E0B',
  save_value: '#14B8A6',
  condition: '#8B5CF6',
  invoke_sub_agent: '#6366F1',
  run_stub: '#F97316',
  finish: '#10B981',
};

const NODE_LABELS: Record<string, string> = {
  show_message: 'Message',
  ask_user: 'Ask User',
  save_value: 'Save Value',
  condition: 'Condition',
  invoke_sub_agent: 'Sub-Agent',
  run_stub: 'Run Stub',
  finish: 'Finish',
};

function getNodeLabel(node: Workflow['nodes'][number]): string {
  const fallback = node.id || 'unnamed';
  switch (node.type) {
    case 'show_message':
      return node.message ? (node.message.length > 40 ? node.message.slice(0, 37) + '...' : node.message) : fallback;
    case 'ask_user':
      return node.prompt ? (node.prompt.length > 40 ? node.prompt.slice(0, 37) + '...' : node.prompt) : fallback;
    case 'condition':
      return node.condition ? (node.condition.length > 40 ? node.condition.slice(0, 37) + '...' : node.condition) : fallback;
    case 'invoke_sub_agent':
      return node.sub_agent_id ?? fallback;
    case 'run_stub':
      return node.stub_id ?? fallback;
    case 'save_value':
      return node.saves_to ?? fallback;
    case 'finish':
      return node.message ?? fallback;
    default:
      return fallback;
  }
}

function getNodeSublabel(node: Workflow['nodes'][number]): string | undefined {
  if (node.type === 'invoke_sub_agent') return undefined;
  if (node.type === 'run_stub') return undefined;
  return undefined;
}

function WorkflowGraphNode({ data }: NodeProps<{ nodeType: string; label: string; nodeId: string }>) {
  const bg = NODE_COLORS[data.nodeType] || '#6B7280';
  return (
    <div
      style={{
        background: bg,
        color: '#fff',
        padding: '10px 16px',
        borderRadius: 8,
        minWidth: 150,
        maxWidth: 240,
        textAlign: 'center',
        border: '2px solid rgba(255,255,255,0.3)',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ width: 8, height: 8, background: bg, border: '2px solid #fff' }} />
      <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em', opacity: 0.85, marginBottom: 2 }}>
        {data.nodeType.replace(/_/g, ' ')}
      </div>
      <div style={{ fontWeight: 600, fontSize: 12 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ width: 8, height: 8, background: bg, border: '2px solid #fff' }} />
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowGraphNode };

interface WorkflowGraphProps {
  workflows: Workflow[];
}

function buildGraph(workflow: Workflow): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 30, marginy: 30 });

  const validNodes = workflow.nodes.filter((n) => n && n.id);
  const validNodeIds = new Set(validNodes.map((n) => n.id));

  const rfNodes: Node[] = validNodes.map((n) => {
    const w = n.type === 'condition' ? 200 : 180;
    const h = 60;
    g.setNode(n.id, { width: w, height: h });
    return {
      id: n.id,
      type: 'workflowNode',
      position: { x: 0, y: 0 },
      data: { nodeType: n.type || 'unknown', label: getNodeLabel(n), nodeId: n.id },
      deletable: false,
      draggable: true,
    };
  });

  const validEdges = (workflow.edges || []).filter((e) => e && e.from && e.to && validNodeIds.has(e.from) && validNodeIds.has(e.to));

  const rfEdges: Edge[] = validEdges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.from,
    target: e.to,
    label: e.condition ?? undefined,
    type: 'smoothstep',
    animated: true,
    markerEnd: 'url(#arrow)',
    style: { stroke: '#ADB5BD', strokeWidth: 2 },
    labelStyle: { fill: '#495057', fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: '#F8F9FA', fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 4,
  }));

  dagre.layout(g);

  for (const node of rfNodes) {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      node.position = {
        x: dagreNode.x - (dagreNode.width as number) / 2,
        y: dagreNode.y - (dagreNode.height as number) / 2,
      };
    }
  }

  return { nodes: rfNodes, edges: rfEdges };
}

export default function WorkflowGraph({ workflows }: WorkflowGraphProps) {
  const [selectedId, setSelectedId] = useState<string>(workflows[0]?.workflow_id ?? '');

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.workflow_id === selectedId),
    [workflows, selectedId],
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => (selectedWorkflow ? buildGraph(selectedWorkflow) : { nodes: [], edges: [] }),
    [selectedWorkflow],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useMemo(() => {
    const { nodes: newNodes, edges: newEdges } = selectedWorkflow
      ? buildGraph(selectedWorkflow)
      : { nodes: [], edges: [] };
    setNodes(newNodes);
    setEdges(newEdges);
  }, [selectedWorkflow, setNodes, setEdges]);

  if (workflows.length === 0) {
    return <p className="text-sm text-[#868E96] py-8 text-center">No workflows to display.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {workflows.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {workflows.map((wf) => (
            <button
              key={wf.workflow_id}
              onClick={() => setSelectedId(wf.workflow_id)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedId === wf.workflow_id
                  ? 'border-[#C0392B] bg-[#C0392B] text-white'
                  : 'border-[#DEE2E6] text-[#495057] hover:border-[#ADB5BD]'
              }`}
            >
              {wf.name}
            </button>
          ))}
        </div>
      )}

      {selectedWorkflow && (
        <div className="mb-1">
          <h4 className="font-medium text-[#212529] text-sm">{selectedWorkflow.name}</h4>
          {selectedWorkflow.description && (
            <p className="text-xs text-[#868E96] mt-0.5">{selectedWorkflow.description}</p>
          )}
        </div>
      )}

      <div className="border border-[#DEE2E6] rounded-lg" style={{ height: 520 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          colorMode="light"
        >
          <svg>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ADB5BD" />
              </marker>
            </defs>
          </svg>
          <Background color="#DEE2E6" gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="flex gap-3 flex-wrap text-xs text-[#868E96]">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
            <span>{NODE_LABELS[type] || type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
