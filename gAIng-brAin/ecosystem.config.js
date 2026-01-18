module.exports = {
  apps: [
    {
      // Main Backend Server
      name: 'gaing-brain',
      script: 'index.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 8080
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 4000,
      
      // Health monitoring
      listen_timeout: 8000,
      kill_timeout: 5000,
      
      // Source maps for debugging
      source_map_support: true
    },
    
    {
      // Orchestrator Service
      name: 'orchestrator',
      script: 'src/orchestrator.js',
      args: 'watch',
      instances: 1,
      watch: false,
      autorestart: true,
      
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/orchestrator-error.log',
      out_file: './logs/orchestrator-out.log'
    },
    
    {
      // Safa Telegram Bot
      name: 'safa-bot',
      script: 'src/safa-telegram-bot.js',
      instances: 1,
      watch: false,
      autorestart: true,
      
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/safa-error.log',
      out_file: './logs/safa-out.log',
      
      // Disable if not configured
      cron_restart: '0 4 * * *'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server'],
      ref: 'origin/main',
      repo: 'git@github.com:gAIng-Collective/gAIng-Brain.git',
      path: '/var/www/gaing-brain',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server'],
      ref: 'origin/develop',
      repo: 'git@github.com:gAIng-Collective/gAIng-Brain.git',
      path: '/var/www/gaing-brain-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env development'
    }
  }
}
