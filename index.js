import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Bot', 'Chrome', '120.0.0'],
  })

  if (!sock.authState.creds.registered) {
    console.log('❌ Belum login! Jalankan login.js dulu.')
    process.exit(1)
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✅ Bot online!')
    if (connection === 'close') {
      const kode = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (kode !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...')
        setTimeout(startBot, 3000)
      } else {
        console.log('❌ Logout!')
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const teks = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const dari = msg.key.remoteJid

    if (teks === '.ping') {
      await sock.sendMessage(dari, { text: '🏓 Pong!' })
    }

    if (teks === '.menu') {
      await sock.sendMessage(dari, { text: '📋 *MENU BOT*\n\n.ping → Cek bot\n.menu → Menu ini' })
    }
  })
}

startBot()
