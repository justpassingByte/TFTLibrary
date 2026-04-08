import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import metaRoutes from './routes/meta.routes';
import adminRoutes from './routes/admin.routes';
import syncRoutes from './routes/sync.routes';
import internalRoutes from './routes/internal.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/meta', metaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', syncRoutes);
app.use('/api/internal', internalRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
