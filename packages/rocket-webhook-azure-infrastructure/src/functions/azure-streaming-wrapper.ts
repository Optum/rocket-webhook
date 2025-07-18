import { rocketFunctionIDEnvVar } from '@boostercloud/framework-types'
import { functionID, WebhookAPIResult } from '@boostercloud/rocket-webhook-types'
import { boosterRocketDispatcher } from '@boostercloud/framework-core'
import { AzureStreamHandler } from '../streaming/azure-stream-handler'
import { configureStreaming } from '../streaming/azure-functions-setup'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpRequest = any

// Configure streaming on module load
configureStreaming()

/**
 * Azure Functions wrapper that enhances the existing Booster dispatcher with streaming support
 * This maintains compatility with user-defined handlers while adding streaming capabilities
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function azureStreamingWrapper(request: HttpRequest, context: any): Promise<any> {
  try {
    // Create the request object for Booster (same as before)
    const boosterRequest = {
      [rocketFunctionIDEnvVar]: functionID,
      req: {
        method: request.method,
        url: request.url,
        originalUrl: request.originalUrl,
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: request.body || '',
        rawBody: request.body || '',
      },
    }

    // Dispatch to Booster (this calls the user's handler)
    const response: WebhookAPIResult = (await boosterRocketDispatcher(boosterRequest)) as WebhookAPIResult

    return await AzureStreamHandler.handleResponse(request, response)
  } catch (error) {
    context.error('Webhook handler error:', error)
    return {
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' },
    }
  }
}
