import {
  createPackageSelector,
  histoirePatchGroups,
  supportedHistoireAppVersions,
} from './compatibility.mjs'

const configPackageName = '@rhapsodic/pnpm-plugin-histoire-patches'

export const hooks = {
  readPackage(packageManifest) {
    if (
      packageManifest.name === '@histoire/app'
      && !supportedHistoireAppVersions.has(packageManifest.version)
    ) {
      const supportedVersions = [...supportedHistoireAppVersions].join(', ')
      throw new Error(
        `No Rhapsodic Histoire patch supports @histoire/app@${packageManifest.version}. Supported versions: ${supportedVersions}`,
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
