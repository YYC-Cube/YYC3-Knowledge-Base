import { bodyLimit } from 'hono/body-limit';
import { FILE_SIZE_LIMITS } from '../domains/pack/utils/fileUtils.js';
import { createErrorResponse } from '../utils/http.js';

export const bodyLimitMiddleware = bodyLimit({
  maxSize: FILE_SIZE_LIMITS.MAX_REQUEST_SIZE,
  onError: (c) => {
    const requestId = c.get('requestId');
    const response = createErrorResponse('File size too large', requestId);
    return c.json(response, 413);
  },
});
