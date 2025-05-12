export const TASK_MESSAGE_TYPE = 'RoutingMessage';
export const TASK_API = '/v1/tasks/';
export const HOLD = '/hold';
export const UNHOLD = '/unhold';
export const CONSULT = '/consult';
export const CONSULT_ACCEPT = '/consult/accept';
export const CONSULT_END = '/consult/end';
export const TRANSFER = '/transfer';
export const CONSULT_TRANSFER = '/consult/transfer';
export const PAUSE = '/record/pause';
export const RESUME = '/record/resume';
export const WRAPUP = '/wrapup';
export const END = '/end';
export const TASK_MANAGER_FILE = 'taskManager';
export const TASK_FILE = 'task';
/**
 * Control visibility configuration map for different media types.
 * Functions return boolean values based on feature flags.
 */
/**
 * Control configuration for all media types
 */
export const MEDIA_TYPE_CONFIG = {
  // Telephony with WebRTC (browser-based)
  telephonyWebRTC: {
    accept: true,
    decline: true,
    end: true,
    muteUnmute: true,
    holdResume: true,
    consult: true,
    transfer: true,
    conference: true,
    wrapup: true,
    pauseResumeRecording: true,
    endConsult: true,
  },

  // Telephony without WebRTC (AGENT_DN, EXTENSION)
  telephonyNonWebRTC: {
    accept: false,
    decline: false,
    end: true,
    muteUnmute: false,
    holdResume: true,
    consult: true,
    transfer: true,
    conference: false,
    wrapup: true,
    pauseResumeRecording: true,
    endConsult: true,
  },

  // Chat configuration
  chat: {
    accept: true,
    decline: false,
    end: true,
    muteUnmute: false,
    holdResume: false,
    consult: false,
    transfer: true,
    conference: true,
    wrapup: true,
    pauseResumeRecording: false,
    endConsult: false,
  },

  // Email configuration
  email: {
    accept: true,
    decline: false,
    end: true,
    muteUnmute: false,
    holdResume: false,
    consult: false,
    transfer: true,
    conference: false,
    wrapup: true,
    pauseResumeRecording: false,
    endConsult: false,
  },

  // Social configuration
  social: {
    accept: true,
    decline: false,
    end: true,
    muteUnmute: false,
    holdResume: false,
    consult: false,
    transfer: true,
    conference: false,
    wrapup: true,
    pauseResumeRecording: false,
    endConsult: false,
  },

  // SMS configuration
  sms: {
    accept: true,
    decline: false,
    end: true,
    muteUnmute: false,
    holdResume: false,
    consult: false,
    transfer: true,
    conference: false,
    wrapup: true,
    pauseResumeRecording: false,
    endConsult: false,
  },

  // Default configuration for any unspecified media type
  default: {
    accept: true,
    decline: false,
    end: true,
    muteUnmute: false,
    holdResume: false,
    consult: false,
    transfer: true,
    conference: false,
    wrapup: true,
    pauseResumeRecording: false,
    endConsult: false,
  },
};
