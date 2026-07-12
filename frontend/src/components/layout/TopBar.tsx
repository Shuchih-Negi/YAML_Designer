import { useLocation } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  path?: string;
}

export default function TopBar() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);

  const breadcrumbs: Breadcrumb[] = [{ label: pathParts[0] ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1) : 'Agents' }];
  if (pathParts.length > 1) {
    breadcrumbs.push({ label: decodeURIComponent(pathParts[1]) });
  }

  return (
    <header className="h-14 bg-white border-b border-[#DEE2E6] px-6 flex items-center">
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[#ADB5BD]">/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'text-[#212529] font-medium' : 'text-[#868E96]'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>
    </header>
  );
}