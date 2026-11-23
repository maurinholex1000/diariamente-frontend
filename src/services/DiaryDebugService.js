
const isDebugEnabled = __DEV__;

const getTimestamp = () => new Date().toISOString();

const writeLog = (level, event, metadata = {}) => {
  if (!isDebugEnabled) return;

  const safeMetadata = {
    ...metadata,
    timestamp: getTimestamp(),
  };

  const prefix = `[DIARY-DEBUG][${level}]`;

  switch (level) {
    case 'ERROR':
      console.error(prefix, event, safeMetadata);
      break;

    case 'WARN':
      console.warn(prefix, event, safeMetadata);
      break;

    default:
      console.log(prefix, event, safeMetadata);
  }
};

export const DiaryDebugService = {
  info(event, metadata = {}) {
    writeLog('INFO', event, metadata);
  },

  warn(event, metadata = {}) {
    writeLog('WARN', event, metadata);
  },

  error(event, error, metadata = {}) {
    writeLog('ERROR', event, {
      ...metadata,
      errorName: error?.name || 'UnknownError',
      errorCode: error?.code || null,
      httpStatus: error?.response?.status || null,
    });
  },
};
