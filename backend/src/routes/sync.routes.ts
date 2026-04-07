import { Router } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import prisma from '../lib/prisma';
import { runAggregation } from '../services/aggregation.service';

const router = Router();

// Active child processes by job ID
const activeProcesses = new Map<string, ChildProcess>();

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

    activeProcesses.set(job.id, child);

    let logOutput = '';
    child.stdout?.on('data', (data) => { logOutput += data.toString(); });
    child.stderr?.on('data', (data) => { logOutput += data.toString(); });

    child.on('close', async (code) => {
      activeProcesses.delete(job.id);
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: code === 0 ? 'completed' : 'error',
          log_output: logOutput,
          finished_at: new Date(),
        },
      });
    });

    res.json({ job_id: job.id });
  } catch (error) {
    console.error('POST /api/admin/sync/trigger error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

router.get('/sync/stream', (req, res) => {
  const jobId = req.query.job_id as string;
  if (!jobId) return res.status(400).json({ error: 'job_id required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const child = activeProcesses.get(jobId);
  if (!child) {
    // Process might have already finished before SSE connected. Check DB for logs.
    prisma.syncJob.findUnique({ where: { id: jobId } }).then(job => {
      if (job && job.log_output) {
        res.write(`data: ${job.log_output.replace(/\n/g, '\ndata: ')}\n\n`);
      } else {
        res.write(`data: [No active process for this job]\n\n`);
      }
      res.write(`event: done\ndata: ${job?.status === 'completed' ? 'completed' : 'error'}\n\n`);
      res.end();
    });
    return;
  }

  const onStdout = (data: Buffer) => res.write(`data: ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
  const onStderr = (data: Buffer) => res.write(`data: [err] ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);

  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);

  child.on('close', (code) => {
    res.write(`event: done\ndata: ${code === 0 ? 'completed' : 'error'}\n\n`);
    res.end();
  });

  req.on('close', () => {
    child.stdout?.off('data', onStdout);
    child.stderr?.off('data', onStderr);
  });
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

    activeProcesses.set(job.id, child);

    let logOutput = '';
    child.stdout?.on('data', (d) => { logOutput += d.toString(); });
    child.stderr?.on('data', (d) => { logOutput += d.toString(); });

    child.on('close', async (code) => {
      activeProcesses.delete(job.id);
      try {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status: code === 0 ? 'completed' : 'error',
            log_output: logOutput,
            finished_at: new Date(),
          },
        });
      } catch (err) {
        console.warn(`[pipeline] Could not update job ${job.id} (maybe it was deleted manually)`);
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
  const jobId = req.query.job_id as string;
  if (!jobId) return res.status(400).json({ error: 'job_id required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const child = activeProcesses.get(jobId);
  if (!child) {
    // Process might have already finished before SSE connected. Check DB for logs.
    prisma.syncJob.findUnique({ where: { id: jobId } }).then(job => {
      if (job && job.log_output) {
        res.write(`data: ${job.log_output.replace(/\n/g, '\ndata: ')}\n\n`);
      } else {
        res.write(`data: [No active process for this job]\n\n`);
      }
      res.write(`event: done\ndata: ${job?.status === 'completed' ? 'completed' : 'error'}\n\n`);
      res.end();
    });
    return;
  }

  const onStdout = (data: Buffer) => {
    res.write(`data: ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
    if (typeof (res as any).flush === 'function') (res as any).flush();
  };
  const onStderr = (data: Buffer) => {
    res.write(`data: [err] ${data.toString().replace(/\n/g, '\ndata: ')}\n\n`);
    if (typeof (res as any).flush === 'function') (res as any).flush();
  };

  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);

  // Heartbeat to prevent browser/proxy idle timeout
  const heartbeat = setInterval(() => {
    res.write(':\n\n');
    if (typeof (res as any).flush === 'function') (res as any).flush();
  }, 15000);

  child.on('close', (code) => {
    clearInterval(heartbeat);
    res.write(`event: done\ndata: ${code === 0 ? 'completed' : 'error'}\n\n`);
    res.end();
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    child.stdout?.off('data', onStdout);
    child.stderr?.off('data', onStderr);
  });
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

export default router;
