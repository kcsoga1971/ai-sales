module.exports = {
  apps: [{
    name: 'ai-sales-frontend',
    script: 'node_modules/.bin/next',
    args: 'start -p 3004',
    cwd: '/root/Projects/ai-sales/frontend',
    env: { NODE_ENV: 'production' },
    restart_delay: 3000,
    max_restarts: 5,
  }]
};
