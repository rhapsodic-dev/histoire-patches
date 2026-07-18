import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPackageSelector, histoirePatchGroups } from '../compatibility.mjs'
import { hooks } from '../pnpmfile.mjs'

test('creates an explicit selector for every supported version', () => {
  const selectors = histoirePatchGroups.map(createPackageSelector)

  assert.deepEqual(selectors, [
    '@histoire/app@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1',
    '@histoire/plugin-vue@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1',
    '@histoire/plugin-nuxt@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1',
  ])
})

test('registers all shared patches without replacing other patches', () => {
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
      'node_modules/.pnpm-config/@rhapsodic/pnpm-plugin-histoire-patches/patches/histoire-app.patch',
    '@histoire/plugin-vue@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1':
      'node_modules/.pnpm-config/@rhapsodic/pnpm-plugin-histoire-patches/patches/histoire-plugin-vue.patch',
    '@histoire/plugin-nuxt@1.0.0-alpha.3 || 1.0.0-alpha.4 || 1.0.0-alpha.5 || 1.0.0-beta.1':
      'node_modules/.pnpm-config/@rhapsodic/pnpm-plugin-histoire-patches/patches/histoire-plugin-nuxt.patch',
  })
})

test('accepts supported Histoire package versions', () => {
  for (const name of ['@histoire/app', '@histoire/plugin-vue', '@histoire/plugin-nuxt']) {
    const packageManifest = {
      name,
      version: '1.0.0-beta.1',
    }

    assert.equal(hooks.readPackage(packageManifest), packageManifest)
  }
})

test('rejects unsupported Histoire package versions', () => {
  for (const name of ['@histoire/app', '@histoire/plugin-vue', '@histoire/plugin-nuxt']) {
    assert.throws(
      () => hooks.readPackage({ name, version: '1.0.0-beta.2' }),
      new RegExp(`No Rhapsodic Histoire patch supports ${name.replace('/', '\\/')}@1\\.0\\.0-beta\\.2`),
    )
  }
})

test('rejects conflicting patches for any selector', () => {
  for (const group of histoirePatchGroups) {
    const selector = createPackageSelector(group)
    const config = {
      patchedDependencies: {
        [selector]: 'patches/another.patch',
      },
    }

    assert.throws(
      () => hooks.updateConfig(config),
      new RegExp(`Conflicting patch configured for ${selector.replaceAll('.', '\\.')}`),
    )
  }
})
