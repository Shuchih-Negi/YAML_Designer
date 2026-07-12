import axios, { AxiosError } from 'axios';
import type {
  AgentSummary, AgentPackage, UploadResponse,
  GenerateRequest, GenerateResponse,
  TestResult, RunAllTestsResult, ExecutionSummary,
  ContextUploadResponse, GenerateFromContextRequest, GenerateFromContextResponse,
  SubAgentBrief, WorkflowBrief,
  TenantSummary,
  ProposedStub, ValidateStubsResponse,
  VerifyResponse,
  PipelineGenerateRequest, PipelineGenerateResponse,
  PipelineValidateResponse, PipelinePublishResponse,
} from '../types/agent';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

function handleError(e: unknown): never {
  if (e instanceof AxiosError && e.response?.data?.detail) {
    throw new Error(Array.isArray(e.response.data.detail)
      ? e.response.data.detail.join(', ')
      : e.response.data.detail);
  }
  throw e;
}

export const agentApi = {
  health: async () => {
    try {
      const res = await api.get('/health');
      return res.data;
    } catch (e) { handleError(e); }
  },

  listAgents: async (): Promise<AgentSummary[]> => {
    try {
      const res = await api.get<AgentSummary[]>('/agents');
      return res.data;
    } catch (e) { handleError(e); }
  },

  getAgent: async (agentId: string): Promise<AgentPackage> => {
    try {
      const res = await api.get<AgentPackage>(`/agents/${agentId}`);
      return res.data;
    } catch (e) { handleError(e); }
  },

  uploadPackage: async (files: File[]): Promise<UploadResponse> => {
    try {
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      const res = await api.post<UploadResponse>('/agents/upload', form);
      return res.data;
    } catch (e) { handleError(e); }
  },

  deleteAgent: async (agentId: string): Promise<void> => {
    try {
      await api.delete(`/agents/${agentId}`);
    } catch (e) { handleError(e); }
  },

  generate: async (req: GenerateRequest): Promise<GenerateResponse> => {
    try {
      const res = await api.post<GenerateResponse>('/generate', req);
      return res.data;
    } catch (e) { handleError(e); }
  },

  // Phase 2 - Test execution
  runTest: async (agentId: string, testId: string, context?: Record<string, unknown>): Promise<TestResult> => {
    try {
      const res = await api.post<TestResult>(`/agents/${agentId}/tests/${testId}/run`, { initial_context: context });
      return res.data;
    } catch (e) { handleError(e); }
  },

  runAllTests: async (agentId: string, context?: Record<string, unknown>): Promise<RunAllTestsResult> => {
    try {
      const res = await api.post<RunAllTestsResult>(`/agents/${agentId}/tests/run-all`, { initial_context: context });
      return res.data;
    } catch (e) { handleError(e); }
  },

  // Phase 2 - Execution history
  listExecutions: async (agentId: string): Promise<ExecutionSummary[]> => {
    try {
      const res = await api.get<ExecutionSummary[]>(`/agents/${agentId}/executions`);
      return res.data;
    } catch (e) { handleError(e); }
  },

  // Phase 2 - Context data
  uploadContext: async (contextData: Record<string, unknown>): Promise<ContextUploadResponse> => {
    try {
      const res = await api.post<ContextUploadResponse>('/context/upload', { context_data: contextData });
      return res.data;
    } catch (e) { handleError(e); }
  },

  generateFromContext: async (req: GenerateFromContextRequest): Promise<GenerateFromContextResponse> => {
    try {
      const res = await api.post<GenerateFromContextResponse>('/context/generate', req);
      return res.data;
    } catch (e) { handleError(e); }
  },

  // Phase 2 — Structured Intake
  suggestStructure: async (description: string): Promise<{ sub_agents: SubAgentBrief[]; workflows: WorkflowBrief[] }> => {
    try {
      const res = await api.post('/context-pipeline/suggest-structure', { description });
      return res.data;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Structure suggestion failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  // Phase 3 — Context Data / Tenant Picker
  searchTenants: async (query: string): Promise<TenantSummary[]> => {
    try {
      const res = await api.get<TenantSummary[]>('/context-pipeline/tenants', { params: { q: query } });
      return res.data;
    } catch (e) { handleError(e); }
  },

  getTenantContext: async (tenantId: string): Promise<Record<string, unknown>> => {
    try {
      const res = await api.get<Record<string, unknown>>(`/context-pipeline/tenants/${tenantId}/context`);
      return res.data;
    } catch (e) { handleError(e); }
  },

  // Phase 4 — Pre-Test Stub Integrity
  validateStubs: async (stubs: ProposedStub[], workflowBriefs: string[]): Promise<ValidateStubsResponse> => {
    try {
      const res = await api.post<ValidateStubsResponse>('/context-pipeline/validate-stubs', {
        stubs,
        workflow_briefs: workflowBriefs,
      });
      return res.data;
    } catch (e) { handleError(e); }
  },

  // Phase 5 — HIL Verification Loop
  pipelineVerify: async (draftId: string, files: Record<string, string>): Promise<VerifyResponse> => {
    try {
      const res = await api.post<VerifyResponse>(`/context-pipeline/${draftId}/verify`, { files });
      return res.data;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Verification failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  pipelineApplyFix: async (draftId: string, files: Record<string, string>): Promise<void> => {
    try {
      await api.post(`/context-pipeline/${draftId}/apply-fix`, { files });
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Apply fix failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  pipelineApprove: async (draftId: string): Promise<void> => {
    try {
      await api.post(`/context-pipeline/${draftId}/approve`);
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Approve failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  // Phase 3 — Context Pipeline (structured error handling)
  pipelineGenerate: async (req: PipelineGenerateRequest): Promise<PipelineGenerateResponse> => {
    try {
      const res = await api.post<PipelineGenerateResponse>('/context-pipeline/generate', req);
      return res.data;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Pipeline generation failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  pipelineValidate: async (draftId: string, files: Record<string, string>): Promise<PipelineValidateResponse> => {
    try {
      const res = await api.post<PipelineValidateResponse>(`/context-pipeline/${draftId}/validate`, { files });
      return res.data;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Validation failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  pipelinePublish: async (draftId: string, files: Record<string, string>): Promise<PipelinePublishResponse> => {
    try {
      const res = await api.post<PipelinePublishResponse>(`/context-pipeline/${draftId}/publish`, { files });
      return res.data;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Publish failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },

  pipelineDownload: async (draftId: string): Promise<Blob> => {
    try {
      const res = await api.get(`/context-pipeline/${draftId}/download`, { responseType: 'blob' });
      return res.data;
    } catch (e) {
      if (e instanceof AxiosError && e.response?.data?.detail) {
        const err = new Error('Download failed') as any;
        err.detail = e.response.data.detail;
        throw err;
      }
      throw e;
    }
  },
};