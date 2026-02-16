import { spawn } from 'child_process';
import { Writable } from 'stream';

export function jdDiff(a: string, b: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('jd', ['/dev/fd/3', '/dev/fd/4'], {
      stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe']
      //       stdin  stdout stderr  fd3     fd4
    });

    const fd3 = proc.stdio[3] as Writable;
    const fd4 = proc.stdio[4] as Writable;

    fd3.end(a);
    fd4.end(b);

    let stdout = '';
    proc.stdout.on('data', (chunk) => stdout += chunk);
    proc.on('close', (code) => {
      // jd exits 0 for no diff, 1 for diff, 2 for error
      if (code === 2) reject(new Error(`jd failed`));
      else resolve(stdout);
    });
  });
}
