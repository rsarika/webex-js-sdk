import { ConnectionService } from '../../../../../../src/services/core/WebSocket/connection-service';
import { WebSocketManager } from '../../../../../../src/services/core/WebSocket/WebSocketManager';
import { Signal } from '../../../../../../src/services/core/Signal';

jest.mock('../../../../../../src/services/core/WebSocket/WebSocketManager');

describe('ConnectionService', () => {
  let connectionService: ConnectionService;
  let mockWebSocketManager: jest.Mocked<WebSocketManager>;

  beforeEach(() => {
    mockWebSocketManager = new WebSocketManager({ webex: {} as any }) as jest.Mocked<WebSocketManager>;

    // Mock the onMessage and onSocketClose properties
    mockWebSocketManager.onMessage = {
      listen: jest.fn(),
    } as any;

    mockWebSocketManager.onSocketClose = {
      listen: jest.fn(),
    } as any;

    connectionService = new ConnectionService(mockWebSocketManager);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should initialize ConnectionService', () => {
    expect(connectionService).toBeDefined();
  });

  it('should set connection properties', () => {
    const newProps = { lostConnectionRecoveryTimeout: 30000 };
    connectionService.setConnectionProp(newProps);
    expect(connectionService['connectionProp']).toEqual(newProps);
  });

  it('should handle ping message and update connection data', () => {
    const pingMessage = JSON.stringify({ keepalive: 'true' });
    connectionService['onPing'](pingMessage);
    expect(connectionService['isKeepAlive']).toBe(true);
    expect(connectionService['isConnectionLost']).toBe(false);
    expect(connectionService['isRestoreFailed']).toBe(false);
    expect(connectionService['isSocketReconnected']).toBe(false);
  });
});