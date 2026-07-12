interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
      <div className="flex-1 text-sm text-red-700">{message}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 text-sm font-medium"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}