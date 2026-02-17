declare module "tiged" {
  interface TigedOptions {
    disableCache?: boolean
    force?: boolean
    verbose?: boolean
  }

  interface TigedInfo {
    message: string
  }

  interface TigedEmitter {
    clone(dest: string): Promise<void>
    on(event: "info" | "warn", callback: (info: TigedInfo) => void): this
  }

  function tiged(repo: string, options?: TigedOptions): TigedEmitter

  export = tiged
}
