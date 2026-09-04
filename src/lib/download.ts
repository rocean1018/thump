export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on a delay so slower browsers finish the download handoff first.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugify(text: string, fallback: string): string {
  const s = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return s.length > 0 ? s.slice(0, 40) : fallback;
}
