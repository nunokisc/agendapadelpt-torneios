module.exports = {
  apps: [
    {
      name: "padel_torneios",
      script: "node_modules/.bin/next",
      args: "start --port 3003",
      cwd: "/root/agendapadelpt-torneios",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      restart_delay: 5000,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3004",
        DATABASE_URL: "file:./dev.db",
        PLATFORM_ADMIN_TOKEN: "teste1234",
      },
      error_file: "/var/log/pm2/padel_torneios-error.log",
      out_file:   "/var/log/pm2/padel_torneios-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
