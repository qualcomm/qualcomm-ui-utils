// @ts-nocheck
import {clsx} from "clsx"

export function FeatureCard() {
  return (
    <div className="relative col-span-1 hidden min-h-[300px] items-center gap-5 overflow-hidden bg-neutral-01 px-6 py-6">
      <h1 className="inline-flex flex-col gap-1 font-heading-xxxl">
        <span>Make beautiful documentation</span>
      </h1>
      <div className="flex flex-col gap-1 font-body-xl">
        <span>Simple, powerful, and flexible documentation tools</span>
      </div>
      <div className="max-w-[350px] text-center font-heading-sm">
        With MDX, you can use React Components in Markdown.
      </div>
      <h2 className="inline-flex flex-col gap-1 font-heading-lg">
        <span>Full-text search</span>
      </h2>
      <div className="z-20 font-body-md">
        Our Vite plugin indexes your markdown content automatically
      </div>
    </div>
  )
}

export function ContrastDemo() {
  return (
    <div
      className={clsx(
        "bg-neutral-07",
        "grid grid-cols-3 grid-rows-2",
        "justify-items-center gap-x-8 gap-y-1 rounded p-4",
      )}
    >
      <span className="text-neutral-primary font-heading-xs">Primary Text</span>
      <span className="text-neutral-secondary font-body-sm">Secondary Text</span>
      <span className="text-support-danger font-body-xs">Error Text</span>
    </div>
  )
}

export function BorderDemo() {
  return (
    <div className="flex w-full rounded-sm border border-neutral-02 bg-neutral-01 px-3 py-2">
      <span className="text-neutral-primary">This section features the dark theme</span>
    </div>
  )
}

export function LinkDemo() {
  return (
    <a className="text-link-default-idle font-body-xs" href="https://example.com">
      Download Link
    </a>
  )
}

export function ImageCard() {
  return (
    <img
      alt="Docs"
      className="shadow-medium rounded-xl border border-neutral-00"
      src="/docs.png"
      width="100%"
    />
  )
}

export function TabsDemo() {
  return (
    <div className="border-neutral-01 flex w-full rounded border p-4">
      <div className="tabs-content">Tabs content here</div>
    </div>
  )
}

export function PlaygroundDemo() {
  return (
    <div className="border-neutral-02 bg-neutral-02 flex flex-col items-center gap-8 rounded p-10">
      <div className="border-neutral-02 w-full border-t pt-8">
        Preview content
      </div>
    </div>
  )
}

export function SkeletonDemo() {
  return <h2 className="text-neutral-primary font-heading-xl">Heading XL</h2>
}

export function CodeDemo() {
  return (
    <code className="font-code-md bg-neutral-00 rounded px-2 py-1">
      const example = true
    </code>
  )
}

export function StrongTextDemo() {
  return (
    <p className="font-body-md-bold text-neutral-primary">
      This is strong body text
    </p>
  )
}

export function RoundedDemo() {
  return <div className="rounded-xxl bg-neutral-02 p-4">Rounded container</div>
}

export function FontStretchDemo() {
  return <span className="font-heading-md">Wide text</span>
}
