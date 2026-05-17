export type ArtifactActionType = 'file' | 'shell' | 'start'

export interface ParsedAction {
  type: ArtifactActionType
  filePath?: string
  content: string
}

export interface ParsedArtifact {
  id: string
  title: string
  actions: ParsedAction[]
}

// Parses a completed (non-streaming) AI response text into artifacts.
// For streaming, call this on accumulated text chunks.
export function parseArtifacts(text: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = []
  const artifactRegex = /<boltArtifact\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/boltArtifact>/g
  const actionRegex = /<boltAction\s+type="([^"]+)"(?:\s+filePath="([^"]+)")?>([\s\S]*?)<\/boltAction>/g

  let artifactMatch: RegExpExecArray | null
  while ((artifactMatch = artifactRegex.exec(text)) !== null) {
    const [, id, title, body] = artifactMatch
    const actions: ParsedAction[] = []

    let actionMatch: RegExpExecArray | null
    while ((actionMatch = actionRegex.exec(body ?? '')) !== null) {
      const [, type, filePath, content] = actionMatch
      actions.push({
        type: type as ArtifactActionType,
        filePath: filePath ?? undefined,
        content: (content ?? '').trim(),
      })
    }

    artifacts.push({ id: id ?? '', title: title ?? '', actions })
  }

  return artifacts
}

// Returns true if the text contains a complete or in-progress boltArtifact tag
export function hasArtifact(text: string): boolean {
  return text.includes('<boltArtifact')
}

// Extracts the text portion before the first artifact tag (the explanation)
export function extractPreamble(text: string): string {
  const idx = text.indexOf('<boltArtifact')
  return idx === -1 ? text : text.slice(0, idx).trim()
}
