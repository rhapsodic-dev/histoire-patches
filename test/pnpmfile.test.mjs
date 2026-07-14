import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPackageSelector, histoirePatchGroups } from '../compatibility.mjs'
import { hooks } from '../pnpmfile.mjs'

test('creates an explicit selector for every supported version', () => {
  const selectors = histoirePatchGroups.map(createPackageSelector)

  assert.deepEqual(selectors, [
    '@histoire/app@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1',
  ])
})

test('registers the shared patch without replacing other patches', () => {
  const config = {
    patchedDependencies: {
      'example@1.0.0': 'patches/example.patch',
    },
  }

  const result = hooks.updateConfig(config)

  assert.equal(result, config)
  assert.equal(result.patchedDependencies['example@1.0.0'], 'patches/example.patch')
  assert.deepEqual(result.patchedDependencies, {
    'example@1.0.0': 'patches/example.patch',
    '@histoire/app@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1':
      'node_modules/.pnpm-config/@rhapsodic/pnpm-plugin-histoire-patches/patches/auto-select-first-variant.patch',
  })
})

test('accepts supported Histoire app versions', () => {
  const packageManifest = {
    name: '@histoire/app',
    version: '1.0.0-beta.1',
  }

  assert.equal(hooks.readPackage(packageManifest), packageManifest)
})

test('rejects unsupported Histoire app versions', () => {
  assert.throws(
    () => hooks.readPackage({ name: '@histoire/app', version: '1.0.0-beta.2' }),
    /No Rhapsodic Histoire patch supports @histoire\/app@1\.0\.0-beta\.2/,
  )
})

test('rejects a conflicting patch for the same selector', () => {
  const selector = createPackageSelector(histoirePatchGroups[0])
  const config = {
    patchedDependencies: {
      [selector]: 'patches/another.patch',
    },
  }

  assert.throws(
    () => hooks.updateConfig(config),
    new RegExp(`Conflicting patch configured for ${selector.replaceAll('.', '\\.')}`),
  )
})
