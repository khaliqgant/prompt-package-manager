# Scripts

This directory contains utility scripts for the PRPM project.

## prepare-ssg-data.sh

Prepares SSG (Static Site Generation) data for Next.js builds by downloading data from S3 and creating fallback files if needed.

### Usage

```bash
# Basic usage (from project root)
./scripts/prepare-ssg-data.sh

# With debug output
DEBUG=true ./scripts/prepare-ssg-data.sh
```

### What it does

1. **Creates directory**: Ensures `packages/webapp/public/seo-data` exists
2. **Downloads from S3**: Attempts to download `packages.json` and `collections.json` from S3 (if AWS CLI is available and configured)
3. **Validates data**: Checks if files are valid JSON and not empty
4. **Creates fallbacks**: If files are missing or invalid, creates minimal fallback data
5. **Verifies**: Ensures files are readable and reports final status

### Testing Locally

You can test the script locally to debug SSG data issues:

```bash
# From project root
cd /Users/khaliqgant/Projects/prpm/app

# Run with debug mode to see detailed information
DEBUG=true ./scripts/prepare-ssg-data.sh

# Then check the files were created correctly
ls -lh packages/webapp/public/seo-data/
cat packages/webapp/public/seo-data/packages.json | jq '.'
cat packages/webapp/public/seo-data/collections.json | jq '.'
```

### Environment Variables

- `DEBUG`: Set to `true` to enable verbose debug output showing file paths, sizes, and sample data
- AWS credentials: If AWS CLI is configured, the script will attempt to download from S3

### Exit Codes

- `0`: Success - SSG data is prepared and ready
- `1`: Error - Required files are missing or not readable

### Output Files

The script creates/validates these files:

- `packages/webapp/public/seo-data/packages.json` - List of packages for SSG
- `packages/webapp/public/seo-data/collections.json` - List of collections for SSG

### Troubleshooting

**Q: Why are files not being found during Next.js build?**
A: Run the script with `DEBUG=true` to see the absolute paths being used. Make sure you're running Next.js from the correct working directory.

**Q: Why am I seeing fallback data instead of real S3 data?**
A: Check that:
- AWS CLI is installed (`aws --version`)
- AWS credentials are configured (`aws sts get-caller-identity`)
- The S3 bucket exists and has the required files
- You have read permissions on the S3 bucket

**Q: How do I test if Next.js can find the files?**
A: Run the script, then from `packages/webapp` directory, run:
```bash
node -e "const fs = require('fs'); const path = require('path'); console.log(path.join(process.cwd(), 'public', 'seo-data', 'packages.json')); console.log(fs.existsSync(path.join(process.cwd(), 'public', 'seo-data', 'packages.json')))"
```

This will show you the path Next.js is looking for and whether the file exists.
