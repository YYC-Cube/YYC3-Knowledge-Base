import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-paper",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-gradient-to-b from-card to-secondary/40 px-6 py-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate font-serif text-xl font-semibold leading-none tracking-tight">
            {title}
          </h2>
          {hint && <ApiHint className="self-start">{hint}</ApiHint>}
        </div>
        {action}
      </header>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </section>
  );
}

// Operation name shown in the pill, keyed by the HTTP route that backs it.
// The route renders in a hover tooltip.
const OPERATIONS: Record<string, string> = {
  "GET /v1/sessions": "ListSessions",
  "POST /v1/sessions": "CreateSession",
  "GET /v1/sessions/{id}": "RetrieveSession",
  "DELETE /v1/sessions/{id}": "DeleteSession",
  "POST /v1/sessions/{id}/events": "SendSessionEvents",
  "GET /v1/sessions/{id}/events/stream": "StreamSessionEvents",
  "GET /v1/sessions/{id}/threads": "ListSessionThreads",
  "GET /v1/sessions/{id}/threads/{tid}/events/stream": "StreamSessionThreadEvents",
};

// Tag a UI element with the API call that backs it. The pill shows the
// operation name; hover for the underlying HTTP route.
export function ApiHint({ children, className }: { children: string; className?: string }) {
  const route = children;
  const op = OPERATIONS[route] ?? route;
  const pill = (
    <span
      className={cn(
        "inline-flex shrink-0 cursor-default items-center rounded border border-violet/30 bg-violet/10 px-1.5 py-0.5 font-mono text-[10px] leading-none text-violet",
        className,
      )}
    >
      {op}
    </span>
  );
  if (op === route) return pill; // unknown route — no tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {route}
      </TooltipContent>
    </Tooltip>
  );
}

export function EmptyState({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      {icon && <div className="text-muted-foreground/40">{icon}</div>}
      <p className="font-serif text-base text-muted-foreground">{title}</p>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

// Inline error panel: head line is the request that failed, body is the
// response text. In the starter app this is how a 501 stub surfaces — the
// body tells you which TODO to go implement.
export function ErrorBlock({ message, className }: { message: string; className?: string }) {
  const [head, ...rest] = message.split("\n");
  return (
    <div className={cn("rounded-xl border border-destructive/40 bg-destructive/10 p-3", className)}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-destructive">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        {head}
      </div>
      {rest.length > 0 && (
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[12px] leading-snug text-foreground/80">
          {rest.join("\n")}
        </pre>
      )}
    </div>
  );
}
