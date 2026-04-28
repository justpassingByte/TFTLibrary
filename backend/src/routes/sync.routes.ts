import { Router } from 'express';
import type { Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import prisma from '../lib/prisma';
import { runAggregation } from '../services/aggregation.service';

const router = Router();

type RunningJob = {
  child: ChildProcess;
  logOutput: string;
  clients: Set<Response>;
};

// Active child processes by job ID, with an in-memory log buffer for SSE replay.
const activeProcesses = new Map<string, RunningJob>();

function writeSse(res: Response, data: string, event?: string) {
  if (event) res.write(`event: ${event}\n`);
  const lines = String(data).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
  if (typeof (res as any).flush === 'function') (res as any).flush();
}

function appendJobLog(jobId: string, chunk: string) {
  const running = activeProcesses.get(jobId);
  if (!running) return;

  running.logOutput += chunk;
  for (const client of running.clients) {
    writeSse(client, chunk);
  }
}

function trackProcess(jobId: string, child: ChildProcess) {
  const running: RunningJob = { child, logOutput: '', clients: new Set() };
  activeProcesses.set(jobId, running);

  child.stdout?.on('data', (d) => appendJobLog(jobId, d.toString()));
  child.stderr?.on('data', (d) => appendJobLog(jobId, `[err] ${d.toString()}`));

  return running;
}

function endJobStream(jobId: string, status: 'completed' | 'error') {
  const running = activeProcesses.get(jobId);
  if (!running) return;

  for (const client of running.clients) {
    writeSse(client, status, 'done');
    client.end();
  }
  running.clients.clear();
  activeProcesses.delete(jobId);
}

async function streamStoredOrMissingLog(res: Response, jobId: string) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (job?.log_output) {
    writeSse(res, job.log_output);
  } else {
    writeSse(res, '[No active process for this job]');
  }
  writeSse(res, job?.status === 'completed' ? 'completed' : 'error', 'done');
  res.end();
}

function openJobStream(req: any, res: Response) {
  const jobId = req.query.job_id as string;
  if (!jobId) return res.status(400).json({ error: 'job_id required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const running = activeProcesses.get(jobId);
  if (!running) {
    streamStoredOrMissingLog(res, jobId).catch(() => {
      writeSse(res, '[stream] Failed to read stored log');
      writeSse(res, 'error', 'done');
      res.end();
    });
    return;
  }

  if (running.logOutput) {
    writeSse(res, running.logOutput);
  }
  running.clients.add(res);

  const heartbeat = setInterval(() => {
    res.write(':\n\n');
    if (typeof (res as any).flush === 'function') (res as any).flush();
  }, 10000);

  req.on('close', () => {
    clearInterval(heartbeat);
    running.clients.delete(res);
  });
}

// ── DDragon Sync ─────────────────────────────────────────────────────

router.post('/sync/trigger', async (req, res) => {
  try {
    const { set_prefix, ddragon_version } = req.body;

    const job = await prisma.syncJob.create({
      data: {
        job_type: 'ddragon',
        status: 'running',
        set_prefix: set_prefix || 'TFT16',
        ddragon_version: ddragon_version || '16.7.1',
      },
    });

    const scriptPath = path.resolve(__dirname, '../../scripts/download-riot-data.mjs');
    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        TFT_SET_PREFIX: set_prefix || 'TFT16',
        DDRAGON_VERSION: ddragon_version || '16.7.1',
        SYNC_JOB_ID: job.id,
      },
      cwd: path.resolve(__dirname, '../..'),
    });

    const running = trackProcess(job.id, child);

    child.on('close', async (code) => {
      const status = code === 0 ? 'completed' : 'error';
      try {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status,
            log_output: running.logOutput,
            finished_at: new Date(),
          },
        });
      } finally {
        endJobStream(job.id, status);
      }
    });

    res.json({ job_id: job.id });
  } catch (error) {
    console.error('POST /api/admin/sync/trigger error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// ── CDragon Sync ─────────────────────────────────────────────────────

router.post('/cdragon/trigger', async (req, res) => {
  try {
    const { set_prefix, cdragon_source } = req.body;
    const source = cdragon_source || 'latest';

    const job = await prisma.syncJob.create({
      data: {
        job_type: 'cdragon',
        status: 'running',
        set_prefix: set_prefix || 'TFT16',
        ddragon_version: `cdragon-${source}`,
      },
    });

    const scriptPath = path.resolve(__dirname, '../../scripts/sync-cdragon.mjs');
    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        TFT_SET_PREFIX: set_prefix || 'TFT16',
        CDRAGON_SOURCE: source,
        SYNC_JOB_ID: job.id,
      },
      cwd: path.resolve(__dirname, '../..'),
    });

    const running = trackProcess(job.id, child);

    child.on('close', async (code) => {
      const status = code === 0 ? 'completed' : 'error';
      try {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status,
            log_output: running.logOutput,
            finished_at: new Date(),
          },
        });
      } finally {
        endJobStream(job.id, status);
      }
    });

    res.json({ job_id: job.id });
  } catch (error) {
    console.error('POST /api/admin/cdragon/trigger error:', error);
    res.status(500).json({ error: 'Failed to start CDragon sync' });
  }
});

// ── Unified Multi-Source Sync ─────────────────────────────────────────

router.post('/sync/unified/trigger', async (req, res) => {
  try {
    const { set_prefix, ddragon_version, cdragon_source, sources } = req.body;
    const prefix = set_prefix || 'TFT16';
    const ddVer = ddragon_version || '16.7.1';
    const cdSource = cdragon_source || 'latest';
    const syncSources = sources || { champions: 'cdragon', traits: 'cdragon', augments: 'ddragon', items: 'ddragon' };

    // Build a descriptive label
    const srcLabel = `${syncSources.champions === 'cdragon' ? 'cd' : 'dd'}/${syncSources.traits === 'cdragon' ? 'cd' : 'dd'}/${syncSources.augments === 'cdragon' ? 'cd' : 'dd'}/${syncSources.items === 'cdragon' ? 'cd' : 'dd'}`;

    const job = await prisma.syncJob.create({
      data: {
        job_type: 'unified',
        status: 'running',
        set_prefix: prefix,
        ddragon_version: `unified-${srcLabel}`,
      },
    });

    const scriptPath = path.resolve(__dirname, '../../scripts/sync-unified.mjs');
    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        TFT_SET_PREFIX: prefix,
        DDRAGON_VERSION: ddVer,
        CDRAGON_SOURCE: cdSource,
        SYNC_SOURCES: JSON.stringify(syncSources),
        SYNC_JOB_ID: job.id,
      },
      cwd: path.resolve(__dirname, '../..'),
    });

    const running = trackProcess(job.id, child);

    child.on('close', async (code) => {
      const status = code === 0 ? 'completed' : 'error';
      try {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status,
            log_output: running.logOutput,
            finished_at: new Date(),
          },
        });
      } finally {
        endJobStream(job.id, status);
      }
    });

    res.json({ job_id: job.id });
  } catch (error) {
    console.error('POST /api/admin/sync/unified/trigger error:', error);
    res.status(500).json({ error: 'Failed to start unified sync' });
  }
});

router.get('/sync/stream', (req, res) => {
  openJobStream(req, res);
});

router.get('/sync/logs/:id', async (req, res) => {
  try {
    const job = await prisma.syncJob.findUnique({ where: { id: req.params.id } });
    res.json({ log_output: job?.log_output || 'No log output found.' });
  } catch (error) {
    console.error('GET /api/admin/sync/logs/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

router.get('/sync/jobs', async (req, res) => {
  try {
    const jobs = await prisma.syncJob.findMany({
      orderBy: { started_at: 'desc' },
      take: 10,
    });
    res.json(jobs);
  } catch (error) {
    console.error('GET /api/admin/sync/jobs error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ── Riot Match Pipeline ──────────────────────────────────────────────

router.post('/pipeline/trigger', async (req, res) => {
  try {
    const { regions, queue_ids, max_matches, max_players, tft_set_number } = req.body;

    const job = await prisma.syncJob.create({
      data: {
        job_type: 'pipeline',
        status: 'running',
        set_prefix: `TFT${tft_set_number || 16}`,
      },
    });

    const scriptPath = path.resolve(__dirname, '../../scripts/ingest-matches.mjs');
    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        PIPELINE_JOB_ID: job.id,
        PIPELINE_REGIONS: (regions || ['na1']).join(','),
        PIPELINE_QUEUE_IDS: (queue_ids || [1100, 1130]).join(','),
        PIPELINE_MAX_MATCHES: String(max_matches || 20),
        PIPELINE_MAX_PLAYERS: String(max_players || 50),
        TFT_SET_NUMBER: String(tft_set_number || 16),
      },
      cwd: path.resolve(__dirname, '../..'),
    });

    const running = trackProcess(job.id, child);

    child.on('close', async (code) => {
      let status: 'completed' | 'error' = code === 0 ? 'completed' : 'error';
      try {
        if (code === 0) {
          appendJobLog(job.id, '[pipeline] Running full analytics aggregation...\n');
          const patches = await runAggregation();
          appendJobLog(job.id, `[pipeline] Full analytics aggregation complete: ${patches.join(', ') || 'no patches'}\n`);
        }

        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status,
            log_output: running.logOutput,
            finished_at: new Date(),
          },
        });
      } catch (err) {
        status = 'error';
        const message = err instanceof Error ? err.message : String(err);
        appendJobLog(job.id, `[pipeline] Full analytics aggregation failed: ${message}\n`);
        console.warn(`[pipeline] Could not update job ${job.id} (maybe it was deleted manually)`);
        try {
          await prisma.syncJob.update({
            where: { id: job.id },
            data: {
              status,
              log_output: running.logOutput,
              finished_at: new Date(),
            },
          });
        } catch {}
      } finally {
        endJobStream(job.id, status);
      }
    });

    res.json({ job_id: job.id });
  } catch (error) {
    console.error('POST /api/admin/pipeline/trigger error:', error);
    res.status(500).json({ error: 'Failed to start pipeline' });
  }
});

// Pipeline SSE stream (reuses same activeProcesses map)
router.get('/pipeline/stream', (req, res) => {
  openJobStream(req, res);
});

// ── Aggregation ──────────────────────────────────────────────────────

router.post('/pipeline/aggregate', async (req, res) => {
  try {
    const patches = await runAggregation();
    res.json({ success: true, patches });
  } catch (error) {
    console.error('POST /api/admin/pipeline/aggregate error:', error);
    res.status(500).json({ error: 'Aggregation failed' });
  }
});
// ── Patch Notes Crawler ──────────────────────────────────────────────

router.post('/patch-notes/crawl', async (req, res) => {
  try {
    const { url, set_prefix } = req.body; // optional override URL and set prefix

    const job = await prisma.syncJob.create({
      data: {
        job_type: 'patch_crawl',
        status: 'running',
        set_prefix: set_prefix || 'patch-notes',
      },
    });

    const scriptPath = path.resolve(__dirname, '../../scripts/crawl-patch-notes.mjs');
    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        SYNC_JOB_ID: job.id,
        SET_PREFIX: set_prefix || 'patch-notes',
        ...(url ? { PATCH_NOTES_URL: url } : {}),
      },
      cwd: path.resolve(__dirname, '../..'),
    });

    const running = trackProcess(job.id, child);

    child.on('close', async (code) => {
      const status = code === 0 ? 'completed' : 'error';
      try {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status,
            log_output: running.logOutput,
            finished_at: new Date(),
          },
        });
      } catch (err) {
        console.warn(`[patch-crawl] Could not update job ${job.id}`);
      } finally {
        endJobStream(job.id, status);
      }
    });

    res.json({ job_id: job.id });
  } catch (error) {
    console.error('POST /api/admin/patch-notes/crawl error:', error);
    res.status(500).json({ error: 'Failed to start patch crawl' });
  }
});

router.get('/patch-notes/stream', (req, res) => {
  openJobStream(req, res);
});

export default router;
