import crypto from 'crypto'

const customCode = process.argv[2]

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars[crypto.randomInt(chars.length)]
  }
  return code.slice(0, 4) + '-' + code.slice(4, 8) + '-' + code.slice(8, 12)
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

const code = customCode || generateRandomCode()
const hash = sha256(code)

console.log('')
console.log('════════════════════════════════════════════')
console.log(`  邀请码:  ${code}`)
console.log(`  哈希值:  ${hash}`)
console.log('════════════════════════════════════════════')
console.log('')
console.log('  使用方式:')
console.log('    全站锁 → 将哈希值粘贴到 src/config/invitation.js 的 codeHash')
console.log('    单篇锁 → 创建 .lock 文件，内容为上面的哈希值')
console.log('    分享   → 将邀请码发给受邀用户')
console.log('')
