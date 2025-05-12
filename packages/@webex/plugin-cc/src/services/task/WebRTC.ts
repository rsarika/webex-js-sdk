import {LocalMicrophoneStream, CALL_EVENT_KEYS} from '@webex/calling';
import routingContact from './contact';
import {TASK_EVENTS, TaskData, TaskResponse} from './types';
import WebCallingService from '../WebCallingService';
import {getErrorDetails} from '../core/Utils';
import {WEBRTC_FILE} from '../../constants';
import {METRIC_EVENT_NAMES} from '../../metrics/constants';
import MetricsManager from '../../metrics/MetricsManager';
import Voice from './Voice';
import {Failure} from '../core/GlobalTypes';

export default class WebRTC extends Voice {
  private localAudioStream: LocalMicrophoneStream;
  private webCallingService: WebCallingService;
  public mediaStreamTrack?: MediaStreamTrack;

  constructor(
    contact: ReturnType<typeof routingContact>,
    webCallingService: WebCallingService,
    data: TaskData
  ) {
    super(contact, data);
    this.webCallingService = webCallingService;
    this.registerWebCallListeners();
  }

  private registerWebCallListeners() {
    this.webCallingService.on(CALL_EVENT_KEYS.REMOTE_MEDIA, this.handleRemoteMedia);
  }

  public unregisterWebCallListeners(): void {
    this.webCallingService.off(CALL_EVENT_KEYS.REMOTE_MEDIA, this.handleRemoteMedia);
  }

  private handleRemoteMedia = (track: MediaStreamTrack) => {
    this.mediaStreamTrack = track;
    this.emit(TASK_EVENTS.TASK_MEDIA, track);
  };

  public isAcceptSupported(): boolean {
    return true;
  }

  public isDeclineSupported(): boolean {
    return true;
  }

  public isHoldSupported(): boolean {
    return true;
  }

  public isMuteUnmuteSupported(): boolean {
    return true;
  }

  public isEndSupported(): boolean {
    return true;
  }

  public isWrapupSupported(): boolean {
    return true;
  }

  public isConsultSupported(): boolean {
    return true;
  }

  public isTransferSupported(): boolean {
    return true;
  }

  public isConferenceSupported(): boolean {
    return false;
  }

  public isPauseRecordingSupported(): boolean {
    return true;
  }

  public isEndConsultSupported(): boolean {
    return true;
  }

  public isConsultTransferSupported(): boolean {
    return true;
  }

  /**
   * This is used for the placing the call in mute or unmute by the agent.
   *
   * @throws Error
   * @example
   * ```typescript
   * task.toggleMute().then(()=>{}).catch(()=>{})
   * ```
   */
  public async toggleMute() {
    try {
      this.webCallingService.muteUnmuteCall(this.localAudioStream);

      return Promise.resolve();
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'mute', WEBRTC_FILE);
      throw detailedError;
    }
  }

  /**
   * This is used for incoming task accept by agent.
   *
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.accept().then(()=>{}).catch(()=>{})
   * ```
   */
  public async accept(): Promise<TaskResponse> {
    try {
      this.metricsManager.timeEvent([
        METRIC_EVENT_NAMES.TASK_ACCEPT_SUCCESS,
        METRIC_EVENT_NAMES.TASK_ACCEPT_FAILED,
      ]);

      const constraints = {audio: true};

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = localStream.getAudioTracks()[0];
      this.localAudioStream = new LocalMicrophoneStream(new MediaStream([audioTrack]));
      this.webCallingService.answerCall(this.localAudioStream, this.data.interactionId);
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_ACCEPT_SUCCESS,
        {
          taskId: this.data.interactionId,
          ...MetricsManager.getCommonTrackingFieldForAQMResponse(this.data),
        },
        ['operational', 'behavioral', 'business']
      );

      return Promise.resolve(); // TODO: Update this with sending the task object received in AgentContactAssigned
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'accept', WEBRTC_FILE);
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_ACCEPT_FAILED,
        {
          taskId: this.data.interactionId,
          error: error.toString(),
          ...MetricsManager.getCommonTrackingFieldForAQMResponseFailed(error.details as Failure),
        },
        ['operational', 'behavioral', 'business']
      );
      throw detailedError;
    }
  }

  /**
   * This is used for the incoming task decline by agent.
   *
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.decline().then(()=>{}).catch(()=>{})
   * ```
   */
  public async decline(): Promise<TaskResponse> {
    try {
      this.metricsManager.timeEvent([
        METRIC_EVENT_NAMES.TASK_DECLINE_SUCCESS,
        METRIC_EVENT_NAMES.TASK_DECLINE_FAILED,
      ]);

      this.webCallingService.declineCall(this.data.interactionId);
      this.unregisterWebCallListeners();

      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_DECLINE_SUCCESS,
        {taskId: this.data.interactionId},
        ['operational', 'behavioral']
      );

      return Promise.resolve();
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'decline', WEBRTC_FILE);
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_DECLINE_FAILED,
        {
          taskId: this.data.interactionId,
          error: error.toString(),
          ...MetricsManager.getCommonTrackingFieldForAQMResponseFailed(error.details || {}),
        },
        ['operational', 'behavioral']
      );
      throw detailedError;
    }
  }
}
