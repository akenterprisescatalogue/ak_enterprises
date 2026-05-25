import { AlertCircle, Loader2 } from "lucide-react";

export function LoadingPanel({ label = "Loading catalog" }: { label?: string }) {
  return (
    <div className="state-panel">
      <Loader2 className="spin" size={20} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="state-panel state-panel-error">
      <AlertCircle size={20} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

