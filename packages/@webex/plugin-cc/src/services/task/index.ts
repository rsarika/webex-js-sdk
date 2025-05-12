import EventEmitter from 'events';
import {CallId} from '@webex/calling/dist/types/common/types';
import {getErrorDetails} from '../core/Utils';
import {TASK_FILE} from '../../constants';
import routingContact from './contact';
import {
  ITask,
  TaskResponse,
  TaskData,
  TaskId,
  WrapupPayLoad,
  ResumeRecordingPayload,
  ConsultPayload,
  ConsultEndPayload,
  TransferPayLoad,
  DESTINATION_TYPE,
  ConsultTransferPayLoad,
  TaskControlsVisibilityAndState,
} from './types';
import MetricsManager from '../../metrics/MetricsManager';
import {METRIC_EVENT_NAMES} from '../../metrics/constants';
import {Failure} from '../core/GlobalTypes';
import Services from '..';

export default abstract class Task extends EventEmitter implements ITask {
  protected contact: ReturnType<typeof routingContact>;
  public data: TaskData;
  protected metricsManager: MetricsManager;
  public webCallMap: Record<TaskId, CallId>;
  public controlsState: TaskControlsVisibilityAndState;
  public mediaStreamTrack?: MediaStreamTrack;

  constructor(contact: ReturnType<typeof routingContact>, data: TaskData) {
    super();
    this.contact = contact;
    this.data = data;
    this.webCallMap = {};
    this.metricsManager = MetricsManager.getInstance();
    this.controlsState = this.updateControlsVisibility();
  }

  public unregisterWebCallListeners(): void {
    throw new Error('Method not implemented.');
  }

  public isAcceptSupported(): boolean {
    return false;
  }

  public isDeclineSupported(): boolean {
    return false;
  }

  public isHoldSupported(): boolean {
    return false;
  }

  public isMuteUnmuteSupported(): boolean {
    return false;
  }

  public isEndSupported(): boolean {
    return false;
  }

  public isWrapupSupported(): boolean {
    return false;
  }

  public isConsultSupported(): boolean {
    return false;
  }

  public isTransferSupported(): boolean {
    return false;
  }

  public isConferenceSupported(): boolean {
    return false;
  }

  public isPauseRecordingSupported(): boolean {
    return false;
  }

  public isEndConsultSupported(): boolean {
    return false;
  }

  public isConsultTransferSupported(): boolean {
    return false;
  }

  public updateTaskData = (updatedData: TaskData, shouldOverwrite = false) => {
    this.data = shouldOverwrite ? updatedData : this.reconcileData(this.data, updatedData);
    this.controlsState = this.updateControlsVisibility();
  };

  public updateControlsVisibility(): TaskControlsVisibilityAndState {
    const agentProfile = Services.getInstance().config.getAgentProfile();
    const {isEndCallEnabled, isEndConsultEnabled} = agentProfile;
    const {state} = this.data?.interaction || {};
    const wrapUpRequired = this.data?.wrapUpRequired;

    const isNew = state === 'new';

    return {
      accept: !wrapUpRequired && isNew && this.isAcceptSupported(),
      decline: !wrapUpRequired && isNew && this.isDeclineSupported(),
      end: !wrapUpRequired && !isNew && this.isEndSupported(),
      muteUnmute: !wrapUpRequired && !isNew && this.isMuteUnmuteSupported(),
      holdResume: !wrapUpRequired && !isNew && this.isHoldSupported(),
      consult: !wrapUpRequired && !isNew && this.isConsultSupported(),
      transfer: !wrapUpRequired && !isNew && this.isTransferSupported(),
      conference: !wrapUpRequired && !isNew && this.isConferenceSupported(),
      wrapup: wrapUpRequired ?? false,
      pauseResumeRecording: !wrapUpRequired && !isNew && this.isPauseRecordingSupported(),
      endConsult: !wrapUpRequired && !isNew && this.isEndConsultSupported() && isEndConsultEnabled,
      isRecordingPaused: !wrapUpRequired && false,
      consultInitiated: !wrapUpRequired && false,
      consultInProgress: !wrapUpRequired && false,
      isHold:
        !wrapUpRequired &&
        !isNew &&
        (this.data?.interaction?.media[this.data?.mediaResourceId]?.isHold ?? false),
    };
  }

  private reconcileData(oldData: TaskData, newData: TaskData): TaskData {
    Object.keys(newData).forEach((key) => {
      if (newData[key] && typeof newData[key] === 'object' && !Array.isArray(newData[key])) {
        oldData[key] = this.reconcileData({...oldData[key]}, newData[key]);
      } else {
        oldData[key] = newData[key];
      }
    });

    return oldData;
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
      const resposne = await this.contact.accept({interactionId: this.data.interactionId});
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_ACCEPT_SUCCESS,
        {
          taskId: this.data.interactionId,
          ...MetricsManager.getCommonTrackingFieldForAQMResponse(this.data),
        },
        ['operational', 'behavioral', 'business']
      );

      return resposne;
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'accept', TASK_FILE);
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
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to hold the task.
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.hold().then(()=>{}).catch(()=>{})
   * ```
   * */
  public async hold(): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to resume the task.
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.resume().then(()=>{}).catch(()=>{})
   * ```
   */
  public async resume(): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to end the task.
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.end().then(()=>{}).catch(()=>{})
   *  ```
   */
  public async end(): Promise<TaskResponse> {
    try {
      this.metricsManager.timeEvent([
        METRIC_EVENT_NAMES.TASK_END_SUCCESS,
        METRIC_EVENT_NAMES.TASK_END_FAILED,
      ]);

      const response = await this.contact.end({interactionId: this.data.interactionId});
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_END_SUCCESS,
        {
          taskId: this.data.interactionId,
          ...MetricsManager.getCommonTrackingFieldForAQMResponse(response),
        },
        ['operational', 'behavioral', 'business']
      );

      return response;
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'end', TASK_FILE);
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_END_FAILED,
        {
          taskId: this.data.interactionId,
          ...MetricsManager.getCommonTrackingFieldForAQMResponseFailed(error.details || {}),
        },
        ['operational', 'behavioral', 'business']
      );
      throw detailedError;
    }
  }

  /**
   * This is used to wrap up the task.
   * @param wrapupPayload - WrapupPayLoad
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.wrapup(wrapupPayload).then(()=>{}).catch(()=>{})
   * ```
   */
  public async wrapup(wrapupPayload: WrapupPayLoad): Promise<TaskResponse> {
    try {
      this.metricsManager.timeEvent([
        METRIC_EVENT_NAMES.TASK_WRAPUP_SUCCESS,
        METRIC_EVENT_NAMES.TASK_WRAPUP_FAILED,
      ]);

      if (!this.data) {
        throw new Error('No task data available');
      }
      if (!wrapupPayload.auxCodeId || wrapupPayload.auxCodeId.length === 0) {
        throw new Error('AuxCodeId is required');
      }
      if (!wrapupPayload.wrapUpReason || wrapupPayload.wrapUpReason.length === 0) {
        throw new Error('WrapUpReason is required');
      }

      const response = await this.contact.wrapup({
        interactionId: this.data.interactionId,
        data: wrapupPayload,
      });

      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_WRAPUP_SUCCESS,
        {
          taskId: this.data.interactionId,
          wrapUpCode: wrapupPayload.auxCodeId,
          wrapUpReason: wrapupPayload.wrapUpReason,
          ...MetricsManager.getCommonTrackingFieldForAQMResponse(response),
        },
        ['operational', 'behavioral', 'business']
      );

      return response;
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'wrapup', TASK_FILE);
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_WRAPUP_FAILED,
        {
          taskId: this.data.interactionId,
          wrapUpCode: wrapupPayload.auxCodeId,
          wrapUpReason: wrapupPayload.wrapUpReason,
          ...MetricsManager.getCommonTrackingFieldForAQMResponseFailed(error.details || {}),
        },
        ['operational', 'behavioral', 'business']
      );
      throw detailedError;
    }
  }

  /**
   * This is used to pause the call recording
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.pauseRecording().then(()=>{}).catch(()=>{});
   * ```
   */
  public async pauseRecording(): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to pause the call recording
   * @param resumeRecordingPayload
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * task.resumeRecording(resumeRecordingPayload).then(()=>{}).catch(()=>{});
   * ```
   */
  public async resumeRecording(
    resumeRecordingPayload: ResumeRecordingPayload
  ): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to blind transfer or vTeam transfer the task
   * @param transferPayload
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * const transferPayload = {
   *  to: 'myQueueId',
   *  destinationType: 'queue',
   * }
   * task.transfer(transferPayload).then(()=>{}).catch(()=>{});
   * ```
   */
  public async transfer(transferPayload: TransferPayLoad): Promise<TaskResponse> {
    try {
      this.metricsManager.timeEvent([
        METRIC_EVENT_NAMES.TASK_TRANSFER_SUCCESS,
        METRIC_EVENT_NAMES.TASK_TRANSFER_FAILED,
      ]);

      let result: TaskResponse;
      if (transferPayload.destinationType === DESTINATION_TYPE.QUEUE) {
        result = await this.contact.vteamTransfer({
          interactionId: this.data.interactionId,
          data: transferPayload,
        });
      } else {
        result = await this.contact.blindTransfer({
          interactionId: this.data.interactionId,
          data: transferPayload,
        });
      }

      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_TRANSFER_SUCCESS,
        {
          taskId: this.data.interactionId,
          destination: transferPayload.to,
          destinationType: transferPayload.destinationType,
          isConsultTransfer: false,
          ...MetricsManager.getCommonTrackingFieldForAQMResponse(result),
        },
        ['operational', 'behavioral', 'business']
      );

      return result;
    } catch (error) {
      const {error: detailedError} = getErrorDetails(error, 'transfer', TASK_FILE);
      this.metricsManager.trackEvent(
        METRIC_EVENT_NAMES.TASK_TRANSFER_FAILED,
        {
          taskId: this.data.interactionId,
          destination: transferPayload.to,
          destinationType: transferPayload.destinationType,
          isConsultTransfer: false,
          error: error.toString(),
          ...MetricsManager.getCommonTrackingFieldForAQMResponseFailed(error.details || {}),
        },
        ['operational', 'behavioral', 'business']
      );
      throw detailedError;
    }
  }

  /**
   * This is used to consult the task
   * @param consultPayload
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * const consultPayload = {
   *   destination: 'myBuddyAgentId',
   *   destinationType: DESTINATION_TYPE.AGENT,
   * }
   * task.consult(consultPayload).then(()=>{}).catch(()=>{});
   * ```
   * */
  public async consult(consultPayload: ConsultPayload): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to end the consult
   * @param consultEndPayload
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * const consultEndPayload = {
   *  isConsult: true,
   *  queueId: 'myQueueId',
   * }
   * task.endConsult(consultEndPayload).then(()=>{}).catch(()=>{});
   * ```
   */
  public async endConsult(consultEndPayload: ConsultEndPayload): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }

  /**
   * This is used to consult transfer the task
   * @param consultTransferPayload
   * @returns Promise<TaskResponse>
   * @throws Error
   * @example
   * ```typescript
   * const consultTransferPayload = {
   * destination: 'anotherAgentId',
   * destinationType: 'agent',
   * }
   * task.consultTransfer(consultTransferPayload).then(()=>{}).catch(()=>{});
   * ```
   * */
  public async consultTransfer(
    consultTransferPayload: ConsultTransferPayLoad
  ): Promise<TaskResponse> {
    throw new Error('Method not implemented.');
  }
}
