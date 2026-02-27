import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import servicesRoutes from './routes/services.routes';
import apisRoutes from './routes/apis.routes';
import modulesRoutes from './routes/modules.routes';
import customersRoutes from './routes/customers.routes';
import customerProductMappingsRoutes from './routes/customerProductMappings.routes';
import productVersionsRoutes from './routes/productVersions.routes';
import releaseNotesRoutes from './routes/releaseNotes.routes';
import hotfixRequestsRoutes from './routes/hotfixRequests.routes';
import releaseTodosRoutes from './routes/releaseTodos.routes';
import urgentChangesRoutes from './routes/urgentChanges.routes';
import systemChangesRoutes from './routes/systemChanges.routes';
import notificationsRoutes from './routes/notifications.routes';
import codeSyncRoutes from './routes/codeSync.routes';
import workflowsRoutes from './routes/workflows.routes';
import tfsRoutes from './routes/tfs.routes';
import mcpRoutes from './routes/mcp.routes';
import settingsRoutes from './routes/settings.routes';
import dashboardRoutes from './routes/dashboard.routes';
import usersRoutes from './routes/users.routes';
import workflowHistoryRoutes from './routes/workflowHistory.routes';
import serviceReleaseSnapshotsRoutes from './routes/serviceReleaseSnapshots.routes';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/apis', apisRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/customer-product-mappings', customerProductMappingsRoutes);
app.use('/api/product-versions', productVersionsRoutes);
app.use('/api/release-notes', releaseNotesRoutes);
app.use('/api/hotfix-requests', hotfixRequestsRoutes);
app.use('/api/release-todos', releaseTodosRoutes);
app.use('/api/urgent-changes', urgentChangesRoutes);
app.use('/api/system-changes', systemChangesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/code-sync', codeSyncRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/tfs', tfsRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/workflow-history', workflowHistoryRoutes);
app.use('/api/service-release-snapshots', serviceReleaseSnapshotsRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
