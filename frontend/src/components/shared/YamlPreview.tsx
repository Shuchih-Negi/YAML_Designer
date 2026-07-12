import { useState, useMemo } from 'react';
import { Copy, Check, Search, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import yaml from 'js-yaml';

interface YamlPreviewProps {
  files: Record<string, string>;
}

export default function YamlPreview({ files }: YamlPreviewProps) {
  const entries = Object.entries(files);
  const [activeFile, setActiveFile] = useState(entries[0]?.[0] ?? '');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const currentContent = files[activeFile] ?? '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  let validationBadge = null;
  try {
    yaml.load(currentContent);
    validationBadge = <span className="text-xs text-[#2F9E44] bg-[#EBFBEE] px-2 py-0.5 rounded font-medium">Valid YAML</span>;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid YAML';
    validationBadge = <span className="text-xs text-[#C0392B] bg-[#FDECEA] px-2 py-0.5 rounded font-medium">Error: {msg}</span>;
  }

  const syntaxHighlighted = useMemo(() => {
    if (!currentContent) return '';
    const lines = currentContent.split('\n');
    return lines.map((line) => {
      let highlighted = line
        .replace(/(^|\s)(#[^\n]*)/g, '$1<span class="text-[#868E96] italic">$2</span>')
        .replace(/^(\s*)([\w_-]+)(\s*:)/gm, '$1<span class="text-[#1971C2]">$2</span>$3')
        .replace(/:\s+(true|false)\b/g, ': <span class="text-[#2F9E44] font-medium">$1</span>')
        .replace(/:\s+(\d+\.?\d*)\b/g, ': <span class="text-[#E67700] font-medium">$1</span>')
        .replace(/:\s+"([^"]*)"/g, ': <span class="text-[#7048E8]">"$1"</span>')
        .replace(/:\s+'([^']*)'/g, ': <span class="text-[#7048E8]">\'$1\'</span>')
        .replace(/(^- |^\s+- )/gm, '<span class="text-[#C0392B]">$1</span>');

      if (searchQuery) {
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="bg-[#FFF3BF]">$1</mark>');
      }

      return highlighted;
    });
  }, [currentContent, searchQuery]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (entries.length === 0) {
    return <p className="text-sm text-[#868E96] py-8 text-center">No files in this package.</p>;
  }

  const searchCount = searchQuery
    ? syntaxHighlighted.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0;

  return (
    <div className="flex gap-0 border border-[#DEE2E6] rounded-lg overflow-hidden">
      {/* File sidebar */}
      <div className="w-48 shrink-0 bg-[#F8F9FA] border-r border-[#DEE2E6] p-2 space-y-0.5">
        {entries.map(([name]) => (
          <button
            key={name}
            onClick={() => setActiveFile(name)}
            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm rounded-md transition-colors ${
              activeFile === name
                ? 'bg-white text-[#212529] font-medium shadow-sm'
                : 'text-[#868E96] hover:text-[#212529] hover:bg-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#DEE2E6] bg-white">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-medium text-[#212529]">{activeFile}</h4>
            {validationBadge}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-7 pr-2 py-1 text-xs border border-[#DEE2E6] rounded w-32 focus:outline-none focus:border-[#C0392B] placeholder:text-[#ADB5BD]"
              />
              {searchCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#868E96]">
                  {searchCount}
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-[#868E96] hover:text-[#212529] transition-colors px-2 py-1 rounded hover:bg-[#F1F3F5]"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-[#2F9E44]" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy</>
              )}
            </button>
          </div>
        </div>

        {/* YAML content */}
        <div className="p-0 overflow-auto" style={{ maxHeight: '65vh' }}>
          {currentContent.split('\n').length > 50 && (
            <div className="sticky top-0 bg-white border-b border-[#DEE2E6] px-4 py-1 flex flex-wrap gap-1 z-10">
              {Object.keys(yaml.load(currentContent) ?? {}).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    const idx = currentContent.split('\n').findIndex((l) => l.startsWith(`${key}:`));
                    if (idx >= 0) {
                      document.getElementById(`line-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="text-xs px-2 py-0.5 bg-[#F1F3F5] text-[#495057] rounded hover:bg-[#E9ECEF] transition-colors"
                >
                  {key}
                </button>
              ))}
            </div>
          )}
          <pre
            className="p-4 text-sm leading-relaxed"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' }}
          >
            {syntaxHighlighted.map((html, i) => (
              <div
                key={i}
                id={`line-${i}`}
                className={`flex ${searchQuery && html.toLowerCase().includes(searchQuery.toLowerCase()) ? 'bg-[#FFF9E6] -mx-4 px-4' : ''}`}
              >
                <span className="text-[#ADB5BD] text-right w-8 mr-4 shrink-0 select-none">{i + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: html || ' ' }} className="flex-1" />
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}