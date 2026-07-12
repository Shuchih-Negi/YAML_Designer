import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ThumbsUp } from 'lucide-react';
import { agentApi } from '../api/agentApi';
import type { PipelineGenerateResponse, PipelineValidateResponse, SubAgentBrief, WorkflowBrief, ProposedStub, HilStatus, VerifyResponse } from '../types/agent';
import SpecForm from '../components/pipeline/SpecForm';
import MultiFileEditor from '../components/pipeline/MultiFileEditor';
import DraftGraphPreview from '../components/pipeline/DraftGraphPreview';
import ValidationPanel from '../components/pipeline/ValidationPanel';
import ErrorBanner from '../components/shared/ErrorBanner';

type Step = 'spec' | 'editor' | 'publish';

export default function ContextGeneratePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('spec');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');
  const [plannerSummary, setPlannerSummary] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'graph' | 'validate'>('editor');
  const [approved, setApproved] = useState(false);

  // HIL state
  const [hilStatus, setHilStatus] = useState<HilStatus>('editing');
  const [iterationCount, setIterationCount] = useState(0);
  const [testResult, setTestResult] = useState<VerifyResponse | null>(null);

  const handleGenerate = useCallback(async (
    description: string,
    contextData: string,
    agentName: string,
    sub_agents: SubAgentBrief[],
    workflows: WorkflowBrief[],
    stubs: ProposedStub[],
  ) => {
    setLoading(true);
    setError(null);
    try {
      let parsedContext: Record<string, unknown> | undefined;
      if (contextData.trim()) {
        parsedContext = JSON.parse(contextData);
      }

      const result: PipelineGenerateResponse = await agentApi.pipelineGenerate({
        description,
        context_data: parsedContext ?? null,
        agent_name: agentName || undefined,
        sub_agents: sub_agents.length > 0 ? sub_agents : null,
        workflows: workflows.length > 0 ? workflows : null,
        stubs: stubs.length > 0 ? stubs : null,
      });

      setDraftId(result.draft_id);
      setFiles(result.files);
      setActiveFile(Object.keys(result.files)[0] ?? '');
      setPlannerSummary(result.planner_summary);
      setHilStatus('editing');
      setIterationCount(0);
      setTestResult(null);
      setApproved(false);
      setStep('editor');
    } catch (e: any) {
      if (e?.detail?.failed_step) {
        setError(`Pipeline failed at "${e.detail.failed_step}" step: ${e.detail.reason}`);
      } else if (Array.isArray(e?.detail)) {
        setError(e.detail.join('\n'));
      } else if (typeof e?.detail === 'string') {
        setError(e.detail);
      } else {
        setError(e.message || 'Generation failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = useCallback((filename: string) => {
    setActiveFile(filename);
  }, []);

  const handleContentChange = useCallback((filename: string, content: string) => {
    setFiles((prev) => ({ ...prev, [filename]: content }));
  }, []);

  const handleValidate = useCallback(async (validateFiles: Record<string, string>): Promise<PipelineValidateResponse> => {
    if (!draftId) throw new Error('No draft ID');
    return await agentApi.pipelineValidate(draftId, validateFiles);
  }, [draftId]);

  const handlePublish = useCallback(async (publishFiles: Record<string, string>): Promise<string> => {
    if (!draftId) throw new Error('No draft ID');
    const result = await agentApi.pipelinePublish(draftId, publishFiles);
    return result.agent_id;
  }, [draftId]);

  const handleDownload = useCallback(async () => {
    if (!draftId) return;
    try {
      const blob = await agentApi.pipelineDownload(draftId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draftId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Download failed');
    }
  }, [draftId]);

  const handleViewAgent = useCallback((agentId: string) => {
    navigate(`/agents/${agentId}`);
  }, [navigate]);

  const handleReset = useCallback(() => {
    setStep('spec');
    setDraftId(null);
    setFiles({});
    setPlannerSummary('');
    setError(null);
    setHilStatus('editing');
    setIterationCount(0);
    setTestResult(null);
    setApproved(false);
  }, []);

  // HIL handlers
  const handleRunTest = useCallback(async () => {
    if (!draftId) return;
    setHilStatus('testing');
    setError(null);
    try {
      const result = await agentApi.pipelineVerify(draftId, files);
      setTestResult(result);
      setIterationCount((prev) => prev + 1);
      if (result.pass) {
        setHilStatus('approved');
      } else {
        setHilStatus('fix_proposed');
      }
    } catch (e: any) {
      setHilStatus('editing');
      setError(e?.detail?.reason || e.message || 'Verification failed');
    }
  }, [draftId, files]);

  const handleApplyFix = useCallback(async (mergedFiles: Record<string, string>) => {
    if (!draftId) return;
    try {
      await agentApi.pipelineApplyFix(draftId, mergedFiles);
      setFiles(mergedFiles);
      setHilStatus('editing');
      setTestResult(null);
    } catch (e: any) {
      setError(e?.detail?.reason || e.message || 'Apply fix failed');
    }
  }, [draftId]);

  const handleApprove = useCallback(async () => {
    if (!draftId) return;
    try {
      await agentApi.pipelineApprove(draftId);
      setHilStatus('approved');
      setApproved(true);
    } catch (e: any) {
      setError(e?.detail?.reason || e.message || 'Approve failed');
    }
  }, [draftId]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#212529]">Generate YAML</h2>
        <p className="text-sm text-[#868E96] mt-1">
          Describe an agent in natural language, optionally supply context data, and generate a complete YAML package via a 6-agent AI pipeline.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {step === 'spec' && (
        <SpecForm onGenerate={handleGenerate} loading={loading} />
      )}

      {step === 'editor' && (
        <div className="space-y-4">
          {plannerSummary && (
            <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg px-4 py-3">
              <p className="text-sm text-[#495057]">{plannerSummary}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-[#868E96]">
            <div className="flex items-center gap-1">
              <span className="font-medium text-[#495057]">{Object.keys(files).length} files</span>
              <span>generated in draft</span>
              <span className="text-[#ADB5BD] mx-2">|</span>
              <button onClick={handleReset} className="text-[#C0392B] hover:underline">
                Start over
              </button>
            </div>

            {hilStatus === 'approved' && !approved && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2F9E44] text-white hover:bg-[#268C3A] transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Approve & unlock publish
              </button>
            )}

            {approved && (
              <span className="flex items-center gap-1.5 text-xs text-[#2F9E44] font-medium">
                <CheckCircle className="w-4 h-4" />
                Approved
              </span>
            )}
          </div>

          <div className="border-b border-[#DEE2E6]">
            <div className="flex gap-0 -mb-px">
              {(['editor', 'graph', 'validate'] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubTab(sub)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeSubTab === sub
                      ? 'border-[#C0392B] text-[#212529]'
                      : 'border-transparent text-[#868E96] hover:text-[#495057]'
                  }`}
                >
                  {sub === 'editor' ? 'Code Editor' : sub === 'graph' ? 'Graph Preview' : 'Validate & Publish'}
                </button>
              ))}
            </div>
          </div>

          {activeSubTab === 'editor' && (
            <MultiFileEditor
              files={files}
              activeFile={activeFile}
              onFileChange={handleFileChange}
              onContentChange={handleContentChange}
              hilStatus={hilStatus}
              iterationCount={iterationCount}
              testResult={testResult}
              onRunTest={handleRunTest}
              onApplyFix={handleApplyFix}
            />
          )}

          {activeSubTab === 'graph' && (
            <DraftGraphPreview files={files} />
          )}

          {activeSubTab === 'validate' && (
            <ValidationPanel
              files={files}
              draftId={draftId ?? ''}
              onValidate={handleValidate}
              onPublish={handlePublish}
              onDownload={handleDownload}
              onViewAgent={handleViewAgent}
            />
          )}
        </div>
      )}
    </div>
  );
}
