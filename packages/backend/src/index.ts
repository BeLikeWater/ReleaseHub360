import 'dotenv/config';
import app from './app';
import prisma from './lib/prisma';

// ── Startup validation ────────────────────────────────────────────────────────
if (!process.env.ENCRYPTION_KEY && !process.env.JWT_SECRET) {
  console.error('❌ ENCRYPTION_KEY (veya JWT_SECRET) tanımlı değil. Hassas alanlar şifrelenemez.');
  process.exit(1);
}

// ── Background Jobs ───────────────────────────────────────────────────────────

/**
 * Auto-Close Cron: RESOLVED → CLOSED after 7 days
 * Runs every hour. Transition issues that have been RESOLVED for 7+ days are closed.
 */
async function autoCloseResolvedIssues() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.transitionIssue.updateMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { lte: sevenDaysAgo },
      },
      data: { status: 'CLOSED' },
    });
    if (result.count > 0) {
      console.log(`[AutoClose] ${result.count} issue(s) RESOLVED→CLOSED (7-day rule)`);
    }
  } catch (err) {
    console.error('[AutoClose] Error:', err);
  }
}

// Run on startup + every hour
autoCloseResolvedIssues();
const AUTO_CLOSE_INTERVAL = 60 * 60 * 1000; // 1 hour
const autoCloseTimer = setInterval(autoCloseResolvedIssues, AUTO_CLOSE_INTERVAL);

const PORT = process.env.PORT ?? 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 ReleaseHub360 Backend running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`  Auto-close cron: every ${AUTO_CLOSE_INTERVAL / 60000}min`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
// Ensures Prisma releases all DB connections on SIGINT (Ctrl+C) and SIGTERM (PM2/Docker stop).
// Without this, killed processes leave idle connections in PostgreSQL until pg_timeout.
const shutdown = async (signal: string) => {
  console.log(`\n[🛑] ${signal} alındı — bağlantılar kapatılıyor...`);
  clearInterval(autoCloseTimer);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[DB] Prisma bağlantıları kapatıldı.');
    process.exit(0);
  });
  // Force exit after 10s if server.close() hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
