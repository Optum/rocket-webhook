// Use generic types to avoid @azure/functions compilation issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpRequest = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpResponseInit = any
import { WebhookAPIResult, WebhookAPISuccessResult, WebhookResponseType } from '@boostercloud/rocket-webhook-types'
import { Readable } from 'stream'

export class AzureStreamHandler {
  /**
   * Handle webhook response with streaming support for Azure Functions v4
   */
  public static async handleResponse(request: HttpRequest, response: WebhookAPIResult): Promise<HttpResponseInit> {
    if (this.isSuccess(response)) {
      return await this.handleSuccessResponse(response)
    } else {
      return this.handleErrorResponse(response)
    }
  }

  private static async handleSuccessResponse(response: WebhookAPISuccessResult): Promise<HttpResponseInit> {
    const responseInit: HttpResponseInit = {
      status: response.status,
      headers: response.headers,
    }

    // Check if this is a streaming response
    if (this.isStreamingResponse(response)) {
      return await this.handleStreamingResponse(response, responseInit)
    } else {
      // Handle non-streaming response
      responseInit.body = response.body
      return responseInit
    }
  }

  private static async handleStreamingResponse(
    response: WebhookAPISuccessResult,
    responseInit: HttpResponseInit
  ): Promise<HttpResponseInit> {
    try {
      const contentType = response.headers?.['Content-Type']

      if (contentType === WebhookResponseType.stream) {
        if (this.isReadableStream(response.body)) {
          // Proper stream handling for Azure Functions v4
          const stream = response.body as NodeJS.ReadStream

          // Handle stream errors
          stream.on('error', (error) => {
            console.error('Stream error:', error)
            // Clean up the stream if destroy method exists
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ('destroy' in stream && typeof (stream as any).destroy === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(stream as any).destroy()
            }
          })

          // Handle stream end
          stream.on('end', () => {
            console.log('Stream ended successfully')
          })

          responseInit.body = stream
          responseInit.headers = {
            ...responseInit.headers,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="data.bin"',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
          }
          return responseInit
        }
      } else if (typeof response.body === 'string') {
        // Handle string as stream
        responseInit.body = new Readable({
          read() {
            this.push(response.body)
            this.push(null)
          },
        })
        responseInit.headers = {
          ...responseInit.headers,
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
        }
        return responseInit
      }

      // Fallback to regular response
      responseInit.body = response.body
      return responseInit
    } catch (error) {
      console.error('Error handling streaming response:', error)
      // Return error response
      return {
        status: 500,
        body: JSON.stringify({ error: 'Stream processing failed' }),
        headers: { 'Content-Type': 'text/plain' },
      }
    }
  }

  private static handleErrorResponse(response: WebhookAPIResult): HttpResponseInit {
    return {
      status: response.status,
      headers: response.headers,
      body: response.body,
    }
  }

  private static isSuccess(response: WebhookAPIResult): response is WebhookAPISuccessResult {
    return (response as WebhookAPISuccessResult).status >= 200 && (response as WebhookAPISuccessResult).status < 300
  }

  private static isStreamingResponse(response: WebhookAPISuccessResult): boolean {
    return response.headers['Content-Type'] === WebhookResponseType.stream
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isReadableStream(obj: any): obj is NodeJS.ReadableStream {
    return (
      obj &&
      typeof obj.pipe === 'function' &&
      typeof obj.read === 'function' &&
      typeof obj.on === 'function' &&
      typeof obj.emit === 'function'
    )
  }
}
