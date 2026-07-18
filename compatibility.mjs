export const histoirePatchGroups = [
  {
    packageName: '@histoire/app',
    patchFile: 'patches/histoire-app.patch',
    versions: [
      '1.0.0-alpha.3',
      '1.0.0-alpha.4',
      '1.0.0-alpha.5',
      '1.0.0-beta.1',
    ],
  },
  {
    packageName: '@histoire/plugin-vue',
    patchFile: 'patches/histoire-plugin-vue.patch',
    versions: [
      '1.0.0-alpha.3',
      '1.0.0-alpha.4',
      '1.0.0-alpha.5',
      '1.0.0-beta.1',
    ],
  },
  {
    packageName: '@histoire/plugin-nuxt',
    patchFile: 'patches/histoire-plugin-nuxt.patch',
    versions: [
      '1.0.0-alpha.3',
      '1.0.0-alpha.4',
      '1.0.0-alpha.5',
      '1.0.0-beta.1',
    ],
  },
]

export function createPackageSelector(group) {
  return `${group.packageName}@${group.versions.join(' || ')}`
}

export const supportedHistoirePackageVersions = new Map(
  histoirePatchGroups.map(group => [group.packageName, new Set(group.versions)]),
)
