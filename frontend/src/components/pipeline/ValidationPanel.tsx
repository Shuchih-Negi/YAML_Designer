import { useState } from 'react';
import { CheckCircle, XCircle, Download, ArrowRight } from 'lucide-react';
import type { PipelineValidateResponse } from '../../types/agent';

interface ValidationPanelProps {
  files: Record<string, string>;
  draftId: string;
  onValidate: (files: Record<string, string>) => Promise<PipelineValidateResponse>;
  onPublish: (files: Record<string, string>) => Promise<string>;
  onDownload: () => void;
  onViewAgent: (agentId: string) => void;
}

export default function ValidationPanel({
  files,
  onValidate,
  onPublish,
  onDownload,
  onViewAgent,
}: ValidationPanelProps) {
  const [validation, setValidation] = useState<PipelineValidateResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedAgent, setPublishedAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const result = await onValidate(files);
      setValidation(result);
    } catch (e: any) {
      if (e?.detail?.failed_step) {
        setError(`Pipeline failed at "${e.detail.failed_step}" step: ${e.detail.reason}`);
      } else if (Array.isArray(e?.detail)) {
        setError(e.detail.join('\n'));
      } else if (typeof e?.detail === 'string') {
        setError(e.detail);
      } else {
        setError(e.message);
      }
    } finally {
      setValidating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const agentId = await onPublish(files);
      setPublishedAgent(agentId);
    } catch (e: any) {
      if (e?.detail?.failed_step) {
        setError(`Pipeline failed at "${e.detail.failed_step}" step: ${e.detail.reason}`);
      } else if (Array.isArray(e?.detail)) {
        setError(e.detail.join('\n'));
      } else if (typeof e?.detail === 'string') {
        setError(e.detail);
      } else {
        setError(e.message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const isFileCount = Object.keys(files).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleValidate}
          disabled={validating || !isFileCount}
          className="flex items-center gap-2 px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-lg hover:bg-[#A93226] disabled:bg-[#F1F3F5] disabled:text-[#ADB5BD] disabled:cursor-not-allowed transition-colors"
        >
          {validating ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Validate Package
        </button>

        {validation?.valid && !publishedAgent && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F9E44] text-white text-sm font-medium rounded-lg hover:bg-[#268C3A] disabled:bg-[#F1F3F5] disabled:text-[#ADB5BD] disabled:cursor-not-allowed transition-colors"
          >
            {publishing ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Publish to Agent Designer
          </button>
        )}

        <button
          onClick={onDownload}
          disabled={!isFileCount}
          className="flex items-center gap-2 px-4 py-2 border border-[#DEE2E6] text-[#495057] text-sm font-medium rounded-lg hover:bg-[#F8F9FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          Download ZIP
        </button>
      </div>

      {validation && (
        <div className={`border rounded-lg p-4 ${validation.valid ? 'border-[#2F9E44] bg-[#EBFBEE]' : 'border-[#C0392B] bg-[#FDECEA]'}`}>
          <div className="flex items-center gap-2 mb-2">
            {validation.valid ? (
              <CheckCircle className="w-5 h-5 text-[#2F9E44]" />
            ) : (
              <XCircle className="w-5 h-5 text-[#C0392B]" />
            )}
            <span className={`text-sm font-medium ${validation.valid ? 'text-[#2F9E44]' : 'text-[#C0392B]'}`}>
              {validation.valid ? 'Valid YAML Package' : `${validation.errors.length} validation error(s)`}
            </span>
          </div>
          {!validation.valid && (
            <ul className="space-y-1 ml-7">
              {validation.errors.map((err, i) => (
                <li key={i} className="text-xs text-[#C0392B]">
                  <span className="font-mono">{err.file}</span>
                  {err.line !== null && <span>:{err.line}</span>}
                  {err.line === null && <span> (package)</span>}
                  <span className="ml-1">— {err.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {publishedAgent && (
        <div className="border border-[#2F9E44] bg-[#EBFBEE] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#2F9E44]" />
            <span className="text-sm text-[#212529]">
              Package saved — <span className="font-medium">{publishedAgent}</span>
            </span>
          </div>
          <button
            onClick={() => onViewAgent(publishedAgent)}
            className="flex items-center gap-1 text-sm text-[#C0392B] font-medium hover:underline"
          >
            View agent →
          </button>
        </div>
      )}

      {error && (
        <div className="border border-[#C0392B] bg-[#FDECEA] rounded-lg p-3 text-sm text-[#C0392B]">
          {error}
        </div>
      )}
    </div>
  );
}
