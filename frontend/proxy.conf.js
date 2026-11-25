const backendPort = process.env.BACKEND_PORT || process.env.SERVER_PORT || '8090';
const target = `http://127.0.0.1:${backendPort}`;

console.log(`[Angular DevServer Proxy] Routing '/api' -> ${target}`);

const PROXY_CONFIG = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
  },
};

module.exports = PROXY_CONFIG;
