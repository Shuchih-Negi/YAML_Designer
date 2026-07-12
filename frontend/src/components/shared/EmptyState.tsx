import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Package className="w-16 h-16 text-[#868E96] mb-4" />
      <h3 className="text-lg font-medium text-[#212529] mb-2">No agents yet</h3>
      <p className="text-sm text-[#868E96] mb-8 max-w-md">
        Upload a YAML package or generate one with Gemini to get started.
      </p>
      <div className="flex gap-4">
        <Link
          to="/upload"
          className="px-4 py-2 bg-[#C0392B] text-white text-sm font-medium rounded-md hover:bg-red-800 transition-colors"
        >
          Upload a package
        </Link>
        <Link
          to="/generate"
          className="px-4 py-2 bg-white border border-[#DEE2E6] text-[#212529] text-sm font-medium rounded-md hover:bg-[#F8F9FA] transition-colors"
        >
          Generate with Gemini
        </Link>
      </div>
    </div>
  );
}