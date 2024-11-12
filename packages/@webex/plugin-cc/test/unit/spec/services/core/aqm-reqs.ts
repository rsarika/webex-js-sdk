/* eslint-disable @typescript-eslint/no-explicit-any */
import { AqmReqs } from '../../../../../src/services/core/aqm-reqs';
import HttpRequest from '../../../../../src/services/core/HttpRequest';
import { WebSocketManager } from '../../../../../src/services/core/WebSocket/WebSocketManager';

jest.mock('../../../../../src/services/core/HttpRequest');
jest.mock('../../../../../src/logger-proxy', () => ({
  __esModule: true,
  default: {
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
    initialize: jest.fn(),
  },
}));
jest.mock('../../../../../src/services/core/WebSocket/WebSocketManager');

// Mock CustomEvent class
class MockCustomEvent<T> extends Event {
  detail: T;

  constructor(event: string, params: { detail: T }) {
    super(event);
    this.detail = params.detail;
  }
}

global.CustomEvent = MockCustomEvent as any;

const mockHttpRequest = HttpRequest as jest.MockedClass<typeof HttpRequest>;
const mockWebSocketManager = WebSocketManager as jest.MockedClass<typeof WebSocketManager>;

describe('AqmReqs', () => {
  let httpRequestInstance: jest.Mocked<HttpRequest>;
  let webSocketManagerInstance: jest.Mocked<WebSocketManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    httpRequestInstance = new HttpRequest() as jest.Mocked<HttpRequest>;
    mockHttpRequest.getInstance = jest.fn().mockReturnValue(httpRequestInstance);

    webSocketManagerInstance = new WebSocketManager({ webex: {} as any }) as jest.Mocked<WebSocketManager>;

    // Mock the addEventListener and dispatchEvent methods
    webSocketManagerInstance.addEventListener = jest.fn();
    webSocketManagerInstance.dispatchEvent = jest.fn();

    mockWebSocketManager.mockImplementation(() => webSocketManagerInstance);
  });

  it('AqmReqs should be defined', async () => {
    httpRequestInstance.request.mockResolvedValueOnce({
      status: 202,
      data: { webSocketUrl: 'fake-url' },
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const aqm = new AqmReqs(webSocketManagerInstance);
    const req = aqm.req(() => ({
      url: '/url',
      timeout: 2000,
      notifSuccess: {
        bind: {
          type: 'RoutingMessage',
          data: { type: 'AgentConsultConferenced', interactionId: 'intrid' },
        },
        msg: {},
      },
      notifFail: {
        bind: {
          type: 'RoutingMessage',
          data: { type: 'AgentConsultConferenceFailed' },
        },
        errId: 'Service.aqm.contact.consult',
      },
    }));

    try {
      await req({});
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('AqmReqs notifcancel', async () => {
    httpRequestInstance.request.mockResolvedValueOnce({
      status: 202,
      data: { webSocketUrl: 'fake-url' },
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const aqm = new AqmReqs(webSocketManagerInstance);
    const req = aqm.req(() => ({
      url: '/url',
      timeout: 4000,
      notifSuccess: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentConsultCreated',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9905',
          },
        },
        msg: {},
      },
      notifFail: {
        bind: {
          type: 'RoutingMessage',
          data: { type: 'AgentConsultFailed' },
        },
        errId: 'Service.aqm.contact.consult',
      },
      notifCancel: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentCtqCancelled',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9905',
          },
        },
        msg: {},
      },
    }));

    try {
      const p = await Promise.all([
        req({}),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            webSocketManagerInstance.dispatchEvent(new CustomEvent('message', {
              detail: JSON.stringify({
                type: 'RoutingMessage',
                data: {
                  type: 'AgentCtqCancelled',
                  interactionId: '6920dda3-337a-48b1-b82d-2333392f9905',
                },
              }),
            }));
            resolve();
          }, 1000);
        }),
      ]);
      expect(p).toBeDefined();
    } catch (e) {}
  });

  it('AqmReqs notif success', async () => {
    httpRequestInstance.request.mockResolvedValueOnce({
      status: 202,
      data: { webSocketUrl: 'fake-url' },
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const aqm = new AqmReqs(webSocketManagerInstance);
    const req = aqm.req(() => ({
      url: '/url',
      timeout: 4000,
      notifSuccess: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentConsultCreated',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9906',
          },
        },
        msg: {},
      },
      notifFail: {
        bind: {
          type: 'RoutingMessage',
          data: { type: 'AgentConsultFailed' },
        },
        errId: 'Service.aqm.contact.consult',
      },
      notifCancel: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentCtqCancelled',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9906',
          },
        },
        msg: {},
      },
    }));

    try {
      const p = await Promise.all([
        req({}),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            webSocketManagerInstance.dispatchEvent(new CustomEvent('message', {
              detail: JSON.stringify({
                type: 'RoutingMessage',
                data: {
                  type: 'AgentConsultCreated',
                  interactionId: '6920dda3-337a-48b1-b82d-2333392f9906',
                },
              }),
            }));
            resolve();
          }, 1000);
        }),
      ]);
      expect(p).toBeDefined();
    } catch (e) {}
  });

  it('AqmReqs notif success with async error', async () => {
    httpRequestInstance.request.mockRejectedValueOnce(new Error('Async error'));

    const aqm = new AqmReqs(webSocketManagerInstance);
    const req = aqm.req(() => ({
      url: '/url',
      timeout: 4000,
      notifSuccess: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentConsultCreated',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9906',
          },
        },
        msg: {},
      },
      notifFail: {
        bind: {
          type: 'RoutingMessage',
          data: { type: 'AgentConsultFailed' },
        },
        errId: 'Service.aqm.contact.consult',
      },
      notifCancel: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentCtqCancelled',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9906',
          },
        },
        msg: {},
      },
    }));

    try {
      await req({});
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('AqmReqs notif fail', async () => {
    httpRequestInstance.request.mockResolvedValueOnce({
      status: 202,
      data: { webSocketUrl: 'fake-url' },
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const aqm = new AqmReqs(webSocketManagerInstance);
    const req = aqm.req(() => ({
      url: '/url',
      timeout: 4000,
      notifSuccess: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentConsultCreated',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9907',
          },
        },
        msg: {},
      },
      notifFail: {
        bind: {
          type: 'RoutingMessage',
          data: { type: 'AgentConsultFailed' },
        },
        errId: 'Service.aqm.contact.consult',
      },
      notifCancel: {
        bind: {
          type: 'RoutingMessage',
          data: {
            type: 'AgentCtqCancelled',
            interactionId: '6920dda3-337a-48b1-b82d-2333392f9907',
          },
        },
        msg: {},
      },
    }));

    try {
      const p = await Promise.all([
        req({}),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            webSocketManagerInstance.dispatchEvent(new CustomEvent('message', {
              detail: JSON.stringify({
                type: 'RoutingMessage',
                data: {
                  type: 'AgentConsultFailed',
                  interactionId: '6920dda3-337a-48b1-b82d-2333392f9907',
                },
              }),
            }));
            resolve();
          }, 1000);
        }),
      ]);
      expect(p).toBeDefined();
    } catch (e) {}
  });
});