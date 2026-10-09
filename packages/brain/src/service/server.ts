// @ff/brain/service/server — one call to run the brain: home → token → BrainService → unix-socket HTTP.
// Used by bin/ff-brain-serve.ts and by the service tests (on a tmp FF_BRAIN_HOME).
import { ensureToken } from './auth.js';
import { listenBrain, type BrainHttpServer } from './http.js';
import { ensureHome, homePaths } from './paths.js';
import { BrainService, type BrainServiceOptions } from './runtime.js';

export interface RunningBrain {
  service: BrainService;
  http: BrainHttpServer;
  token: string;
  socketPath: string;
  /** Close HTTP, drain the queue, release the lock, remove the socket. */
  stop(): Promise<void>;
}

export async function startBrain(opts: BrainServiceOptions & { socketPath?: string }): Promise<RunningBrain> {
  const paths = homePaths(opts.home);
  ensureHome(paths);
  const token = ensureToken(paths.token);
  const service = BrainService.open(opts);
  try {
    await service.ready;
    const socketPath = opts.socketPath ?? paths.socket;
    const http = await listenBrain(service, { socketPath, token, ...(opts.log ? { log: opts.log } : {}) });
    return {
      service,
      http,
      token,
      socketPath,
      async stop() {
        await http.close();
        await service.close();
      },
    };
  } catch (e) {
    await service.close();
    throw e;
  }
}
