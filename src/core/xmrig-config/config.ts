/* eslint-disable quotes */
/* eslint-disable quote-props */
export const config = {
  "api": {
    "id": null,
    "worker-id": null
  },
  "http": {
    "enabled": true,
    "host": "127.0.0.1",
    "port": 50080,
    "access-token": null,
    "restricted": true
  },
  "autosave": true,
  "background": false,
  "colors": true,
  "title": true,
  "cpu": {
    "enabled": true,
    "priority": 1,
    "memory-pool": true,
    "yield": true,
    "max-threads-hint": 4,
    "asm": true
  },
  "opencl": {
    "enabled": false
  },
  "cuda": {
    "enabled": false
  },
  "donate-level": 5,
  "donate-over-proxy": 0,
  "log-file": null,
  "pools": [
    {
      "algo": "cryptonight-pico/trtl",
      "coin": null,
      "url": "",
      "user": "",
      "pass": "x",
      "rig-id": null,
      "nicehash": false,
      "keepalive": true,
      "enabled": true,
      "tls": false,
      "daemon": false
    }
  ],
  "print-time": 60,
  "health-print-time": 60,
  "dmi": true,
  "retries": 5,
  "retry-pause": 5,
  "syslog": false,
  "tls": {
    "enabled": false
  },
  "user-agent": null,
  "verbose": 1,
  "watch": true,
  "rebench-algo": false,
  "bench-algo-time": 20,
  "pause-on-battery": false,
  "pause-on-active": false
};
