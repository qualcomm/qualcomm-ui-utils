/* eslint-disable */
// @ts-nocheck
import {Component} from "@angular/core"

@Component({
  selector: "app-tabs-demo",
  template: `
    <span class="text-neutral-primary font-heading-xs">Primary</span>
    <span class="text-neutral-primary font-heading-xs">Secondary</span>
  `,
})
export class TabsDemoComponent {}

@Component({
  selector: "app-stepper-demo",
  template: `
    <div class="border-neutral-02 bg-neutral-01 grid gap-8 rounded border p-10">
      <div class="text-neutral-primary font-heading-xxs">Layout</div>
      <div class="text-neutral-primary font-heading-xxs">Orientation</div>
      <div class="text-neutral-primary font-heading-xxs">Variant</div>
    </div>
  `,
})
export class StepperDemoComponent {}

@Component({
  selector: "app-checkbox-demo",
  template: `
    <h6 class="text-neutral-primary font-heading-xs">Checked</h6>
    <h6 class="text-neutral-primary font-heading-xs">Unchecked</h6>
    <h6 class="text-neutral-primary font-heading-xs">Indeterminate</h6>
    <span class="text-neutral-primary font-heading-xs">Default</span>
    <span class="text-neutral-primary font-heading-xs">Disabled</span>
  `,
})
export class CheckboxDemoComponent {}

@Component({
  selector: "app-notification-demo",
  template: `
    <span class="text-neutral-primary font-heading-xs">
      ProtonMail_v2.3 Job Failed
    </span>
  `,
})
export class NotificationDemoComponent {}

@Component({
  selector: "app-tabs-content",
  template: `
    <span class="text-neutral-primary font-body-sm">Panel 1</span>
    <span class="text-neutral-primary font-body-sm">Panel 2</span>
  `,
})
export class TabsContentComponent {}

@Component({
  selector: "app-header",
  template: `
    <a class="text-link-default-idle font-body-xs" href="#">Download</a>
    <div class="app-env-timestamp text-neutral-primary font-body-xs">
      Last updated: 2024-01-01
    </div>
    <span class="text-neutral-primary font-heading-xxs">Version</span>
  `,
})
export class HeaderComponent {}

@Component({
  selector: "app-divider-demo",
  template: `
    <span class="text-neutral-primary font-body-md">Lorem ipsum dolor sit amet</span>
  `,
})
export class DividerDemoComponent {}

@Component({
  selector: "app-error-demo",
  template: `
    <div class="text-support-danger font-body-xs">This field is required</div>
  `,
})
export class ErrorDemoComponent {}

@Component({
  selector: "app-page-links",
  template: `
    <div class="qui-page-links--label text-link-default-idle">Previous</div>
    <div class="qui-page-links--label text-link-default-idle q-next">Next</div>
  `,
})
export class PageLinksComponent {}

@Component({
  host: {
    class:
      "border-neutral-02 bg-neutral-02 flex flex-col items-center gap-8 rounded border p-10",
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
    <code class="font-code-md bg-neutral-00 rounded px-2">const x = 1</code>
    <code class="font-code-sm-bold">bold code</code>
  `,
})
export class CodeBlockComponent {}
