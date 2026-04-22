import "server-only";
import { YoutubeTranscript } from "youtube-transcript";
import type { TranscriptResult, ImportType } from "@/types/admin";

export interface TranscriptFetcher {
  fetchTranscript(url: string, type: ImportType): Promise<TranscriptResult>;
}

// ────────────────────────────────────────────────────────────────────────────
// YouTube Transcript Fetcher — uses youtube-transcript library
// ────────────────────────────────────────────────────────────────────────────

class YouTubeTranscriptFetcher implements TranscriptFetcher {
  private extractVideoId(url: string): string {
    // Handle various YouTube URL formats
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    );
    if (!match || !match[1]) {
      throw new Error(`Invalid YouTube URL: ${url}`);
    }
    return match[1];
  }

  async fetchTranscript(
    url: string,
    _type: ImportType
  ): Promise<TranscriptResult> {
    const videoId = this.extractVideoId(url);

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
      });

      // Join transcript chunks into a single text
      const raw_content = transcript
        .map((item) => item.text)
        .join(" ");

      // Clean up: remove extra whitespace
      const cleaned_content = raw_content
        .replace(/\s+/g, " ")
        .trim();

      return {
        raw_content,
        cleaned_content,
        title: `YouTube transcript: ${videoId}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to fetch YouTube transcript for ${videoId}: ${message}`
      );
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Mock Transcript Fetcher — fallback for testing without real URLs
// ────────────────────────────────────────────────────────────────────────────

class MockTranscriptFetcher implements TranscriptFetcher {
  async fetchTranscript(url: string, type: ImportType): Promise<TranscriptResult> {
    const mockTranscript = `Welcome back everyone. Today we're diving deep into Saturn transiting through Pisces and what that means for your natal placements, especially if you have Saturn in your 12th house or Pisces in a significant position.

When Saturn conjuncts your natal Moon, you will feel a heaviness in your emotional body. This is not punishment — it's crystallisation. It's form being given to what was previously formless and unconscious. The invitation during this transit is to take responsibility for your entire emotional landscape.

For Aries rising, Saturn moving through your 12th house is especially significant. Your hidden patterns become visible. Old karmic debts surface. This is a period for inner work, not outer visibility. Do the work no one can see yet. Your strength is being forged in solitude.

The key with Saturn in Pisces is boundaries. Pisces naturally dissolves boundaries, and Saturn is all about structure and limits. So you're learning to hold sacred space while remaining compassionate. You're building spiritual discipline.

House placements matter tremendously. If you have Saturn in the 10th house natally, Saturn transiting aspects will activate your public reputation and career timing. If it's in the 4th, family patterns and home become the focus.

Trust the slowness of this transit. Saturn rewards patience and dedicated effort. What feels restrictive now becomes your greatest strength in three years.`;

    const cleaned = mockTranscript
      .replace(/\s+/g, " ")
      .trim();

    const hostname = url.startsWith("http") ? new URL(url).hostname : "example.com";

    return {
      raw_content: mockTranscript,
      cleaned_content: cleaned,
      title: `Mock transcript: ${type} — ${hostname}`,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Factory function — select fetcher based on import type
// ────────────────────────────────────────────────────────────────────────────

export function getTranscriptFetcher(type: ImportType): TranscriptFetcher {
  // Use real YouTube fetcher for YouTube imports, mock for others
  if (type === "youtube_transcript") {
    return new YouTubeTranscriptFetcher();
  }

  return new MockTranscriptFetcher();
}
