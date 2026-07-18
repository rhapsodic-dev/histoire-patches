import {
  createPackageSelector,
  histoirePatchGroups,
  supportedHistoirePackageVersions,
} from './compatibility.mjs'

const configPackageName = '@rhapsodic/pnpm-plugin-histoire-patches'

export const hooks = {
  readPackage(packageManifest) {
    const supportedVersions = supportedHistoirePackageVersions.get(packageManifest.name)

    if (supportedVersions && !supportedVersions.has(packageManifest.version)) {
      throw new Error(
        `No Rhapsodic Histoire patch supports ${packageManifest.name}@${packageManifest.version}. Supported versions: ${[...supportedVersions].join(', ')}`,
      )
    }

    return packageManifest
  },

  updateConfig(config) {
    config.patchedDependencies ??= {}

    for (const group of histoirePatchGroups) {
      const selector = createPackageSelector(group)
      const patchPath = `node_modules/.pnpm-config/${configPackageName}/${group.patchFile}`
      const configuredPatch = config.patchedDependencies[selector]

      if (configuredPatch && configuredPatch !== patchPath) {
        throw new Error(`Conflicting patch configured for ${selector}`)
      }

      config.patchedDependencies[selector] = patchPath
    }

    return config
  },
}
