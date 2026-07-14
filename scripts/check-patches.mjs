import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { histoirePatchGroups } from '../compatibility.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const upstreamRegistry = 'https://registry.npmjs.org/'

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    ...options,
  })
}

async function findTarball(directory) {
  const entries = await readdir(directory)
  const tarballs = entries.filter(entry => entry.endsWith('.tgz'))

  if (tarballs.length !== 1) {
    throw new Error(`Expected one tarball in ${directory}, found ${tarballs.length}`)
  }

  return path.join(directory, tarballs[0])
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'histoire-patch-check-'))

  try {
    for (const group of histoirePatchGroups) {
      const patchPath = path.join(repositoryRoot, group.patchFile)

      for (const version of group.versions) {
        const targetDirectory = path.join(temporaryRoot, version)
        const packDirectory = path.join(targetDirectory, 'pack')
        const extractDirectory = path.join(targetDirectory, 'extract')

        await mkdir(packDirectory, { recursive: true })
        await mkdir(extractDirectory, { recursive: true })
        run('npm', [
          'pack',
          `${group.packageName}@${version}`,
          '--pack-destination',
          packDirectory,
          '--registry',
          upstreamRegistry,
          '--silent',
        ])

        const tarballPath = await findTarball(packDirectory)
        run('tar', ['-xzf', tarballPath, '-C', extractDirectory])
        run('git', ['apply', '--check', patchPath], {
          cwd: path.join(extractDirectory, 'package'),
        })
        process.stdout.write(`Patch applies to ${group.packageName}@${version}\n`)
      }
    }
  }
  finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
}

await main()
