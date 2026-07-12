import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, GitBranch } from 'lucide-react';

const navItems = [
  { path: '/agents', label: 'Agents', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/context-pipeline', label: 'Generate YAML', icon: GitBranch },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-[#F8F9FA] border-r border-[#DEE2E6] flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-[#DEE2E6]">
        <h2 className="font-semibold text-[#212529] text-base">Agent Designer</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-white text-[#C0392B] font-medium'
                  : 'text-[#495057] hover:bg-white hover:text-[#212529]'
              }`
            }
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}