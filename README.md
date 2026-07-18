# Histoire patches

Shared, reproducible pnpm patches for Histoire packages used by Rhapsodic projects.

The package is a [pnpm config dependency](https://pnpm.io/config-dependencies). pnpm installs it
before regular dependencies and automatically loads `pnpmfile.mjs`, which registers patches for
every explicitly supported `@histoire/app` and `@histoire/plugin-vue` version.

The patches:

- select the first variant when a story opens;
- keep iframe previews invisible until their documents load and their variants report preview
  readiness;
- report Vue story readiness only after the story's Suspense boundary resolves.

## Consumer setup

Keep Histoire itself on its normal upstream package versions. The patch package is public on npmjs,
so no package-specific registry configuration is required.

Then let pnpm add the config dependency and its required integrity checksum:

```sh
pnpm add --config @rhapsodic/pnpm-plugin-histoire-patches
```

Do not write the `configDependencies` entry manually. pnpm writes the version to
`pnpm-workspace.yaml` and records the package integrity in the config section of `pnpm-lock.yaml`.

After that, ordinary `pnpm install` and `pnpm update` commands apply the patch automatically. The
resolved config-package version and integrity are recorded in `pnpm-lock.yaml`.

Do not add another `patchedDependencies` entry for `@histoire/app` or
`@histoire/plugin-vue` in the consuming repository.

## Supported Histoire versions

The patch is verified against this artifact-compatible version family:

- `1.0.0-alpha.3`
- `1.0.0-alpha.4`
- `1.0.0-alpha.5`
- `1.0.0-beta.1`

The list is intentionally explicit. An untested future Histoire version is not patched silently.

## Adding an upstream version

1. Add the version to the appropriate compatibility group in `compatibility.mjs`.
2. Run the compatibility and unit tests:

   ```sh
   pnpm check:patches
   pnpm test
   ```

3. Run `pnpm release`. Bumpp updates the package version, creates a conventional release commit and
   a lightweight `v<version>` tag, then pushes both.
4. The tag starts the release workflow, which generates the GitHub release and publishes that exact
   package version to npmjs using GitHub Actions trusted publishing (OIDC).

The npm package's trusted publisher must be configured with these values:

- provider: GitHub Actions;
- organization: `rhapsodic-dev`;
- repository: `histoire-patches`;
- workflow filename: `release.yml`;
- environment: leave empty unless the workflow is updated to use one.

No npm token is stored in GitHub. The workflow receives a short-lived publishing credential from
npm through GitHub's OIDC identity. If the package version already exists, the workflow exits
successfully because npm package versions are immutable.

If an existing patch no longer applies, publish a new major config-package version for the new
artifact family. The plugin rejects unsupported versions of either patched package so an upstream
upgrade cannot silently lose a fix.
