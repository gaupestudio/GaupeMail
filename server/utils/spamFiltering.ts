import { spawn } from 'node:child_process';

export interface SpamResult {
  score: number;
  threshold: number;
  isSpam: boolean;
}

export async function checkSpamFiltering(raw: string): Promise<SpamResult | null> {
  const command = useRuntimeConfig().spamAssassinFile;
  if (!command) return null;

  try {
    const output = await runCommand(command, raw);
    const match = output.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      console.warn(`[spam] unexpected SpamAssassin output: ${output.trim()}`);
      return null;
    }
    const score = Number(match[1]);
    const threshold = Number(match[2]);
    return { score, threshold, isSpam: score >= threshold };
  } catch (err) {
    console.warn('[spam] SpamAssassin check failed:', err);
    return null;
  }
}

function runCommand(command: string, input: string, timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    // spamc -c exits 1 for spam and 0 for ham, so only a missing score is an error.
    child.on('close', (code) => {
      clearTimeout(timer);
      if (stdout.trim()) resolve(stdout);
      else reject(new Error(`exited with code ${code}: ${stderr.trim()}`));
    });

    child.stdin.on('error', () => {}); // command may exit without reading stdin
    child.stdin.end(input);
  });
}
