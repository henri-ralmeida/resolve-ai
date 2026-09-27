const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

if (process.env.SEED_DEMO_DATA !== 'true') {
  throw new Error('Para inserir dados de demonstração, defina SEED_DEMO_DATA=true explicitamente.');
}

const database = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(database.hostname)) {
  throw new Error('Os dados de demonstração só podem ser inseridos em um PostgreSQL local.');
}
if (database.pathname.toLowerCase().includes('_test')) {
  throw new Error('O script não pode ser executado em um banco de testes.');
}

const db = new PrismaClient();
const demoPrefix = 'DEMO - ';
const accounts = {
  manager: { name: 'Gestor Demonstração', email: 'demo.gestor@resolveai.local', password: 'Gestor123!', role: 'Gestor' },
  henrique: { name: 'Solicitante Demonstração', email: 'demo.solicitante@resolveai.local', password: 'Solicitante123!', role: 'Solicitante' },
  ana: { name: 'Ana Demonstração', email: 'demo.ana@resolveai.local', password: 'Solicitante123!', role: 'Solicitante' },
};

function makeDemoPng() {
  const width = 640;
  const height = 360;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x += 1) {
      const horizon = 225 + Math.floor(Math.abs(x - width / 2) * 0.12);
      const floor = y > horizon;
      const shade = floor ? Math.min(34, Math.floor((y - horizon) / 4)) : Math.floor(y / 32);
      let color = floor ? [95 + shade, 108 + shade, 91 + shade] : [207 + shade, 205 + shade, 185 + shade];
      if (x < 35 || x > width - 36) color = floor ? [68 + shade, 77 + shade, 69 + shade] : [139 + shade, 143 + shade, 133 + shade];
      const offset = row + 1 + x * 3;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
  }

  function rectangle(x, y, w, h, color) {
    for (let py = y; py < y + h; py += 1) {
      for (let px = x; px < x + w; px += 1) {
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        const offset = py * (width * 3 + 1) + 1 + px * 3;
        pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2];
      }
    }
  }

  rectangle(0, 224, width, 7, [116, 119, 101]);
  rectangle(101, 91, 104, 67, [114, 127, 112]);
  rectangle(108, 98, 90, 53, [226, 222, 194]);
  rectangle(140, 158, 27, 11, [63, 76, 65]);
  rectangle(378, 77, 146, 156, [82, 75, 61]);
  rectangle(389, 87, 124, 146, [140, 117, 83]);
  rectangle(401, 99, 98, 122, [91, 102, 83]);
  rectangle(413, 112, 73, 95, [155, 160, 131]);
  rectangle(472, 163, 7, 7, [242, 193, 78]);
  rectangle(40, 233, width - 80, 4, [153, 153, 127]);

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function chunk(type, data) {
    const name = Buffer.from(type);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    let sum = 0xffffffff;
    for (const byte of Buffer.concat([name, data])) sum = crcTable[(sum ^ byte) & 0xff] ^ (sum >>> 8);
    crc.writeUInt32BE((sum ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, name, data, crc]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function ensureAccount(account) {
  const passwordHash = await bcrypt.hash(account.password, 10);
  const user = await db.user.upsert({
    where: { email: account.email },
    create: { name: account.name, email: account.email, passwordHash, role: account.role },
    update: {},
  });
  if (user.role !== account.role) throw new Error(`${account.email} já existe com outro perfil; nenhum dado foi alterado.`);
  return user;
}

function ageInDays(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const samples = [
  { owner: 'henrique', title: 'Lâmpada queimada no corredor', category: 'Iluminação', location: 'Bloco A - 2º andar', priority: 'Media', status: 'Aberta', age: 1, comments: ['A lâmpada apagou ontem à noite.'] , image: true },
  { owner: 'ana', title: 'Vazamento próximo à caixa d’água', category: 'Hidráulica', location: 'Bloco C - cobertura', priority: 'Alta', status: 'Aberta', age: 2, comments: ['A água está escorrendo pela parede.'] },
  { owner: 'henrique', title: 'Portão de acesso faz ruído', category: 'Acesso', location: 'Entrada principal', priority: 'Media', status: 'EmAnalise', age: 4, history: [['Aberta', 'EmAnalise', 'Solicitação recebida e em triagem.']], comments: ['O ruído começou nesta semana.'] },
  { owner: 'ana', title: 'Banco solto na praça', category: 'Mobiliário', location: 'Praça central', priority: 'Baixa', status: 'EmAnalise', age: 6, history: [['Aberta', 'EmAnalise', 'Equipe avaliando o reparo necessário.']] },
  { owner: 'henrique', title: 'Tomada exposta no salão', category: 'Elétrica', location: 'Salão de festas', priority: 'Critica', status: 'EmAtendimento', age: 3, history: [['Aberta', 'EmAnalise', 'Risco elétrico encaminhado para avaliação.'], ['EmAnalise', 'EmAtendimento', 'Eletricista está verificando o local.']], comments: ['Área isolada preventivamente.'] },
  { owner: 'ana', title: 'Retorno de água na garagem', category: 'Hidráulica', location: 'Garagem - vaga 18', priority: 'Alta', status: 'EmAtendimento', age: 5, history: [['Aberta', 'EmAnalise', 'Chamado priorizado pela equipe.'], ['EmAnalise', 'EmAtendimento', 'Manutenção iniciou a inspeção.']] },
  { owner: 'henrique', title: 'Ar-condicionado da sala de estudos', category: 'Climatização', location: 'Sala de estudos', priority: 'Media', status: 'Resolvida', age: 8, history: [['Aberta', 'EmAnalise', 'Verificada disponibilidade de peça.'], ['EmAnalise', 'EmAtendimento', 'Equipe técnica iniciou o serviço.'], ['EmAtendimento', 'Resolvida', 'Filtro limpo e equipamento testado.']], solution: 'Filtro substituído e equipamento testado por 30 minutos.', comments: ['Obrigado pela atualização.'], evaluation: { score: 5, comment: 'Atendimento rápido e claro.' } },
  { owner: 'ana', title: 'Luminária da entrada social', category: 'Iluminação', location: 'Entrada social', priority: 'Alta', status: 'Resolvida', age: 11, history: [['Aberta', 'EmAnalise', 'Verificado modelo da luminária.'], ['EmAnalise', 'EmAtendimento', 'Reposição instalada pela manutenção.'], ['EmAtendimento', 'Resolvida', 'Iluminação verificada no local.']], solution: 'Lâmpada LED substituída.', evaluation: { score: 4, comment: 'Ficou ótimo.' } },
  { owner: 'henrique', title: 'Retirada de galhos após poda', category: 'Jardinagem', location: 'Calçada lateral', priority: 'Baixa', status: 'Cancelada', age: 9, history: [['Aberta', 'Cancelada', 'Solicitante informou que a retirada já foi feita.']], comments: ['Pode encerrar, o serviço foi realizado pela prefeitura.'] },
  { owner: 'ana', title: 'Reparo de lixeira externa', category: 'Limpeza', location: 'Portaria de serviço', priority: 'Baixa', status: 'Cancelada', age: 14, history: [['Aberta', 'EmAnalise', 'Equipe confirmou que o item pertence ao comércio vizinho.'], ['EmAnalise', 'Cancelada', 'Solicitação encerrada após confirmação do endereço.']] },
  { owner: 'henrique', title: 'Elevador demorando para fechar', category: 'Elevadores', location: 'Bloco B', priority: 'Alta', status: 'Aberta', age: 1, comments: ['Acontece principalmente no horário de pico.'] },
  { owner: 'ana', title: 'Coleta seletiva não realizada', category: 'Limpeza', location: 'Área de recicláveis', priority: 'Media', status: 'Resolvida', age: 18, history: [['Aberta', 'EmAnalise', 'Conferido o cronograma de coleta.'], ['EmAnalise', 'EmAtendimento', 'Coleta solicitada à equipe local.'], ['EmAtendimento', 'Resolvida', 'Materiais recolhidos e área organizada.']], solution: 'Coleta realizada e cronograma atualizado no local.', evaluation: { score: 3, comment: 'Resolvido, mas levou alguns dias.' } },
];

async function main() {
  const manager = await ensureAccount(accounts.manager);
  const requester = await ensureAccount(accounts.henrique);
  const ana = await ensureAccount(accounts.ana);
  const people = { manager, henrique: requester, ana };
  const uploadsPath = process.env.UPLOADS_PATH || path.resolve(__dirname, '../uploads');
  const imageName = 'resolveai-demo-corredor.png';
  await fs.mkdir(uploadsPath, { recursive: true });
  const imageFile = path.join(uploadsPath, imageName);
  try { await fs.access(imageFile); } catch { await fs.writeFile(imageFile, makeDemoPng(), { flag: 'wx' }); }

  let inserted = 0;
  let skipped = 0;
  for (const [index, sample] of samples.entries()) {
    const owner = people[sample.owner];
    const title = `${demoPrefix}${sample.title}`;
    const existing = await db.occurrence.findFirst({
      where: { requesterId: owner.id, title },
      include: { comments: { select: { createdAt: true } }, history: { select: { changedAt: true } }, evaluation: { select: { createdAt: true } } },
    });
    if (existing) {
      const existingActivity = [
        ...existing.comments.map((comment) => comment.createdAt),
        ...existing.history.map((entry) => entry.changedAt),
        ...(existing.evaluation ? [existing.evaluation.createdAt] : []),
      ].reduce((latest, date) => (date > latest ? date : latest), existing.updatedAt);
      if (existingActivity > existing.updatedAt) {
        await db.occurrence.update({ where: { id: existing.id }, data: { updatedAt: existingActivity } });
      }
      skipped += 1;
      continue;
    }

    const createdAt = ageInDays(sample.age);
    const history = (sample.history || []).map(([previousStatus, newStatus, observation], step) => ({
      previousStatus,
      newStatus,
      observation,
      changedById: manager.id,
      changedAt: new Date(createdAt.getTime() + (Date.now() - createdAt.getTime()) * (step + 1) / (sample.history.length + 1)),
    }));
    const comments = (sample.comments || []).map((text, commentIndex) => ({
      authorId: commentIndex % 2 === 0 ? owner.id : manager.id,
      text,
      createdAt: new Date(createdAt.getTime() + Math.min((commentIndex + 1) * 60 * 60 * 1000, Date.now() - createdAt.getTime())),
    }));
    const evaluation = sample.evaluation && {
      requesterId: owner.id,
      ...sample.evaluation,
      createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
    };
    const lastActivity = [
      createdAt,
      ...history.map((entry) => entry.changedAt),
      ...comments.map((comment) => comment.createdAt),
      ...(evaluation ? [evaluation.createdAt] : []),
    ].reduce((latest, date) => (date > latest ? date : latest), createdAt);
    await db.occurrence.create({
      data: {
        requesterId: owner.id,
        assigneeId: sample.status === 'Aberta' ? null : manager.id,
        title,
        description: `Registro demonstrativo para explorar o fluxo do sistema. ${sample.title}.`,
        category: sample.category,
        location: sample.location,
        priority: sample.priority,
        status: sample.status,
        imagePath: sample.image ? `/uploads/${imageName}` : null,
        appliedSolution: sample.solution || null,
        createdAt,
        updatedAt: lastActivity,
        history: { create: history },
        comments: { create: comments },
        ...(evaluation ? { evaluation: { create: evaluation } } : {}),
      },
    });
    inserted += 1;
    console.log(`Incluído ${index + 1}/${samples.length}: ${title}`);
  }

  console.log(`Carga de demonstração concluída: ${inserted} ocorrências incluídas, ${skipped} já existiam.`);
  console.log('Contas locais:');
  for (const account of Object.values(accounts)) console.log(`${account.role}: ${account.email} / ${account.password}`);
}

main().catch((error) => {
  console.error('Falha ao inserir dados de demonstração:', error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
