#!/usr/bin/env node

/**
 * Setup Supabase Storage Bucket for gAIng Files
 * Creates the storage bucket and sets up policies
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'gaing-files';

async function setupStorageBucket() {
  console.log('🚀 Setting up Supabase Storage for gAIng files...\n');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    const bucketExists = buckets.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`ℹ️  Bucket "${BUCKET_NAME}" already exists`);
    } else {
      // Create bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false, // Private bucket - requires authentication
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: [
          'text/plain',
          'text/markdown',
          'application/json',
          'text/javascript',
          'application/javascript',
          'text/x-python',
          'application/x-powershell',
          'application/x-sh',
          'text/x-shellscript',
          'image/png',
          'image/jpeg',
          'application/pdf'
        ]
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        return;
      }

      console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    }

    // Set up bucket policies (if needed - adjust based on your RLS setup)
    console.log('\n📋 Bucket policies:');
    console.log('   - Private bucket (authentication required)');
    console.log('   - File size limit: 50MB');
    console.log('   - Allowed file types: text, code, markdown, images, PDFs');

    console.log('\n✅ Storage setup complete!');
    console.log(`\n📦 Bucket name: ${BUCKET_NAME}`);
    console.log('🔗 Next step: Run sync-files-to-supabase.js to upload files');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupStorageBucket();
