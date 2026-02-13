import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocket } from './lib/socket';
import { scrapingScheduler } from './lib/scrapingScheduler';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  initializeSocket(server);

  // Start job scraping scheduler
  scrapingScheduler.start().catch((err) => {
    console.error('Failed to start scraping scheduler:', err);
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    scrapingScheduler.stop();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    });
});

