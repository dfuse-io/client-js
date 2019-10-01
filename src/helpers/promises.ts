export class Deferred<T> {
  private activePromise: Promise<T>
  private resolver!: (value?: T | PromiseLike<T>) => void
  private rejecter!: (reason?: any) => void

  constructor() {
    this.activePromise = new Promise((resolve, reject) => {
      this.resolver = resolve
      this.rejecter = reject
    })
  }

  public promise(): Promise<T> {
    return this.activePromise
  }

  public resolve(value?: T | PromiseLike<T>) {
    this.resolver(value)
  }

  public reject(reason?: any) {
    this.rejecter(reason)
  }
}
