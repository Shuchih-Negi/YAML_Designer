import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Workflow, Box, GitBranch } from 'lucide-react';
import type { SubAgent } from '../../types/agent';

interface AgentTreeProps {
  agentId?: string;
  name: string;
  subAgents: SubAgent[];
  depth?: number;
  workflowCount?: number;
  stubCount?: number;
  testCount?: number;
}

export default function AgentTree({
  agentId: _agentId,
  name,
  subAgents,
  depth = 0,
  workflowCount = 0,
  stubCount = 0,
  testCount = 0,
}: AgentTreeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = subAgents.length > 0;

  const cardVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.97 },
  };

  const offsetX = depth * 28;
  const cardBg = depth === 0 ? 'bg-white' : 'bg-[#F8F9FA]';
  const borderAccent = depth === 0 ? 'border-l-[#C0392B]' : 'border-l-[#ADB5BD]';
  const cardWidth = depth === 0 ? 'w-full' : 'w-[calc(100%-28px)]';

  return (
    <motion.div
      className="relative"
      style={{ marginLeft: depth > 0 ? `${offsetX}px` : 0 }}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.25, delay: depth * 0.05 }}
    >
      {/* Connecting line */}
      {depth > 0 && (
        <svg
          className="absolute top-6 -left-6 pointer-events-none"
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
        >
          <path d="M0 14 L24 14 L24 24" stroke="#DEE2E6" strokeWidth="1.5" fill="none" />
          <circle cx="24" cy="24" r="3" fill="#DEE2E6" />
        </svg>
      )}

      {/* Card */}
      <div
        className={`${cardBg} border border-[#DEE2E6] rounded-lg ${borderAccent} border-l-4 p-4 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${cardWidth}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => hasChildren && e.key === 'Enter' && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${depth === 0 ? 'bg-[#FDECEA] text-[#C0392B]' : 'bg-[#F1F3F5] text-[#495057]'}`}>
              {depth === 0 ? <Box className="w-5 h-5" /> : <GitBranch className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-[#212529] text-sm truncate">{name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  depth === 0 ? 'bg-[#FDECEA] text-[#C0392B]' : 'bg-[#F1F3F5] text-[#868E96]'
                }`}>
                  {depth === 0 ? 'agent' : 'sub-agent'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {workflowCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-white border border-[#DEE2E6] text-[#495057] rounded">
                    {workflowCount} workflows
                  </span>
                )}
                {stubCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-white border border-[#DEE2E6] text-[#D9480F] rounded">
                    {stubCount} stubs
                  </span>
                )}
                {testCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-white border border-[#DEE2E6] text-[#2F9E44] rounded">
                    {testCount} tests
                  </span>
                )}
                {!workflowCount && !stubCount && !testCount && (
                  <span className="text-xs text-[#868E96]">No details</span>
                )}
              </div>
            </div>
          </div>
          {hasChildren && (
            <div className="shrink-0 ml-2 p-1 rounded hover:bg-[#F1F3F5] transition-colors">
              {expanded ? <ChevronDown className="w-4 h-4 text-[#868E96]" /> : <ChevronRight className="w-4 h-4 text-[#868E96]" />}
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {subAgents.map((sub) => (
              <AgentTree
                key={sub.sub_agent_id}
                agentId={sub.sub_agent_id}
                name={sub.name}
                subAgents={[]}
                depth={depth + 1}
                workflowCount={sub.workflows?.length ?? 0}
              />
            ))}
            {subAgents.map((sub) =>
              sub.workflows?.map((wf) => (
                <motion.div
                  key={wf}
                  className="flex items-center gap-2 py-2 px-3 ml-[calc(28px*(2))] text-sm text-[#868E96] bg-[#F8F9FA] border border-[#DEE2E6] border-dashed rounded mb-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Workflow className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-xs">{wf}</span>
                  <span className="text-[10px] text-[#ADB5BD] ml-auto">workflow</span>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}