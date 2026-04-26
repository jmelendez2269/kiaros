import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const nextDir = resolve('.next')

if (existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    console.log(`Removed ${nextDir}`)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String(error.code)
      if (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY') {
        console.error(`Could not remove ${nextDir}. A Next.js server is probably still using it.`)
        console.error('Stop the running dev/start process, then run `npm run clean:next` again.')
        process.exit(1)
      }
    }

    throw error
  }
} else {
  console.log(`No .next directory found at ${nextDir}`)
}
