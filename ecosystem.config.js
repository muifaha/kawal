module.exports = {
  apps: [
    {
      name: "kawal-app",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "650M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NODE_OPTIONS: "--max-old-space-size=480",
        UPLOAD_DIR: "/var/www/kawal-uploads",
      },
    },
  ],
};
