const { notarize } = require('@electron/notarize')
const { execFileSync } = require('child_process')
const path = require('path')

module.exports = async function afterSign(context) {
  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName !== 'darwin') return

  const appName = packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env
  const hasDeveloperId = APPLE_ID && APPLE_APP_SPECIFIC_PASSWORD && APPLE_TEAM_ID

  if (hasDeveloperId) {
    console.log(`  • notarizing     file=${appPath}`)
    await notarize({
      appBundleId: 'com.kert.xml-editor',
      appPath,
      appleId: APPLE_ID,
      appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
      teamId: APPLE_TEAM_ID
    })
    return
  }

  console.log('  • no Developer ID credentials found (APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID)')
  console.log('  • local-only workaround: xattr -cr + ad-hoc codesign (does not survive distribution to another machine)')
  execFileSync('xattr', ['-cr', appPath])
  execFileSync('codesign', ['--deep', '--force', '--sign', '-', appPath])
}
