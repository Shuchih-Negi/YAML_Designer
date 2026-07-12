import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle } from 'lucide-react';
import { agentApi } from '../api/agentApi';
import ErrorBanner from '../components/shared/ErrorBanner';
import type { GenerateResponse } from '../types/agent';

export default function GeneratePage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await agentApi.generate({ description });
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      try {
        const parsed = JSON.parse(msg);
        setError(Array.isArray(parsed) ? parsed.join(', ') : msg);
      } catch {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (result) {
      navigate(`/agents/${result.agent_id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-[#212529] mb-4">Generate with Gemini</h2>

      <div className="flex gap-6">
        {/* Left: Input */}
        <div className="flex-1">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your agent... (e.g. 'An agent that reviews loan applications, collects documents, checks credit policy, and produces a recommendation')"
            className="w-full h-48 p-4 border border-[#DEE2E6] rounded-lg text-sm text-[#212529] resize-none focus:outline-none focus:border-[#C0392B] placeholder:text-[#ADB5BD]"
            disabled={generating}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !description.trim()}
            className="mt-3 px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-red-800 disabled:bg-[#F1F3F5] disabled:text-[#868E96] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating with Gemini 2.5 Flash...' : 'Generate'}
          </button>

          {generating && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#868E96]">
              <div className="animate-spin h-4 w-4 border-2 border-[#C0392B] border-t-transparent rounded-full" />
              Generating with Gemini 2.5 Flash...
            </div>
          )}

          {error && !generating && (
            <div className="mt-4">
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="flex-1">
          {result && (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[#212529] mb-2">Generated Files</h3>
                <div className="space-y-1">
                  {Object.entries(result.files).map(([name]) => (
                    <div key={name} className="flex items-center gap-2 text-sm text-[#495057] bg-[#F8F9FA] border border-[#DEE2E6] rounded px-3 py-2">
                      <CheckCircle className="w-4 h-4 text-[#2F9E44]" />
                      <span>{name}</span>
                      <span className="ml-auto text-xs text-[#2F9E44] bg-[#EBFBEE] px-1.5 py-0.5 rounded">Generated</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <h4 className="text-xs font-medium text-[#495057] uppercase tracking-wider mb-1">agent.yaml</h4>
                <pre
                  className="bg-[#F1F3F5] p-3 rounded-md overflow-auto text-sm"
                  style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', maxHeight: '300px' }}
                >
                  {result.files['agent.yaml'] ?? Object.values(result.files)[0]}
                </pre>
              </div>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-red-800 transition-colors"
              >
                Save to Agent Designer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}