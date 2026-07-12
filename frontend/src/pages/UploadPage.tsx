import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';
import { agentApi } from '../api/agentApi';
import ErrorBanner from '../components/shared/ErrorBanner';

interface SelectedFile {
  file: File;
  name: string;
  size: number;
}

type UploadState =
  | { type: 'idle' }
  | { type: 'validating' }
  | { type: 'error'; errors: string[] }
  | { type: 'success'; agentId: string; filesSaved: number };

const YAML_EXTENSIONS = ['.yaml', '.yml'];

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({ type: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      YAML_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (files.length === 0) return;
    setSelectedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, name: f.name, size: f.size })),
    ]);
    setUploadState({ type: 'idle' });
  }, []);

  const removeFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
    setUploadState({ type: 'idle' });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => inputRef.current?.click();

  const handleValidate = async () => {
    if (selectedFiles.length === 0) return;
    setUploadState({ type: 'validating' });

    try {
      const res = await agentApi.uploadPackage(selectedFiles.map((f) => f.file));
      setUploadState({ type: 'success', agentId: res.agent_id, filesSaved: res.files_saved });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      try {
        const parsed = JSON.parse(message);
        setUploadState({ type: 'error', errors: Array.isArray(parsed) ? parsed : [message] });
      } catch {
        setUploadState({ type: 'error', errors: [message] });
      }
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#212529] mb-4">Upload Package</h2>

      {/* Rules */}
      <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg p-4 mb-6 text-sm text-[#495057]">
        <p className="font-medium mb-1">Naming rules:</p>
        <ul className="list-disc list-inside space-y-0.5 text-[#868E96]">
          <li>One <code className="text-xs bg-[#F1F3F5] px-1">agent.yaml</code> required</li>
          <li>Workflow files: <code className="text-xs bg-[#F1F3F5] px-1">workflow_*.yaml</code></li>
          <li>Stub files: <code className="text-xs bg-[#F1F3F5] px-1">stub_*.yaml</code></li>
          <li>Test files: <code className="text-xs bg-[#F1F3F5] px-1">test_*.yaml</code></li>
          <li>Only <code className="text-xs bg-[#F1F3F5] px-1">.yaml</code> and <code className="text-xs bg-[#F1F3F5] px-1">.yml</code> files accepted</li>
        </ul>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-[#C0392B] bg-[#FDECEA]' : 'border-[#ADB5BD] hover:border-[#C0392B]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".yaml,.yml"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload className="w-10 h-10 text-[#868E96] mx-auto mb-3" />
        <p className="text-sm text-[#495057]">Drag and drop YAML files here, or click to browse</p>
      </div>

      {/* File list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-1">
          {selectedFiles.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between bg-[#F8F9FA] border border-[#DEE2E6] rounded px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#868E96]" />
                <span className="text-sm text-[#212529]">{f.name}</span>
                <span className="text-xs text-[#868E96]">({(f.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button onClick={() => removeFile(f.name)} className="text-[#868E96] hover:text-red-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {selectedFiles.length > 0 && uploadState.type !== 'success' && (
        <div className="mt-4">
          <button
            onClick={handleValidate}
            disabled={uploadState.type === 'validating'}
            className="px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-red-800 disabled:bg-[#F1F3F5] disabled:text-[#868E96] disabled:cursor-not-allowed transition-colors"
          >
            {uploadState.type === 'validating' ? 'Validating...' : 'Validate & Upload'}
          </button>
        </div>
      )}

      {/* Error state */}
      {uploadState.type === 'error' && (
        <div className="mt-4">
          {uploadState.errors.map((e, i) => (
            <ErrorBanner key={i} message={e} />
          ))}
        </div>
      )}

      {/* Success state */}
      {uploadState.type === 'success' && (
        <div className="mt-6 bg-[#EBFBEE] border border-[#2F9E44] rounded-lg p-6 text-center">
          <CheckCircle className="w-10 h-10 text-[#2F9E44] mx-auto mb-2" />
          <h3 className="text-lg font-medium text-[#212529] mb-1">
            Package saved: {uploadState.agentId}
          </h3>
          <p className="text-sm text-[#868E96] mb-4">{uploadState.filesSaved} file(s) saved</p>
          <Link
            to={`/agents/${uploadState.agentId}`}
            className="inline-block px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-red-800 transition-colors"
          >
            View agent &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}