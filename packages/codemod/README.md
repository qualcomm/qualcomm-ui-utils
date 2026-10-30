# @qualcomm-ui/codemod

Codemod utilities for automatic QUI package migrations

## How to

Run a migration from your project root (the directory containing `package.json`):

```shell
npx @qualcomm-ui/codemod migrate qui-docs
```

The CLI detects the major version of each package in the migration and runs every codemod for those versions, including on projects that are already upgraded. It then updates `package.json` to the new versions.

| Option            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `-d, --dir <dir>` | Project root containing `package.json` (default: `.`) |
| `--dry-run`       | Preview changes without writing files                 |

Run the following command to see the available migrations and options:

```shell
npx @qualcomm-ui/codemod migrate --help
```

## Migrations

### qui-docs

Packages: `@qualcomm-ui/mdx-vite`, `@qualcomm-ui/react-mdx`, `@qualcomm-ui/react-router-utils`

| Codemod           | Versions                                  | Description                                                                                         |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `not-found-route` | `@qualcomm-ui/react-router-utils` v2 → v3 | Adds the `NotFound` component to the fallback route (`$.tsx`) that uses `createFallbackRouteLoader` |
