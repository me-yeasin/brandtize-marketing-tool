export interface EmailTab {
  id: string
  title: string
  prompt: string
  submittedPrompt: string
}

export function getTabTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return 'New Tab'

  const words = trimmed.split(/\s+/).filter(Boolean)
  const previewWords = words.slice(0, 3)
  return `${previewWords.join(' ')}...`
}
