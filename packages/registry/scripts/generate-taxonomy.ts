/**
 * Generate taxonomy (categories and use cases) from existing packages
 *
 * Usage:
 *   npm run script:generate-taxonomy
 *   npm run script:generate-taxonomy -- --approve
 *
 * Process:
 * 1. Load seed categories from config
 * 2. Analyze all packages with OpenAI
 * 3. Generate proposed subcategories and use cases
 * 4. Output JSON for manual review
 * 5. With --approve flag, insert into database
 */

import pg from 'pg';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { ProposedSubcategory, ProposedTaxonomy, TaxonomyProposal } from '@pr-pm/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const SEED_CATEGORIES = [
  { name: 'Backend Development', icon: 'server' },
  { name: 'Frontend Development', icon: 'layout' },
  { name: 'Testing & Quality', icon: 'check-circle' },
  { name: 'DevOps & Infrastructure', icon: 'cloud' },
  { name: 'AI & Machine Learning', icon: 'brain' },
  { name: 'Data Engineering', icon: 'database' },
  { name: 'Mobile Development', icon: 'smartphone' },
  { name: 'Security', icon: 'shield' },
  { name: 'Documentation', icon: 'book' },
  { name: 'Code Quality', icon: 'code' },
];

const KEYWORD_MAPPING: Record<string, string[]> = {
  'Backend Development': ['backend', 'api', 'server', 'rest', 'graphql', 'database', 'orm', 'express', 'fastify', 'django', 'flask', 'rails'],
  'Frontend Development': ['frontend', 'react', 'vue', 'angular', 'ui', 'component', 'css', 'html', 'javascript', 'typescript', 'nextjs', 'svelte'],
  'Testing & Quality': ['test', 'testing', 'qa', 'quality', 'lint', 'coverage', 'jest', 'mocha', 'pytest', 'cypress', 'selenium'],
  'DevOps & Infrastructure': ['devops', 'docker', 'kubernetes', 'ci/cd', 'deploy', 'infrastructure', 'terraform', 'ansible', 'jenkins', 'github actions'],
  'AI & Machine Learning': ['ai', 'ml', 'machine learning', 'llm', 'gpt', 'claude', 'neural', 'deep learning', 'tensorflow', 'pytorch'],
  'Data Engineering': ['data', 'etl', 'pipeline', 'analytics', 'warehouse', 'spark', 'airflow', 'kafka', 'snowflake'],
  'Mobile Development': ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
  'Security': ['security', 'auth', 'authentication', 'encryption', 'oauth', 'jwt', 'ssl', 'vulnerability'],
  'Documentation': ['docs', 'documentation', 'readme', 'guide', 'markdown', 'api docs', 'swagger'],
  'Code Quality': ['quality', 'lint', 'format', 'style', 'refactor', 'eslint', 'prettier', 'sonar']
};

function matchesSeedCategory(text: string, category: string): boolean {
  const lower = text.toLowerCase();
  const categoryKeywords = KEYWORD_MAPPING[category] || [];
  return categoryKeywords.some(kw => lower.includes(kw));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🚀 Starting taxonomy generation...\n');

  const approveMode = process.argv.includes('--approve');

  // Step 1: Verify OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable required');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Step 2: Connect to database
  const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5434'),
    database: process.env.DB_NAME || 'prpm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Test connection
    await db.query('SELECT 1');
    console.log('✓ Connected to database\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.log('\nℹ️  Make sure your database is running and .env is configured');
    process.exit(1);
  }

  // Step 3: Load all packages from database
  console.log('📦 Loading packages from database...');
  const packagesResult = await db.query(`
    SELECT
      id, name, description, format, subtype,
      tags, keywords, category, language, framework,
      total_downloads, quality_score
    FROM packages
    WHERE visibility = 'public' AND deprecated = false
    ORDER BY total_downloads DESC
  `);

  console.log(`✓ Loaded ${packagesResult.rows.length} packages\n`);

  // Step 4: For each seed category, analyze and propose structure
  const proposedTaxonomy: ProposedTaxonomy = {};

  for (const seed of SEED_CATEGORIES) {
    console.log(`🔍 Analyzing: ${seed.name}...`);

    // Group packages that match this category
    const relevantPackages = packagesResult.rows.filter(pkg => {
      const text = `${pkg.name} ${pkg.description || ''} ${pkg.tags?.join(' ') || ''} ${pkg.keywords?.join(' ') || ''} ${pkg.category || ''}`;
      return matchesSeedCategory(text, seed.name);
    });

    console.log(`  Found ${relevantPackages.length} relevant packages`);

    if (relevantPackages.length === 0) {
      proposedTaxonomy[seed.name] = {
        subcategories: {},
        use_cases: []
      };
      continue;
    }

    // Prepare package summary for AI (limit to top 100 by downloads)
    const packageSummary = relevantPackages.slice(0, 100).map(pkg => ({
      name: pkg.name,
      description: pkg.description?.substring(0, 200),
      tags: pkg.tags,
      format: pkg.format,
      subtype: pkg.subtype
    }));

    // Ask AI to propose subcategories
    const prompt = `You are analyzing a package registry for AI tools and prompts.

Category: ${seed.name}
Package Count: ${relevantPackages.length}

Sample packages (top 100 by downloads):
${JSON.stringify(packageSummary, null, 2)}

Based on these packages, propose:
1. 3-7 subcategories (level 2) that logically group these packages
2. For each subcategory, suggest 0-3 specific categories (level 3) if needed
3. 3-5 use case descriptions (what users are trying to accomplish)

Return JSON in this format:
{
  "subcategories": {
    "Subcategory Name": {
      "description": "What this covers",
      "specific_categories": ["Specific 1", "Specific 2"]
    }
  },
  "use_cases": [
    "Building REST APIs",
    "Setting up authentication"
  ]
}

Focus on developer intent and practical use cases, not just technology names.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content!);

      proposedTaxonomy[seed.name] = {
        subcategories: analysis.subcategories || {},
        use_cases: analysis.use_cases || []
      };

      console.log(`  ✓ Proposed ${Object.keys(analysis.subcategories || {}).length} subcategories\n`);
    } catch (error) {
      console.error(`  ❌ Error analyzing ${seed.name}:`, error);
      proposedTaxonomy[seed.name] = {
        subcategories: {},
        use_cases: []
      };
    }

    // Rate limiting: wait 1 second between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 5: Output to JSON file for review
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'proposed-taxonomy.json');

  // Add metadata
  const output: TaxonomyProposal = {
    generated_at: new Date().toISOString(),
    total_packages: packagesResult.rows.length,
    seed_categories: SEED_CATEGORIES,
    proposed_taxonomy: proposedTaxonomy
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n💾 Saved proposed taxonomy to: ${outputPath}`);
  console.log(`\n📊 Summary:`);

  let totalSubcategories = 0;
  let totalUseCases = 0;

  for (const [category, data] of Object.entries(proposedTaxonomy)) {
    const subCount = Object.keys(data.subcategories).length;
    const ucCount = data.use_cases.length;
    totalSubcategories += subCount;
    totalUseCases += ucCount;
    console.log(`  ${category}: ${subCount} subcategories, ${ucCount} use cases`);
  }

  console.log(`\n  Total: ${totalSubcategories} subcategories, ${totalUseCases} use cases`);

  // Step 6: If --approve flag, insert into database
  if (approveMode) {
    console.log('\n\n✅ Approval mode enabled - inserting taxonomy into database...\n');
    await insertTaxonomyIntoDatabase(db, output);
  } else {
    console.log('\n\n📝 Review the output file and run with --approve flag to insert into database');
    console.log('   Command: npm run script:generate-taxonomy -- --approve');
  }

  await db.end();
  console.log('\n✅ Done!');
}

async function insertTaxonomyIntoDatabase(db: pg.Pool, proposal: TaxonomyProposal) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    let categoryInsertCount = 0;
    let useCaseInsertCount = 0;

    // Insert categories (3 levels)
    for (let i = 0; i < proposal.seed_categories.length; i++) {
      const seed = proposal.seed_categories[i];
      const slug = slugify(seed.name);

      // Level 1: Top-level category
      const level1Result = await client.query(
        `INSERT INTO categories (name, slug, parent_id, level, icon, display_order)
         VALUES ($1, $2, NULL, 1, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [seed.name, slug, seed.icon, i]
      );
      const level1Id = level1Result.rows[0].id;
      categoryInsertCount++;

      const taxonomy = proposal.proposed_taxonomy[seed.name];
      if (!taxonomy) continue;

      // Level 2: Subcategories
      let subIndex = 0;
      for (const [subName, subData] of Object.entries(taxonomy.subcategories)) {
        const subSlug = slugify(subName);
        const level2Result = await client.query(
          `INSERT INTO categories (name, slug, parent_id, level, description, display_order)
           VALUES ($1, $2, $3, 2, $4, $5)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
           RETURNING id`,
          [subName, subSlug, level1Id, subData.description, subIndex]
        );
        const level2Id = level2Result.rows[0].id;
        categoryInsertCount++;
        subIndex++;

        // Level 3: Specific categories (if any)
        if (subData.specific_categories && subData.specific_categories.length > 0) {
          for (let specIndex = 0; specIndex < subData.specific_categories.length; specIndex++) {
            const specName = subData.specific_categories[specIndex];
            const specSlug = slugify(specName);
            await client.query(
              `INSERT INTO categories (name, slug, parent_id, level, display_order)
               VALUES ($1, $2, $3, 3, $4)
               ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
              [specName, specSlug, level2Id, specIndex]
            );
            categoryInsertCount++;
          }
        }
      }
    }

    // Insert use cases
    let useCaseIndex = 0;
    for (const [categoryName, taxonomy] of Object.entries(proposal.proposed_taxonomy)) {
      for (const useCase of taxonomy.use_cases) {
        const slug = slugify(useCase);
        await client.query(
          `INSERT INTO use_cases (name, slug, description, display_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
          [useCase, slug, `Use case for ${categoryName}`, useCaseIndex]
        );
        useCaseInsertCount++;
        useCaseIndex++;
      }
    }

    await client.query('COMMIT');

    console.log(`✅ Inserted ${categoryInsertCount} categories`);
    console.log(`✅ Inserted ${useCaseInsertCount} use cases`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting taxonomy:', error);
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
