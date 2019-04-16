import { ApiTokenInfo } from "../types/auth-token"
import { DfuseClientError } from "../types/error"

/**
 * A simple API token store interface supporting async operations. This
 * interface is used to store the API token when it has been refreshed
 * as well as retrieving a token from the store.
 *
 * By providing your own [[ApiTokenStore]] implementation, you can for
 * example easily store the token in the `localStorage` of the Browser
 * if your targeting this environment by rolling your own version:
 *
 * ```typescript
 * class LocalStorageApiTokenStore implements ApiTokenStore {
 *   async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
 *     localStorage.set('dfuse-token', JSON.stringify(apiTokenInfo))
 *   }
 *
 *   async get(apiTokenInfo: ApiTokenInfo): Promise<ApiTokenInfo | undefined> {
 *     const tokenData = localStorage.get('dfuse-token')
 *     if (tokenData === null) {
 *       return undefined
 *     }
 *
 *     return JSON.parse(tokenData)
 *   }
 * }
 * ```
 *
 * @kind Interfaces
 */
export interface ApiTokenStore {
  set: (apiTokenInfo: ApiTokenInfo) => Promise<void>
  get: () => Promise<ApiTokenInfo | undefined>
}

/**
 * Represents an in-memory token storage concrete implementation of
 * a [[ApiTokenStore]]. This simply keep the token in variable and serves
 * it from there.
 *
 * It is **never** persisted and will be reset upon restart of the Browser tab
 * or process, leading to a new token being issued.
 *
 * You should try hard to use a persistent solution so that you re-use the
 * same token as long as it's valid.
 */
export class InMemoryApiTokenStore {
  private apiTokenInfo?: ApiTokenInfo

  public async get(): Promise<ApiTokenInfo | undefined> {
    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo
  }
}

/**
 * Represents an local storage token store concrete implementation of
 * a [[ApiTokenStore]]. This will save the
 *
 * It is persisted in the local storage of the Browser will be picked uo
 * upon restart of the Browser tab.
 */
export class LocalStorageApiTokenStore {
  private key: string
  private apiTokenInfo?: ApiTokenInfo

  constructor(key: string) {
    this.key = key

    if (typeof localStorage !== "object") {
      const messages = [
        "This environment does not contain a valid `localStorage` object in the global scope to use.",
        "",
        "You are most likely in a Node.js environment where a global `localStorage` is not available by default.",
        "This API token store concrete impelementation is not usable in your environment. You should be",
        "providing a different implementation of ApiTokenInfo.",
        "",
        "If this error occurred when you did not provide yourself the instance, it means our auto-detection",
        "mechanism incorrectly thought it could use `LocalStorageApiTokenStore` instance while it should",
        "have not. Please report a bug about this issue so we can fix it.",
        "",
        "If you provided the instance yourself, you should read our documentation to better",
        "understand what you should provide here.",
        "",
        "See https://github.com/dfuse-io/client-js"
      ]

      throw new DfuseClientError(messages.join("\n"))
    }
  }

  public async get(): Promise<ApiTokenInfo | undefined> {
    if (this.apiTokenInfo !== undefined) {
      return this.apiTokenInfo
    }

    const raw = localStorage.getItem(this.key)
    if (raw == null) {
      return undefined
    }

    this.apiTokenInfo = JSON.parse(raw)

    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo
    localStorage.setItem(this.key, JSON.stringify(apiTokenInfo))
  }
}

/**
 * Represents an local storage token store concrete implementation of
 * a [[ApiTokenStore]]. This will save the token in the given file.
 * The directory structure is created when it does not exists.
 *
 * **Note** This should not be used in a Browser environment as it
 *          makes really no sense in this context.
 */
export class FileApiTokenStore {
  private filePath: string
  private apiTokenInfo?: ApiTokenInfo

  private fs: any
  private path: any

  constructor(filePath: string) {
    this.filePath = filePath

    // Let's have the require(s) resolved only when actually used
    // so they don't clutter the runtime environment when not used.
    this.fs = require("fs")
    this.path = require("path")
  }

  public async get(): Promise<ApiTokenInfo | undefined> {
    if (this.apiTokenInfo !== undefined) {
      return this.apiTokenInfo
    }

    const data = await readData(this.fs, this.filePath)
    if (data === undefined) {
      return undefined
    }

    this.apiTokenInfo = JSON.parse(data)

    return this.apiTokenInfo
  }

  public async set(apiTokenInfo: ApiTokenInfo): Promise<void> {
    this.apiTokenInfo = apiTokenInfo

    await writeData(this.fs, this.path, this.filePath, JSON.stringify(apiTokenInfo))
  }
}

async function readData(fs: any, filePath: string): Promise<string | undefined> {
  return new Promise<string | undefined>((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      resolve(undefined)
      return
    }

    fs.readFile(filePath, (error: any, data: string) => {
      error ? reject(error) : resolve(data)
    })
  })
}

async function writeData(fs: any, path: any, filePath: string, data: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      mkdirpSync(fs, path, path.dirname(filePath))
    } catch (error) {
      reject(error)
      return
    }

    fs.writeFile(filePath, data, (error: any) => {
      error ? reject(error) : resolve()
    })
  })
}

async function mkdirpSync(fs: any, path: any, directory: string) {
  if (!path.isAbsolute(directory)) {
    return
  }

  const parent = path.join(directory, "..")
  if (parent !== path.join("/") && !fs.existsSync(parent)) {
    mkdirpSync(fs, path, parent)
  }

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory)
  }
}
