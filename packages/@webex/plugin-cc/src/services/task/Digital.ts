import Task from '.';
import routingContact from './contact';

export default class Digital extends Task {
  protected contact: ReturnType<typeof routingContact>;

  public isAcceptSupported(): boolean {
    return true;
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
    return true;
  }

  public isWrapupSupported(): boolean {
    return true;
  }

  public isConsultSupported(): boolean {
    return false;
  }

  public isTransferSupported(): boolean {
    return true;
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
}
