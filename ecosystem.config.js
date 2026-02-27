module.exports = {
  apps: [{
    name: 'ai-sales',
    script: 'dist/index.js',
    cwd: '/root/Projects/ai-sales',
    env: { NODE_ENV: 'production' },
    restart_delay: 3000,
    max_restarts: 5,
  }]
};
