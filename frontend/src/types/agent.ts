export type NodeType =
  | 'show_message'
  | 'ask_user'
  | 'save_value'
  | 'condition'
  | 'invoke_sub_agent'
  | 'run_stub'
  | 'finish'
  | string;

export interface WorkflowNode {
  id: string;
  type: NodeType;
  message?: string;
  prompt?: string;
  saves_to?: string;
  condition?: string;
  on_true?: string;
  on_false?: string;
  stub_id?: string;
  sub_agent_id?: string;
  workflow_id?: string;
  next?: string;
  [key: string]: unknown;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface ContextField {
  [fieldName: string]: string;
}

export interface Workflow {
  workflow_id: string;
  name: string;
  description?: string;
  context_schema?: ContextField;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface SubAgent {
  sub_agent_id: string;
  name: string;
  description?: string;
  workflows: string[];
}

export interface StubScenario {
  scenario: string;
  output: Record<string, unknown>;
}

export interface Stub {
  stub_id: string;
  name: string;
  description?: string;
  inputs: Record<string, string>;
  success_output: Record<string, unknown>;
  failure_output: Record<string, unknown>;
  scenario_variations?: StubScenario[];
  invocation_record?: boolean;
  response_message?: string;
}

export interface TestCase {
  test_id: string;
  name: string;
  description?: string;
  initial_context: Record<string, unknown>;
  stub_overrides?: Record<string, Record<string, unknown>>;
  messages: string[];
  expected_final_message?: string;
  expected_status?: 'completed' | 'waiting';
  expected_route?: string;
  expected_context?: Record<string, unknown>;
  expected_stub_invocations?: string[];
}

export interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  version?: string;
  sub_agents: string[];
  workflows: string[];
}

export interface AgentSummary {
  agent_id: string;
  name: string;
  description?: string;
  workflow_count: number;
  sub_agent_count: number;
  stub_count: number;
  test_count: number;
}

export interface AgentPackage {
  agent: Agent;
  workflows: Workflow[];
  sub_agents: SubAgent[];
  stubs: Stub[];
  tests: TestCase[];
  raw_files: Record<string, string>;
}

export interface GenerateRequest {
  description: string;
}

export interface GenerateResponse {
  agent_id: string;
  files: Record<string, string>;
  saved: boolean;
}

export interface UploadResponse {
  status: string;
  agent_id: string;
  files_saved: number;
}

export interface ApiError {
  detail: string;
}

// Phase 2 types
export interface NodeVisit {
  node_id: string;
  node_type: string;
  details: Record<string, unknown>;
  status: string;
  timestamp: string;
}

export interface ExecutionTrace {
  execution_id: string;
  workflow_id: string;
  start_time: string;
  end_time: string;
  final_status: string;
  final_message: string;
  visit_count: number;
  visits: NodeVisit[];
}

export interface TestResult {
  execution_id: string;
  workflow_id: string;
  status: string;
  final_message: string;
  trace: ExecutionTrace;
  context: Record<string, unknown>;
  stub_responses: Record<string, unknown>;
  message_log: string[];
  steps: number;
}

export interface RunAllTestsResult {
  agent_id: string;
  results: Array<{ test_id: string; status: string; execution_id: string; final_message: string; steps: number }>;
  total: number;
  passed: number;
  failed: number;
}

export interface ExecutionSummary {
  execution_id: string;
  test_id: string;
  workflow_id: string;
  status: string;
  final_message: string;
  timestamp: string;
  steps: number;
}

export interface ContextUploadResponse {
  status: string;
  validated: boolean;
  derived_metrics: Record<string, unknown>;
  initial_context: Record<string, unknown>;
  context_schema: Record<string, string>;
}

export interface GenerateFromContextRequest {
  context_data: Record<string, unknown>;
  agent_id: string;
  agent_name: string;
  agent_description: string;
}

export interface GenerateFromContextResponse {
  agent_id: string;
  files: Record<string, string>;
  saved: boolean;
}

// Phase 2 — Structured Intake types
export interface SubAgentBrief {
  name: string;
  responsibility: string;
  source: 'user' | 'ai_suggested';
}

export interface WorkflowBrief {
  name: string;
  trigger: string;
  brief: string;
  source: 'user' | 'ai_suggested';
}

export interface SuggestStructureRequest {
  description: string;
}

export interface SuggestStructureResponse {
  sub_agents: SubAgentBrief[];
  workflows: WorkflowBrief[];
}

// Phase 3 — Context Data / Tenant Picker
export interface TenantSummary {
  tenant_id: string;
  tenant_name: string;
  total_accounts: number;
}

// Phase 4 — Pre-Test Stub Integrity
export interface ProposedStub {
  stub_id: string;
  inputs: Record<string, string>;
  success_output: Record<string, unknown>;
  failure_modes?: string[];
}

export interface StubValidationError {
  stub_id: string;
  message: string;
}

export interface ValidateStubsResponse {
  valid: boolean;
  errors: StubValidationError[];
}

// Phase 5 — HIL Verification Loop
export type HilStatus = 'editing' | 'testing' | 'fix_proposed' | 'approved';

export interface VerifyResponse {
  pass: boolean;
  issues: Array<{ file: string; message: string }>;
  suggested_fix: Record<string, string> | null;
}

export interface ApplyFixResponse {
  status: string;
}

export interface ApproveResponse {
  status: string;
}

// Phase 3 — Context Pipeline types
export interface PipelineGenerateRequest {
  description: string;
  context_data?: Record<string, unknown> | null;
  agent_name?: string;
  sub_agents?: SubAgentBrief[] | null;
  workflows?: WorkflowBrief[] | null;
  stubs?: ProposedStub[] | null;
}

export interface PipelineGenerateResponse {
  draft_id: string;
  files: Record<string, string>;
  planner_summary: string;
}

export interface PipelineValidateError {
  file: string;
  line: number | null;
  message: string;
}

export interface PipelineValidateResponse {
  valid: boolean;
  errors: PipelineValidateError[];
}

export interface PipelinePublishResponse {
  agent_id: string;
}