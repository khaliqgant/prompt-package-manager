/**
 * Route registration
 */

import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { packageRoutes } from './packages.js';
import { searchRoutes } from './search.js';
import { userRoutes } from './users.js';
import { collectionRoutes } from './collections.js';
import { inviteRoutes } from './invites.js';
import analyticsRoutes from './analytics.js';
import authorAnalyticsRoutes from './author-analytics.js';
import authorsRoutes from './authors.js';
import { newsletterRoutes } from './newsletter.js';
import { organizationRoutes } from './organizations.js';
import { subscriptionRoutes } from './subscriptions.js';
import { webhookRoutes } from './webhooks.js';
import { playgroundRoutes } from './playground.js';
import { playgroundCreditsRoutes } from './playground-credits.js';
import { customPromptRoutes } from './custom-prompt.js';
import { testCaseRoutes } from './test-cases.js';
import { adminCostMonitoringRoutes } from './admin-cost-monitoring.js';
import { suggestedTestInputsRoutes } from './suggested-test-inputs.js';
import { playgroundAnalyticsRoutes } from './playground-analytics.js';
import { taxonomyRoutes } from './taxonomy.js';
import { aiSearchRoutes } from './ai-search.js';

export async function registerRoutes(server: FastifyInstance) {
  // API v1 routes
  server.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(packageRoutes, { prefix: '/packages' });
      await api.register(searchRoutes, { prefix: '/search' });
      await api.register(userRoutes, { prefix: '/users' });
      await api.register(collectionRoutes, { prefix: '/collections' });
      await api.register(inviteRoutes, { prefix: '/invites' });
      await api.register(analyticsRoutes, { prefix: '/analytics' });
      await api.register(authorAnalyticsRoutes, { prefix: '/author' });
      await api.register(authorsRoutes, { prefix: '/authors' });
      await api.register(newsletterRoutes, { prefix: '/newsletter' });
      await api.register(organizationRoutes, { prefix: '/organizations' });
      await api.register(subscriptionRoutes, { prefix: '/subscriptions' });
      await api.register(webhookRoutes, { prefix: '/webhooks' });
      await api.register(playgroundRoutes, { prefix: '/playground' });
      await api.register(playgroundCreditsRoutes, { prefix: '/playground' });
      await api.register(customPromptRoutes, { prefix: '/custom-prompt' });
      await api.register(testCaseRoutes, { prefix: '/' });
      await api.register(adminCostMonitoringRoutes, { prefix: '/admin/cost-analytics' });
      await api.register(suggestedTestInputsRoutes, { prefix: '/suggested-inputs' });
      await api.register(playgroundAnalyticsRoutes, { prefix: '/analytics' });
      await api.register(taxonomyRoutes, { prefix: '/taxonomy' });
      await api.register(aiSearchRoutes, { prefix: '/ai-search' });
    },
    { prefix: '/api/v1' }
  );

  server.log.info('✅ Routes registered');
}
