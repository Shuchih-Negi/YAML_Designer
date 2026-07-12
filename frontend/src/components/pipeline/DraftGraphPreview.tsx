import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import jsyaml from 'js-yaml';

const NODE_COLORS: Record<string, string> = {
  show_message: '#3B82F6',
  ask_user: '#F59E0B',
  save_value: '#14B8A6',
  condition: '#8B5CF6',
  invoke_sub_agent: '#6366F1',
  run_stub: '#F97316',
  finish: '#10B981',
};

function WorkflowGraphNode({ data }: NodeProps<{ nodeType: string; label: string }>) {
  const bg = NODE_COLORS[data.nodeType] || '#6B7280';
  return (
    <div
      style={{
        background: bg, color: '#fff', padding: '8px 14px', borderRadius: 8,
        minWidth: 140, maxWidth: 220, textAlign: 'center',
        border: '2px solid rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.4,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ width: 8, height: 8, background: bg, border: '2px solid #fff' }} />
      <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em', opacity: 0.85, marginBottom: 2 }}>
        {data.nodeType.replace(/_/g, ' ')}
      </div>
      <div style={{ fontWeight: 600, fontSize: 11 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ width: 8, height: 8, background: bg, border: '2px solid #fff' }} />
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowGraphNode };

interface DraftGraphPreviewProps {
  files: Record<string, string>;
}

function parseWorkflowFromYaml(content: string): { id: string; name: string; nodes: any[]; edges: any[] } | null {
  try {
    const data = jsyaml.load(content) as any;
    if (!data || typeof data !== 'object') return null;
    if (!data.workflow_id || !Array.isArray(data.nodes)) return null;

    const nodes = data.nodes.filter((n: any) => n && n.id).map((n: any) => ({
      id: n.id,
      type: n.type || 'unknown',
    }));

    let edges: any[] = [];
    if (Array.isArray(data.edges)) {
      edges = data.edges.filter((e: any) => e && e.from && e.to).map((e: any) => ({
        from: e.from,
        to: e.to,
        condition: e.condition || undefined,
      }));
    }

    return {
      id: data.workflow_id,
      name: data.name || data.workflow_id,
      nodes,
      edges,
    };
  } catch {
    return null;
  }
}

function buildGraph(wf: { id: string; name: string; nodes: any[]; edges: any[] }): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 70, marginx: 20, marginy: 20 });

  const rfNodes: Node[] = wf.nodes.map((n) => {
    g.setNode(n.id, { width: 160, height: 50 });
    return {
      id: n.id,
      type: 'workflowNode',
      position: { x: 0, y: 0 },
      data: { nodeType: n.type || 'unknown', label: n.id },
    };
  });

  const rfEdges: Edge[] = wf.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    label: e.condition,
    type: 'smoothstep',
    markerEnd: 'url(#arrow)',
    style: { stroke: '#ADB5BD', strokeWidth: 2 },
    labelStyle: { fill: '#495057', fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: '#F8F9FA', fillOpacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 3,
  }));

  dagre.layout(g);
  for (const node of rfNodes) {
    const dn = g.node(node.id);
    if (dn) {
      node.position = {
        x: dn.x - (dn.width as number) / 2,
        y: dn.y - (dn.height as number) / 2,
      };
    }
  }

  return { nodes: rfNodes, edges: rfEdges };
}

export default function DraftGraphPreview({ files }: DraftGraphPreviewProps) {
  const workflows = useMemo(() => {
    const result: Array<{ id: string; name: string; nodes: any[]; edges: any[] }> = [];
    for (const [fname, content] of Object.entries(files)) {
      if (!fname.startsWith('workflow')) continue;
      const wf = parseWorkflowFromYaml(content);
      if (wf) result.push(wf);
    }
    return result;
  }, [files]);

  if (workflows.length === 0) {
    return (
      <div className="border border-[#DEE2E6] rounded-lg p-8 text-center text-sm text-[#868E96]">
        No workflow files found in the package.
      </div>
    );
  }

  const combinedNodes: Node[] = [];
  const combinedEdges: Edge[] = [];
  let yOffset = 0;

  for (const wf of workflows) {
    const { nodes, edges } = buildGraph(wf);
    for (const n of nodes) {
      n.id = `${wf.id}-${n.id}`;
      n.position.y += yOffset;
    }
    for (const e of edges) {
      e.id = `${wf.id}-${e.id}`;
      e.source = `${wf.id}-${e.source}`;
      e.target = `${wf.id}-${e.target}`;
    }
    combinedNodes.push(...nodes);
    combinedEdges.push(...edges);
    const height = Math.max(...nodes.map((n) => n.position.y + 100), 150);
    yOffset += height;
  }

  return (
    <div className="border border-[#DEE2E6] rounded-lg" style={{ height: 520 }}>
      <ReactFlow
        nodes={combinedNodes}
        edges={combinedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
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
  );
}
