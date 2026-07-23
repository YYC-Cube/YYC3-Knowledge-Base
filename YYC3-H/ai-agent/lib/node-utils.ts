export function getStatusColor(
  status: "idle" | "running" | "completed" | "error" | undefined,
  selected: boolean,
): string {
  switch (status) {
    case "running":
      return "border-yellow-500 shadow-yellow-500/50"
    case "completed":
      return "border-green-500 shadow-green-500/50"
    case "error":
      return "border-red-500 shadow-red-500/50"
    default:
      return selected ? "border-primary shadow-lg" : "border-border"
  }
}
