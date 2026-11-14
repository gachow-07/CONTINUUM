export const DEPLOYMENT_CHANGED_MESSAGE = "The app was updated while this page was open. Refresh the page before trying again.";

/** Recognize the Next.js error without exposing its internal action ID. */
export function isDeploymentChangedError(message) {
  return message === DEPLOYMENT_CHANGED_MESSAGE || /failed to find server action/i.test(message) || /server action\s+[\s\S]*?was not found on the server/i.test(message);
}

export function actionErrorMessage(message) {
  return isDeploymentChangedError(message) ? DEPLOYMENT_CHANGED_MESSAGE : message;
}
