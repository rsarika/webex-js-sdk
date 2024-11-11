/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebSocketManager } from '../../../../../../src/services/core/WebSocket/WebSocketManager';
import { WebexSDK, SubscribeRequest } from '../../../../../../src/types';
import { SUBSCRIBE_API, WCC_API_GATEWAY } from '../../../../../../src/services/constants';

jest.mock('../../../../../../src/services/core/HttpRequest');
jest.mock('../../../../../../src/logger-proxy', () => ({
  __esModule: true,
  default: {
    logger: {
      log: jest.fn(),
      error: jest.fn(),
    },
    initialize: jest.fn(),
  },
}));

class MockWebSocket {
  static inst: MockWebSocket;
  onopen: () => void = () => { };
  onerror: (event: any) => void = () => { };
  onclose: (event: any) => void = () => { };
  onmessage: (msg: any) => void = () => { };
  close = jest.fn();
  send = jest.fn();

  constructor() {
    MockWebSocket.inst = this;
    setTimeout(() => {
      this.onopen();
    }, 10);
  }
}

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let mockWebex: WebexSDK;
  let mockWorker: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWebex = {
      request: jest.fn(),
    } as unknown as WebexSDK;

    mockWorker = {
      postMessage: jest.fn(),
      onmessage: jest.fn(),
    };

    global.Worker = jest.fn(() => mockWorker) as any;
    global.WebSocket = MockWebSocket as any;

    global.Blob = function (content: any[], options: any) {
      return { content, options };
    } as any;

    global.URL.createObjectURL = function (blob: Blob) {
      return 'blob:http://localhost:3000/12345';
    };

    webSocketManager = new WebSocketManager({ webex: mockWebex });

    setTimeout(() => {
      MockWebSocket.inst.onopen();
      MockWebSocket.inst.onmessage({ data: JSON.stringify({ type: "Welcome" }) });
      webSocketManager.close(false);
    }, 1);

    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('should initialize WebSocketManager', () => {
    expect(webSocketManager).toBeDefined();
  });

  it('should register and connect to WebSocket', async () => {
    const subscribeResponse = {
      body: {
        webSocketUrl: 'wss://fake-url',
      },
    };

    (mockWebex.request as jest.Mock).mockResolvedValueOnce(subscribeResponse);

    const subscribeRequest: SubscribeRequest = {
      routingId: 'test-routing-id',
    };

    await webSocketManager.initWebSocket({ body: subscribeRequest });

    expect(mockWebex.request).toHaveBeenCalledWith({
      service: WCC_API_GATEWAY,
      resource: SUBSCRIBE_API,
      method: 'POST',
      body: subscribeRequest,
    });
  });

  it('should close WebSocket connection', async () => {
    const subscribeResponse = {
      body: {
        webSocketUrl: 'wss://fake-url',
      },
    };

    (mockWebex.request as jest.Mock).mockResolvedValueOnce(subscribeResponse);

    const subscribeRequest: SubscribeRequest = {
      routingId: 'test-routing-id',
    };

    await webSocketManager.initWebSocket({ body: subscribeRequest });

    webSocketManager.close(true, 'Test reason');

    expect(MockWebSocket.inst.close).toHaveBeenCalled();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'terminate' });
  });

  it('should handle WebSocket keepalive messages', async () => {
    const subscribeResponse = {
      body: {
        webSocketUrl: 'wss://fake-url',
      },
    };

    (mockWebex.request as jest.Mock).mockResolvedValueOnce(subscribeResponse);

    const subscribeRequest: SubscribeRequest = {
      routingId: 'test-routing-id',
    };

    await webSocketManager.initWebSocket({ body: subscribeRequest });

    setTimeout(() => {
      MockWebSocket.inst.onopen();
      MockWebSocket.inst.onmessage({ data: JSON.stringify({ type: 'keepalive' }) });
      mockWorker.postMessage({
        data: {
          type: 'keepalive'
        }
      });
    }, 1);

    expect(MockWebSocket.inst.send).toHaveBeenCalledWith(JSON.stringify({ keepalive: 'true' }));
  });

  it('should handle WebSocket close due to network issue', async () => {
    const subscribeResponse = {
      body: {
        webSocketUrl: 'wss://fake-url',
      },
    };

    (mockWebex.request as jest.Mock).mockResolvedValueOnce(subscribeResponse);

    const subscribeRequest: SubscribeRequest = {
      routingId: 'test-routing-id',
    };

    await webSocketManager.initWebSocket({ body: subscribeRequest });

    setTimeout(() => {
      MockWebSocket.inst.onopen();
      mockWorker.postMessage({
        data: {
          type: 'closeSocket'
        }
      });
    }, 1);

    expect(MockWebSocket.inst.close).toHaveBeenCalled();
  });
});