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
import { testCaseRoutes } from './test-cases.js';
import { testResultRoutes } from './test-results.js';
import { testJobRoutes } from './test-jobs.js';

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
      await api.register(testCaseRoutes, { prefix: '/' });
      await api.register(testResultRoutes, { prefix: '/' });
      await api.register(testJobRoutes, { prefix: '/' });
    },
    { prefix: '/api/v1' }
  );

  // Webhooks (no /api/v1 prefix)
  await server.register(webhookRoutes, { prefix: '/webhooks' });

  server.log.info('✅ Routes registered');
}
