/**
 * O-05: FTP Uploader
 * Uploads a Buffer as a file to an FTP server using basic-ftp.
 * Used for binary artifact delivery to ON_PREM customers.
 */
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

export interface FtpUploadOptions {
  host: string;
  port?: number;
  user: string;
  password: string;
  secure?: boolean;          // TLS/FTPS
  remotePath: string;        // e.g. "/releases/my-app-1.2.3.zip"
  content: Buffer;
  timeoutMs?: number;
}

export interface FtpUploadResult {
  success: boolean;
  remotePath: string;
  bytesUploaded: number;
  durationMs: number;
  error?: string;
}

/**
 * Uploads a Buffer to an FTP server.
 * Returns { success, remotePath, bytesUploaded, durationMs }.
 */
export async function uploadToFtp(opts: FtpUploadOptions): Promise<FtpUploadResult> {
  const {
    host,
    port = 21,
    user,
    password,
    secure = false,
    remotePath,
    content,
    timeoutMs = 30_000,
  } = opts;

  const client = new ftp.Client(timeoutMs);
  client.ftp.verbose = process.env.NODE_ENV === 'development';

  const startMs = Date.now();

  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure,
    });

    // Ensure remote directory exists
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
    if (remoteDir) await client.ensureDir(remoteDir);

    // Upload from Buffer via Readable
    const stream = Readable.from(content);
    await client.uploadFrom(stream, remotePath);

    return {
      success: true,
      remotePath,
      bytesUploaded: content.length,
      durationMs: Date.now() - startMs,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      remotePath,
      bytesUploaded: 0,
      durationMs: Date.now() - startMs,
      error: errorMsg,
    };
  } finally {
    client.close();
  }
}
