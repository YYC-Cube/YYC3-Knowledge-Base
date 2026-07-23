import path from 'node:path';

export function sanitizePattern(patterns: string | undefined): string {
  if (!patterns) return '';

  return (
    patterns
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      // Additional security checks
      .filter((p) => {
        // Prevent absolute paths - POSIX
        if (p.startsWith('/')) return false;
        // Prevent absolute paths - Windows drive-letter or UNC
        if (path.win32.isAbsolute(p)) return false;
        // Extra defensive check for drive-letter paths
        if (/^[a-zA-Z]:[\\/]/.test(p)) return false;
        // Prevent UNC paths
        if (p.startsWith('\\\\')) return false;
        // Prevent directory traversal
        if (p.includes('../') || p.includes('..\\')) return false;
        // Prevent environment variable expansion
        if (p.includes('$')) return false;
        // Prevent command execution
        if (p.includes('`') || p.includes('$(')) return false;
        return true;
      })
      .join(',')
  );
}
