import { createApp } from './app.js';
import { loadIndex, createStore } from './store.js';

const port = Number(process.env['PORT'] ?? 3001);
const host = process.env['HOST'] ?? '0.0.0.0';

const store = createStore(loadIndex());
const app = createApp({ store });

app.listen(port, host, () => {
  process.stdout.write(
    `api listening on http://${host}:${port} ` +
      `(${store.index.modules.length} modules, ${store.index.lessons.length} lessons, ` +
      `${store.index.exercises.length} exercises)\n`,
  );
});
