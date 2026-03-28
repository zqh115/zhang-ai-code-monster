type StreamSseOptions = {
  url: string
  signal?: AbortSignal
  onMessage: (chunk: string) => void
  onBusinessError?: (error: {
    message: string
    code?: number
    raw: string
  }) => void
  onDone?: () => void
}

type StreamSseResult = {
  hasBusinessError: boolean
}

function normalizeSseChunk(raw: string) {
  const text = raw.trim()
  if (!text || text === '[DONE]') {
    return ''
  }

  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') {
      return parsed
    }
    if (typeof parsed?.d === 'string') {
      return parsed.d
    }
    if (typeof parsed?.data === 'string') {
      return parsed.data
    }
    if (typeof parsed?.content === 'string') {
      return parsed.content
    }
    if (typeof parsed?.message === 'string') {
      return parsed.message
    }
  } catch {
    return raw
  }

  return raw
}

function parseBusinessError(raw: string) {
  const text = raw.trim()
  if (!text) {
    return {
      message: '生成失败，请稍后重试',
      raw,
    }
  }

  try {
    const parsed = JSON.parse(text) as {
      code?: number
      message?: string
    }
    return {
      message: parsed.message?.trim() || text,
      code: parsed.code,
      raw,
    }
  } catch {
    return {
      message: text,
      raw,
    }
  }
}

function handleSseBlock(block: string, options: StreamSseOptions) {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const eventName =
    lines
      .find((line) => line.startsWith('event:'))
      ?.slice(6)
      .trim() || 'message'

  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())

  if (eventName === 'done') {
    options.onDone?.()
    return { handled: true, hasBusinessError: false }
  }

  if (!dataLines.length) {
    return { handled: false, hasBusinessError: false }
  }

  const rawData = dataLines.join('\n')
  if (eventName === 'business-error') {
    options.onBusinessError?.(parseBusinessError(rawData))
    return { handled: true, hasBusinessError: true }
  }

  const normalized = normalizeSseChunk(rawData)
  if (normalized) {
    options.onMessage(normalized)
  }

  return { handled: true, hasBusinessError: false }
}

async function handleErrorResponse(response: Response, options: StreamSseOptions): Promise<StreamSseResult> {
  const rawText = (await response.text()).trim()
  if (!rawText) {
    throw new Error(`流式请求失败：${response.status}`)
  }

  let hasBusinessError = false
  const normalizedText = rawText.replace(/\r\n/g, '\n')

  if (normalizedText.includes('event:') || normalizedText.includes('data:')) {
    const blocks = normalizedText.split('\n\n').filter((block) => block.trim())
    blocks.forEach((block) => {
      const result = handleSseBlock(block, options)
      hasBusinessError = hasBusinessError || result.hasBusinessError
    })
  }

  if (!hasBusinessError) {
    options.onBusinessError?.(parseBusinessError(rawText))
    hasBusinessError = true
  }

  return {
    hasBusinessError,
  }
}

export async function streamSse(options: StreamSseOptions): Promise<StreamSseResult> {
  const response = await fetch(options.url, {
    method: 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: {
      Accept: 'text/event-stream',
    },
  })

  if (!response.ok) {
    return handleErrorResponse(response, options)
    throw new Error(`流式请求失败：${response.status}`)
  }

  if (!response.body) {
    throw new Error(`流式请求失败：${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let hasBusinessError = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const normalizedBuffer = buffer.replace(/\r\n/g, '\n')
    const blocks = normalizedBuffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    blocks.forEach((block) => {
      const result = handleSseBlock(block, options)
      hasBusinessError = hasBusinessError || result.hasBusinessError
    })
  }

  const tail = buffer.trim()
  if (tail) {
    const result = handleSseBlock(tail, options)
    hasBusinessError = hasBusinessError || result.hasBusinessError
  }

  return {
    hasBusinessError,
  }
}
