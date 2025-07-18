// Configure streaming settings for Azure Functions v4
export function configureStreaming(): void {
  // In v4, streaming is configured via app settings, not code
  // The app.setup() call should be in the main function file

  // Note: FUNCTIONS_REQUEST_BODY_SIZE_LIMIT should be set via app settings
  // Default is 104857600 (100MB), can be increased for large streaming data
  console.log('Azure Functions v4 streaming configuration enabled via app settings.')
}

export const streamingConfig = {
  maxBodySize: '100mb',
  enableHttpStream: true,
  requestBodySize: '104857600', // 100MB in bytes
}
