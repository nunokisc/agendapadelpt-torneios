module.exports = {
  apps: [
    {
      name: "padel_torneios",
      script: "node_modules/.bin/next",
      args: "start --port 3004",
      cwd: "/var/www/html/padel_torneios",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      restart_delay: 5000,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3004",
        DATABASE_URL: "file:./prod.db",
        PLATFORM_ADMIN_TOKEN: "",
      },
      error_file: "/var/log/pm2/padel_torneios-error.log",
      out_file:   "/var/log/pm2/padel_torneios-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
