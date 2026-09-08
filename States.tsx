export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-secondary">
      <div className="h-8 w-8 rounded-full border-2 border-border border-t-secondary animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-2">
      <h3 className="text-text-primary font-semibold">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
      <div className="h-10 w-10 rounded-full bg-danger-light text-danger flex items-center justify-center font-bold">!</div>
      <p className="text-sm text-text-secondary max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm px-4 py-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineBanner({
  kind,
  message,
}: {
  kind: "error" | "success" | "warning";
  message: string;
}) {
  const styles = {
    error: "bg-danger-light text-danger",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
  }[kind];
  return <div className={`rounded-lg px-3 py-2.5 text-sm ${styles}`}>{message}</div>;
}
