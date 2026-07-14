export const histoirePatchGroups = [
  {
    packageName: '@histoire/app',
    patchFile: 'patches/auto-select-first-variant.patch',
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

export const supportedHistoireAppVersions = new Set(
  histoirePatchGroups.flatMap(group => group.versions),
)
