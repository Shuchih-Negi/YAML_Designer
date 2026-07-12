const NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  show_message:     { bg: '#E7F5FF', text: '#1971C2', border: '#1971C2' },
  ask_user:         { bg: '#FFF3BF', text: '#E67700', border: '#E67700' },
  save_value:       { bg: '#F1F3F5', text: '#495057', border: '#495057' },
  condition:        { bg: '#F3F0FF', text: '#7048E8', border: '#7048E8' },
  invoke_sub_agent: { bg: '#EDF2FF', text: '#3B5BDB', border: '#3B5BDB' },
  run_stub:         { bg: '#FFF4E6', text: '#D9480F', border: '#D9480F' },
  finish:           { bg: '#EBFBEE', text: '#2F9E44', border: '#2F9E44' },
};

const NODE_LABELS: Record<string, string> = {
  show_message:     'Show Message',
  ask_user:         'Wait for Input',
  save_value:       'Set Value',
  condition:        'Route',
  invoke_sub_agent: 'Invoke Sub-Agent',
  run_stub:         'Run Stub',
  finish:           'End',
};

interface StatusBadgeProps {
  type: string;
  label?: string;
}

export default function StatusBadge({ type, label }: StatusBadgeProps) {
  const colors = NODE_COLORS[type] ?? { bg: '#F1F3F5', text: '#868E96', border: '#868E96' };
  const displayLabel = label ?? NODE_LABELS[type] ?? type;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {displayLabel}
    </span>
  );
}