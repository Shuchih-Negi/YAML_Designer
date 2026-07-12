import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2, Plus, Info, Search, CheckCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { agentApi } from '../../api/agentApi';
import type { SubAgentBrief, WorkflowBrief, TenantSummary, ProposedStub, StubValidationError } from '../../types/agent';

function extractSchema(obj: unknown, prefix = ''): Record<string, string> {
  const schema: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return schema;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null) {
      schema[fullKey] = 'null';
    } else if (Array.isArray(value)) {
      schema[fullKey] = value.length > 0 ? `array<${typeof value[0]}>` : 'array';
    } else if (typeof value === 'object') {
      schema[fullKey] = 'object';
      Object.assign(schema, extractSchema(value, fullKey));
    } else {
      schema[fullKey] = typeof value;
    }
  }
  return schema;
}

interface SpecFormProps {
  onGenerate: (
    description: string,
    contextData: string,
    agentName: string,
    sub_agents: SubAgentBrief[],
    workflows: WorkflowBrief[],
    stubs: ProposedStub[],
  ) => void;
  loading: boolean;
}

interface SubAgentRow extends SubAgentBrief {
  _key: number;
}

interface WorkflowRow extends WorkflowBrief {
  _key: number;
}

interface StubRow {
  _key: number;
  stub_id: string;
  inputs: { _key: number; name: string; type: string }[];
  success_output: string;
}

let _nextKey = 1;
let _inputKey = 1;

export default function SpecForm({ onGenerate, loading }: SpecFormProps) {
  const [description, setDescription] = useState('');
  const [contextData, setContextData] = useState('');
  const [agentName, setAgentName] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [subAgentRows, setSubAgentRows] = useState<SubAgentRow[]>([]);
  const [workflowRows, setWorkflowRows] = useState<WorkflowRow[]>([]);

  // Tenant picker state
  const [tenantQuery, setTenantQuery] = useState('');
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [searchingTenants, setSearchingTenants] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTenantSearch = useCallback(async (q: string) => {
    setTenantQuery(q);
    if (!q.trim()) {
      setTenants([]);
      setDropdownOpen(false);
      return;
    }
    setSearchingTenants(true);
    setDropdownOpen(true);
    try {
      const result = await agentApi.searchTenants(q);
      setTenants(result);
    } catch {
      setTenants([]);
    } finally {
      setSearchingTenants(false);
    }
  }, []);

  const handleTenantSelect = useCallback(async (tenant: TenantSummary) => {
    setSelectedTenant(tenant);
    setTenantQuery(tenant.tenant_name);
    setDropdownOpen(false);
    setLoadingContext(true);
    try {
      const ctx = await agentApi.getTenantContext(tenant.tenant_id);
      const schema = extractSchema(ctx);
      setContextData(JSON.stringify(schema, null, 2));
    } catch {
      setContextData('');
    } finally {
      setLoadingContext(false);
    }
  }, []);

  const handleClearTenant = useCallback(() => {
    setSelectedTenant(null);
    setTenantQuery('');
    setContextData('');
    setTenants([]);
  }, []);

  const addSubAgent = useCallback((source: 'user' | 'ai_suggested' = 'user') => {
    setSubAgentRows((prev) => [...prev, { _key: _nextKey++, name: '', responsibility: '', source }]);
  }, []);

  const addWorkflow = useCallback((source: 'user' | 'ai_suggested' = 'user') => {
    setWorkflowRows((prev) => [...prev, { _key: _nextKey++, name: '', trigger: '', brief: '', source }]);
  }, []);

  const updateSubAgent = useCallback((key: number, field: 'name' | 'responsibility', value: string) => {
    setSubAgentRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value, source: r.source === 'ai_suggested' ? 'user' as const : r.source } : r)),
    );
  }, []);

  const updateWorkflow = useCallback((key: number, field: 'name' | 'trigger' | 'brief', value: string) => {
    setWorkflowRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value, source: r.source === 'ai_suggested' ? 'user' as const : r.source } : r)),
    );
  }, []);

  const removeSubAgent = useCallback((key: number) => {
    setSubAgentRows((prev) => prev.filter((r) => r._key !== key));
  }, []);

  const removeWorkflow = useCallback((key: number) => {
    setWorkflowRows((prev) => prev.filter((r) => r._key !== key));
  }, []);

  // Stub state
  const [stubRows, setStubRows] = useState<StubRow[]>([]);
  const [stubErrors, setStubErrors] = useState<StubValidationError[]>([]);
  const [stubValidating, setStubValidating] = useState(false);

  const addStub = useCallback(() => {
    setStubRows((prev) => [...prev, { _key: _nextKey++, stub_id: '', inputs: [], success_output: '' }]);
  }, []);

  const updateStub = useCallback((key: number, field: 'stub_id' | 'success_output', value: string) => {
    setStubRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }, []);

  const removeStub = useCallback((key: number) => {
    setStubRows((prev) => prev.filter((r) => r._key !== key));
  }, []);

  const addStubInput = useCallback((stubKey: number) => {
    setStubRows((prev) =>
      prev.map((r) => (r._key === stubKey ? { ...r, inputs: [...r.inputs, { _key: _inputKey++, name: '', type: '' }] } : r)),
    );
  }, []);

  const updateStubInput = useCallback((stubKey: number, inputKey: number, field: 'name' | 'type', value: string) => {
    setStubRows((prev) =>
      prev.map((r) =>
        r._key === stubKey
          ? { ...r, inputs: r.inputs.map((i) => (i._key === inputKey ? { ...i, [field]: value } : i)) }
          : r,
      ),
    );
  }, []);

  const removeStubInput = useCallback((stubKey: number, inputKey: number) => {
    setStubRows((prev) =>
      prev.map((r) => (r._key === stubKey ? { ...r, inputs: r.inputs.filter((i) => i._key !== inputKey) } : r)),
    );
  }, []);

  const handleValidateStubs = useCallback(async () => {
    const validStubs: ProposedStub[] = stubRows
      .filter((r) => r.stub_id.trim())
      .map((r) => {
        const inputs: Record<string, string> = {};
        r.inputs.forEach((i) => { if (i.name.trim()) inputs[i.name.trim()] = i.type.trim() || 'string'; });
        let success_output: Record<string, unknown> = {};
        try {
          if (r.success_output.trim()) success_output = JSON.parse(r.success_output);
        } catch { /* will be caught by validation */ }
        return { stub_id: r.stub_id.trim(), inputs, success_output };
      });

    if (validStubs.length === 0) {
      setStubErrors([]);
      return;
    }

    setStubValidating(true);
    try {
      const briefs = workflowRows.filter((w) => w.brief.trim()).map((w) => w.brief);
      const result = await agentApi.validateStubs(validStubs, briefs);
      setStubErrors(result.errors);
    } catch {
      setStubErrors([]);
    } finally {
      setStubValidating(false);
    }
  }, [stubRows, workflowRows]);

  // Auto-validate when stubs change
  useEffect(() => {
    if (stubRows.some((r) => r.stub_id.trim())) {
      handleValidateStubs();
    } else {
      setStubErrors([]);
    }
  }, [stubRows, handleValidateStubs]);

  const hasStubIssues = stubErrors.length > 0;

  const handleSuggest = async () => {
    if (!description.trim()) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const result = await agentApi.suggestStructure(description);
      setSubAgentRows(
        (result.sub_agents || []).map((s) => ({ _key: _nextKey++, name: s.name, responsibility: s.responsibility, source: 'ai_suggested' as const })),
      );
      setWorkflowRows(
        (result.workflows || []).map((w) => ({ _key: _nextKey++, name: w.name, trigger: w.trigger, brief: w.brief, source: 'ai_suggested' as const })),
      );
    } catch (e: any) {
      setSuggestError(e?.detail?.reason || e.message || 'Failed to suggest structure');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = () => {
    if (!description.trim()) return;
    const subAgentsToSend: SubAgentBrief[] = subAgentRows
      .filter((r) => r.name.trim())
      .map(({ _key, ...rest }) => rest);
    const workflowsToSend: WorkflowBrief[] = workflowRows
      .filter((r) => r.name.trim())
      .map(({ _key, ...rest }) => rest);
    const stubsToSend: ProposedStub[] = stubRows
      .filter((r) => r.stub_id.trim())
      .map((r) => {
        const inputs: Record<string, string> = {};
        r.inputs.forEach((i) => { if (i.name.trim()) inputs[i.name.trim()] = i.type.trim() || 'string'; });
        let success_output: Record<string, unknown> = {};
        try {
          if (r.success_output.trim()) success_output = JSON.parse(r.success_output);
        } catch { /* keep empty */ }
        return { stub_id: r.stub_id.trim(), inputs, success_output };
      });
    onGenerate(description, contextData, agentName, subAgentsToSend, workflowsToSend, stubsToSend);
  };

  const hasSubAgents = subAgentRows.length > 0;
  const hasWorkflows = workflowRows.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* High-Level Goal */}
      <div>
        <label className="block text-sm font-medium text-[#495057] mb-1.5">High-Level Goal</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the agent you want to build... e.g. 'An agent that reviews expense reports, checks against company policy, flags violations, and notifies the manager.'"
          rows={4}
          className="w-full border border-[#DEE2E6] rounded-lg px-4 py-3 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B] resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSuggest}
          disabled={suggesting || !description.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#DEE2E6] text-[#495057] hover:bg-[#F8F9FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {suggesting ? (
            <div className="animate-spin h-4 w-4 border-2 border-[#495057] border-t-transparent rounded-full" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          )}
          Suggest structure from goal
        </button>
      </div>

      {suggestError && (
        <div className="border border-[#C0392B] bg-[#FDECEA] rounded-lg p-3 text-sm text-[#C0392B]">
          {suggestError}
        </div>
      )}

      {/* Sub-Agents */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="text-sm font-medium text-[#495057]">Sub-Agents</label>
          <span className="relative group">
            <Info className="w-3.5 h-3.5 text-[#ADB5BD] cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#212529] text-white text-xs rounded-lg shadow-lg w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              A sub-agent is a distinct responsibility your main agent delegates to (e.g. "policy checker", "manager escalation"). One row each.
            </div>
          </span>
        </div>

        {!hasSubAgents && (
          <div className="border border-dashed border-[#DEE2E6] rounded-lg p-3 text-sm text-[#ADB5BD] mb-2">
            No sub-agents yet. Use "Suggest structure" above or add one manually.
          </div>
        )}

        <div className="space-y-2">
          {subAgentRows.map((row, idx) => (
            <div key={row._key} className="flex items-start gap-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg p-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#868E96] font-medium w-6">{idx + 1}</span>
                  <input
                    value={row.name}
                    onChange={(e) => updateSubAgent(row._key, 'name', e.target.value)}
                    placeholder="Sub-agent name"
                    className="flex-1 border border-[#DEE2E6] rounded px-2.5 py-1.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B] font-mono"
                  />
                  {row.source === 'ai_suggested' && (
                    <span className="flex items-center gap-1 text-[10px] text-[#F59E0B] bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                      <Sparkles className="w-3 h-3" /> AI suggested
                    </span>
                  )}
                </div>
                <input
                  value={row.responsibility}
                  onChange={(e) => updateSubAgent(row._key, 'responsibility', e.target.value)}
                  placeholder="Responsibility — one-line brief"
                  className="w-full border border-[#DEE2E6] rounded px-2.5 py-1.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B]"
                />
              </div>
              <button
                onClick={() => removeSubAgent(row._key)}
                className="p-1.5 text-[#ADB5BD] hover:text-[#C0392B] transition-colors mt-1"
                title="Remove sub-agent"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => addSubAgent('user')}
          className="flex items-center gap-1.5 mt-2 text-sm text-[#C0392B] hover:underline font-medium"
        >
          <Plus className="w-4 h-4" /> Add Sub-Agent
        </button>
      </div>

      {/* Workflows */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="text-sm font-medium text-[#495057]">Workflows</label>
          <span className="relative group">
            <Info className="w-3.5 h-3.5 text-[#ADB5BD] cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#212529] text-white text-xs rounded-lg shadow-lg w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              A workflow is a step-by-step process a sub-agent runs — this becomes the node graph you'll see in the Graph tab later.
            </div>
          </span>
        </div>

        {!hasWorkflows && (
          <div className="border border-dashed border-[#DEE2E6] rounded-lg p-3 text-sm text-[#ADB5BD] mb-2">
            No workflows yet. Use "Suggest structure" above or add one manually.
          </div>
        )}

        <div className="space-y-2">
          {workflowRows.map((row, idx) => (
            <div key={row._key} className="flex items-start gap-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg p-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#868E96] font-medium w-6">{idx + 1}</span>
                  <input
                    value={row.name}
                    onChange={(e) => updateWorkflow(row._key, 'name', e.target.value)}
                    placeholder="Workflow name"
                    className="flex-1 border border-[#DEE2E6] rounded px-2.5 py-1.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B] font-mono"
                  />
                  {row.source === 'ai_suggested' && (
                    <span className="flex items-center gap-1 text-[10px] text-[#F59E0B] bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                      <Sparkles className="w-3 h-3" /> AI suggested
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={row.trigger}
                    onChange={(e) => updateWorkflow(row._key, 'trigger', e.target.value)}
                    placeholder="Trigger (e.g. new invoice received)"
                    className="flex-1 border border-[#DEE2E6] rounded px-2.5 py-1.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B]"
                  />
                  <input
                    value={row.brief}
                    onChange={(e) => updateWorkflow(row._key, 'brief', e.target.value)}
                    placeholder="Brief (e.g. check policy, branch, notify)"
                    className="flex-1 border border-[#DEE2E6] rounded px-2.5 py-1.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B]"
                  />
                </div>
              </div>
              <button
                onClick={() => removeWorkflow(row._key)}
                className="p-1.5 text-[#ADB5BD] hover:text-[#C0392B] transition-colors mt-1"
                title="Remove workflow"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => addWorkflow('user')}
          className="flex items-center gap-1.5 mt-2 text-sm text-[#C0392B] hover:underline font-medium"
        >
          <Plus className="w-4 h-4" /> Add Workflow
        </button>
      </div>

      {/* Stubs */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="text-sm font-medium text-[#495057]">Stubs</label>
          <span className="relative group">
            <Info className="w-3.5 h-3.5 text-[#ADB5BD] cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#212529] text-white text-xs rounded-lg shadow-lg w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              A stub is an external capability your workflow calls out to (an API, a lookup, a policy engine) — define its inputs and expected successful response here.
            </div>
          </span>
          {hasStubIssues && (
            <span className="flex items-center gap-1 text-xs text-[#C0392B] ml-auto">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stubErrors.length} issue{stubErrors.length !== 1 ? 's' : ''}
            </span>
          )}
          {stubValidating && (
            <div className="ml-auto">
              <div className="animate-spin h-3.5 w-3.5 border-2 border-[#C0392B] border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {stubRows.length === 0 && (
          <div className="border border-dashed border-[#DEE2E6] rounded-lg p-3 text-sm text-[#ADB5BD] mb-2">
            No stubs yet. Define external capabilities your workflows call out to.
          </div>
        )}

        <div className="space-y-2">
          {stubRows.map((row, idx) => {
            const rowErrors = stubErrors.filter((e) => e.stub_id === row.stub_id);
            return (
              <div key={row._key} className="flex items-start gap-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg p-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#868E96] font-medium w-6">{idx + 1}</span>
                    <input
                      value={row.stub_id}
                      onChange={(e) => updateStub(row._key, 'stub_id', e.target.value)}
                      placeholder="Stub ID (e.g. policy_check_stub)"
                      className="flex-1 border border-[#DEE2E6] rounded px-2.5 py-1.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B] font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#868E96]">Inputs</span>
                      <button
                        onClick={() => addStubInput(row._key)}
                        className="flex items-center gap-0.5 text-[10px] text-[#C0392B] hover:underline"
                      >
                        <Plus className="w-3 h-3" /> add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.inputs.map((inp) => (
                        <div key={inp._key} className="flex items-center gap-1 bg-white border border-[#DEE2E6] rounded px-2 py-1">
                          <input
                            value={inp.name}
                            onChange={(e) => updateStubInput(row._key, inp._key, 'name', e.target.value)}
                            placeholder="field_name"
                            className="w-28 border-0 text-xs text-[#212529] placeholder-[#ADB5BD] focus:outline-none font-mono"
                          />
                          <span className="text-[#ADB5BD]">:</span>
                          <input
                            value={inp.type}
                            onChange={(e) => updateStubInput(row._key, inp._key, 'type', e.target.value)}
                            placeholder="type"
                            className="w-16 border-0 text-xs text-[#868E96] placeholder-[#ADB5BD] focus:outline-none"
                          />
                          <button
                            onClick={() => removeStubInput(row._key, inp._key)}
                            className="p-0.5 text-[#ADB5BD] hover:text-[#C0392B]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {row.inputs.length === 0 && (
                        <span className="text-[10px] text-[#ADB5BD] italic">No inputs defined</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-[#868E96]">Success Output (JSON sample)</span>
                    <input
                      value={row.success_output}
                      onChange={(e) => updateStub(row._key, 'success_output', e.target.value)}
                      placeholder='{"approved": true, "reason": "string"}'
                      className="w-full mt-1 border border-[#DEE2E6] rounded px-2.5 py-1.5 text-xs text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B] font-mono"
                    />
                  </div>

                  {rowErrors.length > 0 && (
                    <div className="space-y-0.5">
                      {rowErrors.map((err, ei) => (
                        <p key={ei} className="text-[10px] text-[#C0392B] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeStub(row._key)}
                  className="p-1.5 text-[#ADB5BD] hover:text-[#C0392B] transition-colors mt-1"
                  title="Remove stub"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => addStub()}
          className="flex items-center gap-1.5 mt-2 text-sm text-[#C0392B] hover:underline font-medium"
        >
          <Plus className="w-4 h-4" /> Add Stub
        </button>
      </div>

      {/* Agent Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#495057] mb-1.5">
            Agent Name <span className="text-[#868E96] font-normal">(optional)</span>
          </label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="expense_review_agent"
            className="w-full border border-[#DEE2E6] rounded-lg px-4 py-2.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B] font-mono"
          />
        </div>

        {/* Context Data — Tenant Picker */}
        <div ref={searchRef} className="relative">
          <label className="block text-sm font-medium text-[#495057] mb-1.5">
            Context Data
          </label>

          {!selectedTenant ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
              <input
                value={tenantQuery}
                onChange={(e) => handleTenantSearch(e.target.value)}
                onFocus={() => { if (tenants.length > 0) setDropdownOpen(true); }}
                placeholder="Search company / tenant..."
                className="w-full border border-[#DEE2E6] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#212529] placeholder-[#ADB5BD] focus:outline-none focus:border-[#C0392B]"
              />
              {dropdownOpen && tenants.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DEE2E6] rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {tenants.map((t) => (
                    <button
                      key={t.tenant_id}
                      onClick={() => handleTenantSelect(t)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#212529] hover:bg-[#F8F9FA] border-b border-[#DEE2E6] last:border-b-0 transition-colors"
                    >
                      <span className="font-medium">{t.tenant_name}</span>
                      <span className="text-[#868E96] ml-2">({t.total_accounts} accounts)</span>
                    </button>
                  ))}
                </div>
              )}
              {searchingTenants && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-[#C0392B] border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="border border-[#DEE2E6] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2F9E44]" />
                  <span className="text-sm font-medium text-[#212529]">{selectedTenant.tenant_name}</span>
                </div>
                <button
                  onClick={handleClearTenant}
                  className="text-xs text-[#868E96] hover:text-[#C0392B] underline"
                >
                  Change
                </button>
              </div>
              <div className="text-xs text-[#868E96] mt-1">
                Loaded — {selectedTenant.tenant_id.slice(0, 8)}… · {selectedTenant.total_accounts} accounts
              </div>
              {loadingContext && (
                <div className="flex items-center gap-2 text-xs text-[#868E96] mt-2">
                  <div className="animate-spin h-3 w-3 border-2 border-[#C0392B] border-t-transparent rounded-full" />
                  Loading context data...
                </div>
              )}
            </div>
          )}

          {selectedTenant && contextData && (
            <div className="mt-1">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-1 text-xs text-[#868E96] hover:text-[#495057] transition-colors"
              >
                {showRawJson ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                View context schema fields {showRawJson ? '' : '(advanced)'}
              </button>
              {showRawJson && (
                <pre className="mt-1 p-2 bg-[#F8F9FA] border border-[#DEE2E6] rounded text-[10px] text-[#495057] max-h-32 overflow-y-auto font-mono">
                  {contextData.slice(0, 2000)}{contextData.length > 2000 ? '\n...(truncated)' : ''}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generate */}
      <div className="flex items-center gap-3 pt-2">
        <div className="relative">
          <button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#C0392B] text-white text-sm font-medium rounded-lg hover:bg-[#A93226] disabled:bg-[#F1F3F5] disabled:text-[#ADB5BD] disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
          {hasStubIssues && (
            <span className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-medium rounded-full border border-amber-200 whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" />
              {stubErrors.length} issue{stubErrors.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {(hasSubAgents || hasWorkflows) && (
          <span className="text-xs text-[#868E96]">
            {subAgentRows.filter((r) => r.name.trim()).length} sub-agent{subAgentRows.filter((r) => r.name.trim()).length !== 1 ? 's' : ''}
            {workflowRows.filter((r) => r.name.trim()).length > 0 && (
              <> &middot; {workflowRows.filter((r) => r.name.trim()).length} workflow{workflowRows.filter((r) => r.name.trim()).length !== 1 ? 's' : ''}</>
            )}
            <span className="ml-1">will be sent to the pipeline</span>
          </span>
        )}
      </div>
    </div>
  );
}
