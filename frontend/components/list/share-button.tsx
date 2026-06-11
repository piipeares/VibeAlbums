'use client'

import { useCallback } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface ShareButtonProps {
  /**
   * If provided, share this URL instead of window.location.href.
   * Useful when sharing a resource from a different page (e.g. my-lists).
   */
  listId?: string
  /** Optional tooltip override */
  title?: string
}

/**
 * Button that copies the current page URL (or a specific list URL)
 * to clipboard using the Clipboard API, with a graceful fallback.
 */
export function ShareButton({ listId, title }: ShareButtonProps) {
  const handleShare = useCallback(async () => {
    let shareUrl: string

    if (listId) {
      shareUrl = `${window.location.origin}/list/${listId}`
    } else {
      shareUrl = window.location.href
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({ title: 'Link copied!' })
      return
    } catch {
      // Clipboard API unavailable (e.g. HTTP)
    }

    // Fallback: try legacy execCommand
    try {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast({ title: 'Link copied!' })
      return
    } catch {
      // Last resort: show manual instructions
      toast({
        title: 'Could not copy automatically',
        description: `Select and copy the URL: ${shareUrl}`,
        duration: 8000,
      })
    }
  }, [listId])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleShare}
      title={title ?? 'Share this list'}
    >
      <Share2 className="h-4 w-4" />
    </Button>
  )
}
