export function normalizeExternalId(value: unknown): string | null | undefined {
  if (value == null) return null;
  if (typeof value !== "string") return undefined;

  const id = value.trim();
  return id && id.length <= 200 ? id : undefined;
}
