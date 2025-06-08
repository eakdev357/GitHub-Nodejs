// ecosystem.config.js - การตั้งค่า PM2 สำหรับ Web System
module.exports = {
  apps: [{
    name: 'production-web',
    script: 'server.js',
    
    // การตั้งค่าพื้นฐาน
    instances: 1, // เว็บไซต์ใช้ instance เดียวก็เพียงพอ
    exec_mode: 'fork', // ใช้ fork mode สำหรับเว็บไซต์
    
    // การตั้งค่าสภาพแวดล้อม
    env: {
      NODE_ENV: 'development',
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    
    // การจัดการ Memory และ CPU
    max_memory_restart: '300M',
    node_args: '--max-old-space-size=256',
    
    // การจัดการ Log
    log_file: './logs/web-combined.log',
    out_file: './logs/web-out.log',
    error_file: './logs/web-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto Restart
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log', 'views', 'public'],
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // การตั้งค่าเพิ่มเติม
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Cron restart ทุกวันเวลา 03:00
    cron_restart: '0 3 * * *',
  }]
};