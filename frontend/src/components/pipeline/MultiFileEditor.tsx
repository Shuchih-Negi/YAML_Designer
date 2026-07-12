import { useState, useCallback } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Play, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import type { HilStatus, VerifyResponse } from '../../types/agent';

interface MultiFileEditorProps {
  files: Record<string, string>;
  activeFile: string;
  onFileChange: (filename: string) => void;
  onContentChange: (filename: string, content: string) => void;
  // HIL props
  hilStatus: HilStatus;
  iterationCount: number;
  testResult: VerifyResponse | null;
  onRunTest: () => Promise<void>;
  onApplyFix: (files: Record<string, string>) => Promise<void>;
}

const MAX_ITERATIONS = 8;

const STATUS_PILL: Record<HilStatus, { label: string; color: string; bg: string }> = {
  editing: { label: 'Editing', color: '#868E96', bg: '#F1F3F5' },
  testing: { label: 'Testing…', color: '#F59E0B', bg: '#FFFBEB' },
  fix_proposed: { label: 'Issues found', color: '#C0392B', bg: '#FDECEA' },
  approved: { label: 'Approved', color: '#2F9E44', bg: '#EBFBEE' },
};

export default function MultiFileEditor({
  files,
  activeFile,
  onFileChange,
  onContentChange,
  hilStatus,
  iterationCount,
  testResult,
  onRunTest,
  onApplyFix,
}: MultiFileEditorProps) {
  const filenames = Object.keys(files).sort();
  const [testing, setTesting] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffFile, setDiffFile] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ iteration: number; issues: number; applied: boolean }>>([]);
  const [applying, setApplying] = useState(false);

  const pill = STATUS_PILL[hilStatus];

  const handleRunTest = async () => {
    setTesting(true);
    try {
      await onRunTest();
    } finally {
      setTesting(false);
    }
  };

  const handleShowDiff = (file: string) => {
    setDiffFile(file);
    setShowDiff(true);
  };

  const handleApplyFix = async () => {
    if (!testResult?.suggested_fix) return;
    setApplying(true);
    try {
      const merged = { ...files, ...testResult.suggested_fix };
      await onApplyFix(merged);
      setHistory((prev) => [...prev, { iteration: iterationCount, issues: testResult.issues.length, applied: true }]);
      setShowDiff(false);
    } finally {
      setApplying(false);
    }
  };

  const handleDismissFix = () => {
    setHistory((prev) => [...prev, { iteration: iterationCount, issues: testResult?.issues.length ?? 0, applied: false }]);
    setShowDiff(false);
  };

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onContentChange(activeFile, value);
      }
    },
    [activeFile, onContentChange],
  );

  const isBlocked = iterationCount >= MAX_ITERATIONS;
  const hasFix = testResult?.suggested_fix && Object.keys(testResult.suggested_fix).length > 0;

  // Build diff content for the diff editor
  const diffOriginal = showDiff && diffFile && diffFile in files ? files[diffFile] : '';
  const diffModified = showDiff && diffFile && testResult?.suggested_fix?.[diffFile] ? testResult.suggested_fix[diffFile] : '';

  return (
    <div className="space-y-3">
      {/* HIL Status Bar */}
      <div className="flex items-center justify-between bg-white border border-[#DEE2E6] rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: pill.bg, color: pill.color }}
          >
            {hilStatus === 'testing' || testing ? (
              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
            ) : hilStatus === 'approved' ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : hilStatus === 'fix_proposed' ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pill.color }} />
            )}
            {pill.label}
          </span>
          {testResult && !testResult.pass && (
            <span className="text-xs text-[#C0392B]">
              {testResult.issues.length} issue{testResult.issues.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isBlocked && (
            <>
              <span className="text-[10px] text-[#868E96]">
                Iteration {iterationCount} of {MAX_ITERATIONS} max
              </span>
              <button
                onClick={handleRunTest}
                disabled={testing || isBlocked}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#DEE2E6] text-[#495057] hover:bg-[#F8F9FA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? (
                  <div className="animate-spin h-3 w-3 border-2 border-[#495057] border-t-transparent rounded-full" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Run Test
              </button>
            </>
          )}
        </div>
      </div>

      {/* Safety valve message */}
      {isBlocked && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-800">
          This has looped {MAX_ITERATIONS} times — consider editing the description/stubs and regenerating from scratch instead of continuing to patch.
        </div>
      )}

      {/* Editor */}
      <div className="flex border border-[#DEE2E6] rounded-lg overflow-hidden" style={{ height: 480 }}>
        <div className="w-48 bg-[#F8F9FA] border-r border-[#DEE2E6] overflow-y-auto shrink-0">
          {filenames.map((fname) => (
            <button
              key={fname}
              onClick={() => onFileChange(fname)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-[#DEE2E6] transition-colors ${
                activeFile === fname
                  ? 'bg-white text-[#212529] font-medium border-l-2 border-l-[#C0392B]'
                  : 'text-[#495057] hover:bg-white'
              }`}
            >
              <span className="truncate block font-mono text-xs">{fname}</span>
            </button>
          ))}
        </div>
        <div className="flex-1">
          <Editor
            key={activeFile}
            defaultLanguage="yaml"
            value={files[activeFile] ?? ''}
            onChange={handleEditorChange}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              renderWhitespace: 'boundary',
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`border rounded-lg ${testResult.pass ? 'border-[#2F9E44] bg-[#EBFBEE]' : 'border-[#C0392B] bg-[#FDECEA]'}`}>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {testResult.pass ? (
                  <CheckCircle className="w-4 h-4 text-[#2F9E44]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#C0392B]" />
                )}
                <span className={`text-sm font-medium ${testResult.pass ? 'text-[#2F9E44]' : 'text-[#C0392B]'}`}>
                  {testResult.pass
                    ? 'All checks passed'
                    : `${testResult.issues.length} issue${testResult.issues.length !== 1 ? 's' : ''} found`}
                </span>
              </div>
            </div>

            {!testResult.pass && (
              <ul className="space-y-1 mt-2 ml-6">
                {testResult.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-[#C0392B] flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>
                      <span className="font-mono">{issue.file}</span>
                      <span className="ml-1">— {issue.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!testResult.pass && hasFix && !showDiff && (
              <button
                onClick={() => handleShowDiff(testResult.issues[0]?.file || '')}
                className="mt-2 text-xs text-[#C0392B] underline hover:no-underline font-medium"
              >
                Suggested fix available → Show diff
              </button>
            )}
          </div>
        </div>
      )}

      {/* Diff View */}
      {showDiff && diffFile && (
        <div className="border border-[#DEE2E6] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-[#F8F9FA] px-4 py-2 border-b border-[#DEE2E6]">
            <span className="text-xs font-medium text-[#495057] font-mono">{diffFile}</span>
            <span className="text-[10px] text-[#868E96]">current ↔ suggested fix</span>
          </div>
          <div style={{ height: 300 }}>
            <DiffEditor
              key={diffFile + (testResult?.issues.length ?? 0)}
              original={diffOriginal}
              modified={diffModified}
              language="yaml"
              theme="vs"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
          <div className="flex items-center gap-2 justify-end px-4 py-2 bg-[#F8F9FA] border-t border-[#DEE2E6]">
            <button
              onClick={handleDismissFix}
              disabled={applying}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#DEE2E6] text-[#495057] hover:bg-white transition-colors"
            >
              Dismiss — I'll edit it myself
            </button>
            <button
              onClick={handleApplyFix}
              disabled={applying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#C0392B] text-white hover:bg-[#A93226] disabled:opacity-50 transition-colors"
            >
              {applying ? (
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Apply Fix
            </button>
          </div>
        </div>
      )}

      {/* Iteration History */}
      {history.length > 0 && (
        <div className="border border-[#DEE2E6] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F8F9FA] text-sm text-[#495057] hover:bg-white transition-colors"
          >
            <span className="font-medium">{history.length} iteration{history.length !== 1 ? 's' : ''} so far</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="px-4 py-2 space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#495057] py-1">
                  <span className="font-medium text-[#868E96] w-20">Iteration {h.iteration}</span>
                  <span className={h.issues > 1 ? 'text-[#C0392B]' : 'text-[#868E96]'}>
                    {h.issues} issue{h.issues !== 1 ? 's' : ''} found
                  </span>
                  <span className="text-[#ADB5BD]">→</span>
                  <span className={h.applied ? 'text-[#2F9E44]' : 'text-[#495057]'}>
                    {h.applied ? 'fix applied' : 'dismissed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
