type StreamSseOptions = {
  url: string
  signal?: AbortSignal
  onMessage: (chunk: string) => void
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

export async function streamSse(options: StreamSseOptions) {
  const response = await fetch(options.url, {
    method: 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: {
      Accept: 'text/event-stream',
    },
  })

  if (!response.ok || !response.body) {
    throw new Error(`流式请求失败：${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

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
      const dataLines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())

      if (!dataLines.length) {
        return
      }

      const normalized = normalizeSseChunk(dataLines.join('\n'))
      if (normalized) {
        options.onMessage(normalized)
      }
    })
  }

  const tail = buffer.trim()
  if (tail.startsWith('data:')) {
    const normalized = normalizeSseChunk(tail.slice(5).trim())
    if (normalized) {
      options.onMessage(normalized)
    }
  }
}
