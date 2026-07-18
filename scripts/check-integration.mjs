import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageManifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)))
const packageRoot = fileURLToPath(new URL('..', import.meta.url))

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      ...options,
    })
    let output = ''

    if (options.capture) {
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk) => {
        output += chunk
      })
    }

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      }
      else {
        reject(new Error(`${command} exited with code ${code}`))
      }
    })
  })
}

async function startPackageServer(packResult, packageTarball) {
  const tarball = await readFile(packageTarball)
  const packagePath = `/${packageManifest.name}`
  const tarballPath = `${packagePath}/-/${packResult.filename}`
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)

    if (requestPath === tarballPath) {
      response.writeHead(200, { 'content-type': 'application/octet-stream' })
      response.end(tarball)
      return
    }

    if (requestPath === packagePath) {
      const address = server.address()
      const registryUrl = `http://127.0.0.1:${address.port}`
      const versionManifest = {
        ...packageManifest,
        dist: {
          integrity: packResult.integrity,
          shasum: packResult.shasum,
          tarball: `${registryUrl}${tarballPath}`,
        },
      }
      const metadata = {
        name: packageManifest.name,
        'dist-tags': {
          latest: packageManifest.version,
        },
        versions: {
          [packageManifest.version]: versionManifest,
        },
      }

      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify(metadata))
      return
    }

    response.writeHead(404)
    response.end()
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  return server
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'histoire-patch-integration-'))
  let packageServer

  try {
    const fixtureDirectory = path.join(temporaryRoot, 'fixture')
    const packOutput = await run('npm', [
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      temporaryRoot,
    ], {
      capture: true,
      cwd: packageRoot,
    })
    const [packResult] = JSON.parse(packOutput)
    const packageTarball = path.join(temporaryRoot, packResult.filename)

    packageServer = await startPackageServer(packResult, packageTarball)
    const packageServerAddress = packageServer.address()
    const packageRegistry = `http://127.0.0.1:${packageServerAddress.port}/`

    await mkdir(fixtureDirectory)

    await writeFile(path.join(fixtureDirectory, 'package.json'), `${JSON.stringify({
      name: 'histoire-patch-integration',
      private: true,
      packageManager: 'pnpm@11.7.0',
      devDependencies: {
        '@histoire/app': '1.0.0-beta.1',
        '@histoire/plugin-nuxt': '1.0.0-beta.1',
        '@histoire/plugin-vue': '1.0.0-beta.1',
      },
    }, undefined, 2)}\n`)
    await writeFile(path.join(fixtureDirectory, 'pnpm-workspace.yaml'), [
      'allowBuilds:',
      "  '@parcel/watcher': true",
      '  esbuild: true',
      '',
    ].join('\n'))
    await writeFile(
      path.join(fixtureDirectory, '.npmrc'),
      `@rhapsodic:registry=${packageRegistry}\n`,
    )

    await run('corepack', ['pnpm', 'add', '--config', `${packageManifest.name}@${packageManifest.version}`], {
      cwd: fixtureDirectory,
    })
    await run('corepack', ['pnpm', 'install'], { cwd: fixtureDirectory })

    const storyViewPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/app/src/app/components/story/StoryView.vue',
    )
    const bundledStoryViewPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/app/dist/bundled/components/story/StoryView.vue2.js',
    )
    const previewPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/app/src/app/components/story/StoryVariantSinglePreviewRemote.vue',
    )
    const bundledPreviewPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/app/dist/bundled/components/story/StoryVariantSinglePreviewRemote.vue2.js',
    )
    const renderStoryPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/plugin-vue/src/client/app/RenderStory.ts',
    )
    const bundledRenderStoryPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/plugin-vue/dist/bundled/client/app/RenderStory.js',
    )
    const nuxtPluginPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/plugin-nuxt/src/index.ts',
    )
    const bundledNuxtPluginPath = path.join(
      fixtureDirectory,
      'node_modules/@histoire/plugin-nuxt/dist/index.js',
    )
    const storyView = await readFile(storyViewPath, 'utf8')
    const bundledStoryView = await readFile(bundledStoryViewPath, 'utf8')
    const preview = await readFile(previewPath, 'utf8')
    const bundledPreview = await readFile(bundledPreviewPath, 'utf8')
    const renderStory = await readFile(renderStoryPath, 'utf8')
    const bundledRenderStory = await readFile(bundledRenderStoryPath, 'utf8')
    const nuxtPlugin = await readFile(nuxtPluginPath, 'utf8')
    const bundledNuxtPlugin = await readFile(bundledNuxtPluginPath, 'utf8')

    if (!storyView.includes('storyStore.currentStory?.variants.length)')) {
      throw new Error('The installed @histoire/app package was not patched')
    }

    if (storyView.includes('storyStore.currentStory?.lastSelectedVariant')) {
      throw new Error('The installed @histoire/app package still contains the replaced selection logic')
    }

    if (storyView.includes('v-if="!route.params.storyId"')) {
      throw new Error('The installed @histoire/app package still suppresses the empty-state icon')
    }

    if (bundledStoryView.includes('!unref(route).params.storyId')) {
      throw new Error('The installed @histoire/app bundle still suppresses the empty-state icon')
    }

    if (!preview.includes("'htw-invisible': !isIframeLoaded || !variant.previewReady")) {
      throw new Error('The installed @histoire/app package exposes the iframe before its preview is ready')
    }

    if (!bundledPreview.includes('!isIframeLoaded.value || !__props.variant.previewReady')) {
      throw new Error('The installed @histoire/app bundle exposes the iframe before its preview is ready')
    }

    if (!renderStory.includes("h(Suspense, { onResolve: () => emit('ready') }")) {
      throw new Error('The installed @histoire/plugin-vue package does not wait for Suspense before reporting readiness')
    }

    if (!bundledRenderStory.includes('d(k, { onResolve: () => w("ready") }')) {
      throw new Error('The installed @histoire/plugin-vue bundle does not wait for Suspense before reporting readiness')
    }

    if (/app\.mount\(target\)\s+emit\('ready'\)/.test(renderStory)) {
      throw new Error('The installed @histoire/plugin-vue package still reports readiness immediately after mount')
    }

    if (/o\.mount\(e\),\s*w\("ready"\)/.test(bundledRenderStory)) {
      throw new Error('The installed @histoire/plugin-vue bundle still reports readiness immediately after mount')
    }

    const nuxtCssCondition = '!payload.story.layout?.iframe || window.self !== window.top'

    if (!nuxtPlugin.includes(nuxtCssCondition)) {
      throw new Error('The installed @histoire/plugin-nuxt package still loads Nuxt CSS in the hidden parent mount')
    }

    if (!bundledNuxtPlugin.includes(nuxtCssCondition)) {
      throw new Error('The installed @histoire/plugin-nuxt bundle still loads Nuxt CSS in the hidden parent mount')
    }

    if (nuxtPlugin.includes("nuxt.options.css.map(file => `import '${file}'`)")) {
      throw new Error('The installed @histoire/plugin-nuxt package still emits unconditional CSS imports')
    }

    if (bundledNuxtPlugin.includes("nuxt.options.css.map(file => `import '${file}'`)")) {
      throw new Error('The installed @histoire/plugin-nuxt bundle still emits unconditional CSS imports')
    }

    if (!nuxtPlugin.includes("await import('${file}')")) {
      throw new Error('The installed @histoire/plugin-nuxt package does not emit conditional CSS imports')
    }

    if (!bundledNuxtPlugin.includes("await import('${file}')")) {
      throw new Error('The installed @histoire/plugin-nuxt bundle does not emit conditional CSS imports')
    }

    await run('node', ['--check', bundledStoryViewPath])
    await run('node', ['--check', bundledPreviewPath])
    await run('node', ['--check', bundledRenderStoryPath])
    await run('node', ['--check', bundledNuxtPluginPath])

    process.stdout.write('pnpm automatically loaded and applied the Histoire patches\n')
  }
  finally {
    if (packageServer) {
      await new Promise(resolve => packageServer.close(resolve))
    }

    if (process.env.KEEP_INTEGRATION_FIXTURE === 'true') {
      process.stdout.write(`Kept integration fixture at ${temporaryRoot}\n`)
    }
    else {
      await rm(temporaryRoot, { force: true, recursive: true })
    }
  }
}

await main()
