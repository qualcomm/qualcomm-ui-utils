// @ts-nocheck
import {clsx} from "clsx"

export function FeatureCard() {
  return (
    <div className="relative col-span-1 hidden min-h-[300px] items-center gap-5 overflow-hidden bg-2 px-6 py-6">
      <h1 className="inline-flex flex-col gap-1 q-font-heading-xxxl">
        <span>Make beautiful documentation</span>
      </h1>
      <div className="flex flex-col gap-1 q-font-body-xl">
        <span>Simple, powerful, and flexible documentation tools</span>
      </div>
      <div className="max-w-[350px] text-center q-font-heading-sm-subtle">
        With MDX, you can use React Components in Markdown.
      </div>
      <h2 className="inline-flex flex-col gap-1 q-font-heading-lg">
        <span>Full-text search</span>
      </h2>
      <div className="z-20 q-font-body-md">
        Our Vite plugin indexes your markdown content automatically
      </div>
    </div>
  )
}

export function ContrastDemo() {
  return (
    <div
      className={clsx(
        "bg-contrast-4",
        "grid grid-cols-3 grid-rows-2",
        "justify-items-center gap-x-8 gap-y-1 rounded p-4",
      )}
    >
      <span className="text-primary q-font-heading-xs">Primary Text</span>
      <span className="text-secondary q-font-body-sm">Secondary Text</span>
      <span className="text-error q-font-metadata-sm">Error Text</span>
    </div>
  )
}

export function BorderDemo() {
  return (
    <div className="flex w-full rounded-sm border border-strong bg-2 px-3 py-2">
      <span className="text-primary">This section features the dark theme</span>
    </div>
  )
}

export function LinkDemo() {
  return (
    <a className="q-text-link q-font-metadata-sm" href="https://example.com">
      Download Link
    </a>
  )
}

export function ImageCard() {
  return (
    <img
      alt="Docs"
      className="q-elevation-3 rounded-xl border border-subtle"
      src="/docs.png"
      width="100%"
    />
  )
}

export function TabsDemo() {
  return (
    <div className="q-border-default flex w-full rounded border p-4">
      <div className="tabs-content">Tabs content here</div>
    </div>
  )
}

export function PlaygroundDemo() {
  return (
    <div className="q-border-strong q-background-2 flex flex-col items-center gap-8 rounded p-10">
      <div className="q-border-strong w-full border-t pt-8">
        Preview content
      </div>
    </div>
  )
}

export function SkeletonDemo() {
  return <h2 className="text-primary q-font-heading-xl">Heading XL</h2>
}

export function CodeDemo() {
  return (
    <code className="q-font-code-md bg-1 rounded px-2 py-1">
      const example = true
    </code>
  )
}

export function StrongTextDemo() {
  return (
    <p className="q-font-body-md-strong text-primary">
      This is strong body text
    </p>
  )
}

export function RoundedDemo() {
  return <div className="rounded-2xl bg-3 p-4">Rounded container</div>
}

export function FontStretchDemo() {
  return <span className="font-stretch-wide q-font-heading-md">Wide text</span>
}
