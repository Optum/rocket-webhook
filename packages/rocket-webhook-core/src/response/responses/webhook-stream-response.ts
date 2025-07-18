import { WebhookResponseClass } from '../webhook-response-builder'
import { Headers, WebhookHandlerStreamReturnType } from '@boostercloud/rocket-webhook-types'

export class WebhookStreamResponse implements WebhookResponseClass {
  getBody(response?: WebhookHandlerStreamReturnType): unknown {
    const body = response?.body
    if (this.isReadableStream(body)) {
      return body
    }
    return body
  }

  getHeaders(response?: WebhookHandlerStreamReturnType): Headers {
    const headers: Headers = {}

    if (response?.file?.mimeType) {
      headers['Content-Type'] = response.file.mimeType
    }

    if (response?.file?.name) {
      headers['Content-Disposition'] = `attachment; filename="${response.file.name}"`
    }

    headers['Transfer-Encoding'] = 'chunked'
    headers['Cache-Control'] = 'no-cache'
    headers['Connection'] = 'keep-alive'

    return headers
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isReadableStream(obj: any): obj is NodeJS.ReadableStream {
    return obj && typeof obj.pipe === 'function' && typeof obj.read === 'function'
  }
}
