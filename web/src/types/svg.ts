export type iSVG = {
  title: string
  category: string | string[]
  route: string | {
    light?: string
    dark?: string
  }
  wordmark?: string | {
    light?: string
    dark?: string
  }
  url?: string
  brandUrl?: string
} 