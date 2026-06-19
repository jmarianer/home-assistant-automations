import { spawn } from 'child_process';
import { Writable } from 'stream';

export function jsonDiff(a: any, b: any): Promise<string> {
  // TODO: if dyff doesn't exist, fall back to regular diff
  return new Promise((resolve, reject) => {
    const proc = spawn('dyff', ['between', '-bsc', 'on', '/dev/fd/3', '/dev/fd/4'], {
      stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe']
      //       stdin  stdout stderr  fd3     fd4
    });

    const fd3 = proc.stdio[3] as Writable;
    const fd4 = proc.stdio[4] as Writable;

    fd3.end(JSON.stringify(a));
    fd4.end(JSON.stringify(b));

    let stdout = '';
    proc.stdout.on('data', (chunk) => stdout += chunk);
    proc.stderr.on('data', (chunk) => stdout += chunk);
    proc.on('close', (code) => {
      // dyff exits 0 for no diff, 1 for diff, 255 for error
      if (code === 255) reject(new Error(`dyff failed`));
      else resolve(stdout);
    });
  });
}
