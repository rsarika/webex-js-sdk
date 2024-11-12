import {Signal} from '../Signal';
import {WebSocketManager} from './WebSocketManager';
import LoggerProxy from '../../../logger-proxy';
import {
  LOST_CONNECTION_RECOVERY_TIMEOUT,
  WS_DISCONNECT_ALLOWED,
  CONNECTIVITY_CHECK_INTERVAL,
} from '../config';

type ConnectionLostDetails = {
  isConnectionLost: boolean;
  isRestoreFailed: boolean;
  isSocketReconnected: boolean;
  isKeepAlive: boolean;
};

type ConnectionProp = {
  lostConnectionRecoveryTimeout: number;
};

export class ConnectionService {
  private connectionProp: ConnectionProp = {
    lostConnectionRecoveryTimeout: LOST_CONNECTION_RECOVERY_TIMEOUT,
  };

  private wsDisconnectAllowed = WS_DISCONNECT_ALLOWED;
  private reconnectingTimer: ReturnType<typeof setTimeout>;
  private restoreTimer: ReturnType<typeof setTimeout>;
  private isConnectionLost: boolean;
  private isRestoreFailed: boolean;
  private isSocketReconnected: boolean;
  private isKeepAlive: boolean;
  private reconnectInterval: ReturnType<typeof setInterval>;
  private webSocketManager: WebSocketManager;
  private readonly onConnectionLostSend: Signal.Send<ConnectionLostDetails>;
  public readonly onConnectionLost: Signal.WithData<ConnectionLostDetails>;

  constructor(webSocketManager: WebSocketManager) {
    const {send, signal} = Signal.create.withData<ConnectionLostDetails>();
    this.onConnectionLost = signal;
    this.onConnectionLostSend = send;
    this.webSocketManager = webSocketManager;

    this.isConnectionLost = false;
    this.isRestoreFailed = false;
    this.isSocketReconnected = false;
    this.isKeepAlive = false;

    this.webSocketManager.onMessage.listen(this.onPing);
    this.webSocketManager.onSocketClose.listen(this.onSocketClose);
  }

  private dispatchEvent(socketReconnected = false): void {
    this.onConnectionLostSend({
      isConnectionLost: this.isConnectionLost,
      isRestoreFailed: this.isRestoreFailed,
      isSocketReconnected:
        !this.webSocketManager.isSocketClosed && (socketReconnected || this.isSocketReconnected),
      isKeepAlive: this.isKeepAlive,
    });
  }

  private handleConnectionLost = (): void => {
    this.isConnectionLost = true;
    this.dispatchEvent();
  };

  private clearTimerOnRestoreFailed = async () => {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
  };

  private handleRestoreFailed = async () => {
    this.isRestoreFailed = true;
    this.webSocketManager.shouldReconnect = false;
    this.dispatchEvent();
    await this.clearTimerOnRestoreFailed();
  };

  private updateConnectionData = (): void => {
    this.isRestoreFailed = false;
    this.isConnectionLost = false;
    this.isSocketReconnected = false;
  };

  public setConnectionProp(prop: ConnectionProp): void {
    this.connectionProp = prop;
  }

  private onPing = (msg: string): void => {
    const event = JSON.parse(msg);
    if (this.reconnectingTimer) {
      clearTimeout(this.reconnectingTimer);
    }
    if (this.restoreTimer) {
      clearTimeout(this.restoreTimer);
    }
    this.isKeepAlive = event.keepalive === 'true';
    const shouldUpdateConnectionData =
      this.isKeepAlive || (this.isConnectionLost && !this.isRestoreFailed);
    const shouldDispatchEvent =
      this.isKeepAlive || (this.isConnectionLost && !this.isRestoreFailed);
    const shouldDispatchEventWithReconnect = this.isSocketReconnected && this.isKeepAlive;

    if (shouldUpdateConnectionData) {
      this.updateConnectionData();
    }

    if (shouldDispatchEvent) {
      this.dispatchEvent();
    } else if (shouldDispatchEventWithReconnect) {
      this.dispatchEvent(true);
    }
  };

  private handleSocketClose = async (): Promise<void> => {
    LoggerProxy.logger.info(`event=socketConnectionRetry | Trying to reconnect to notifs socket`);
    const onlineStatus = navigator.onLine;
    if (onlineStatus) {
      await this.webSocketManager.reconnect();
      // eslint-disable-next-line no-console
      await this.clearTimerOnRestoreFailed();
      this.isSocketReconnected = true;
    } else {
      throw new Error('event=socketConnectionRetry | browser network not available');
    }
  };

  private onSocketClose = (): void => {
    this.clearTimerOnRestoreFailed();

    this.reconnectInterval = setInterval(async () => {
      await this.handleSocketClose();
    }, CONNECTIVITY_CHECK_INTERVAL);
  };
}
