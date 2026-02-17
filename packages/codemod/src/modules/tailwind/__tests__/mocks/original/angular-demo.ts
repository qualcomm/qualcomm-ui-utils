/* eslint-disable */
// @ts-nocheck
import {Component} from "@angular/core"

@Component({
  selector: "app-tabs-demo",
  template: `
    <span class="text-primary q-font-heading-xs">Primary</span>
    <span class="text-primary q-font-heading-xs">Secondary</span>
  `,
})
export class TabsDemoComponent {}

@Component({
  selector: "app-stepper-demo",
  template: `
    <div class="border-strong bg-2 grid gap-8 rounded border p-10">
      <div class="text-primary q-font-heading-xxs">Layout</div>
      <div class="text-primary q-font-heading-xxs">Orientation</div>
      <div class="text-primary q-font-heading-xxs">Variant</div>
    </div>
  `,
})
export class StepperDemoComponent {}

@Component({
  selector: "app-checkbox-demo",
  template: `
    <h6 class="text-primary q-font-heading-xs">Checked</h6>
    <h6 class="text-primary q-font-heading-xs">Unchecked</h6>
    <h6 class="text-primary q-font-heading-xs">Indeterminate</h6>
    <span class="text-primary q-font-heading-xs">Default</span>
    <span class="text-primary q-font-heading-xs">Disabled</span>
  `,
})
export class CheckboxDemoComponent {}

@Component({
  selector: "app-notification-demo",
  template: `
    <span class="text-primary q-font-heading-xs">
      ProtonMail_v2.3 Job Failed
    </span>
  `,
})
export class NotificationDemoComponent {}

@Component({
  selector: "app-tabs-content",
  template: `
    <span class="text-primary q-font-body-sm">Panel 1</span>
    <span class="text-primary q-font-body-sm">Panel 2</span>
  `,
})
export class TabsContentComponent {}

@Component({
  selector: "app-header",
  template: `
    <a class="q-text-link q-font-metadata-sm" href="#">Download</a>
    <div class="app-env-timestamp text-primary q-font-metadata-sm">
      Last updated: 2024-01-01
    </div>
    <span class="text-primary q-font-heading-xxs">Version</span>
  `,
})
export class HeaderComponent {}

@Component({
  selector: "app-divider-demo",
  template: `
    <span class="text-primary q-font-body-md">Lorem ipsum dolor sit amet</span>
  `,
})
export class DividerDemoComponent {}

@Component({
  selector: "app-error-demo",
  template: `
    <div class="q-text-error q-font-metadata-sm">This field is required</div>
  `,
})
export class ErrorDemoComponent {}

@Component({
  selector: "app-page-links",
  template: `
    <div class="qui-page-links--label q-text-link">Previous</div>
    <div class="qui-page-links--label q-text-link q-next">Next</div>
  `,
})
export class PageLinksComponent {}

@Component({
  host: {
    class:
      "q-border-strong q-background-2 flex flex-col items-center gap-8 rounded border p-10",
  },
  selector: "app-playground",
  template: `
    <ng-content></ng-content>
  `,
})
export class PlaygroundComponent {}

@Component({
  selector: "app-code-block",
  template: `
    <code class="q-font-code-md bg-1 rounded px-2">const x = 1</code>
    <code class="q-font-code-sm-strong">bold code</code>
  `,
})
export class CodeBlockComponent {}
