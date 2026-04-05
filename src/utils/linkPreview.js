const URL_REGEX = /(https?:\/\/[^\s"'<>]+)/gi

export function extractFirstUrl(text) {
  const match = text?.match(URL_REGEX)
  return match ? match[0] : null
}

export async function fetchLinkPreview(url) {
  try {
    const res = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=false`
    )
    if (!res.ok) return null
    const { status, data } = await res.json()
    if (status !== 'success') return null
    return {
      title: data.title || null,
      description: data.description || null,
      image: data.image?.url || null,
      url: data.url || url,
      domain: new URL(url).hostname.replace(/^www\./, ''),
    }
  } catch {
    return null
  }
}
