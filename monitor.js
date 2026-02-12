const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const fs = require('fs');
const { diffLines } = require('diff');
const notifier = require('node-notifier');


function alertChange() {
  notifier.notify({
    title: 'Página alterou!',
    message: 'O conteúdo foi modificado.',
    sound: true,
  });
}
function compareFiles(file1, file2) {
  const html1 = fs.readFileSync(file1, 'utf-8');
  const html2 = fs.readFileSync(file2, 'utf-8');

  const normalized1 = normalizeHtml(html1);
  const normalized2 = normalizeHtml(html2);

  const differences = diffLines(normalized1, normalized2);

  let hasChanges = false;

  differences.forEach(part => {
    if (part.added) {
      hasChanges = true;
      console.log('\n🟢 ADICIONADO:\n');
      console.log(part.value);
    }
    if (part.removed) {
      hasChanges = true;
      console.log('\n🔴 REMOVIDO:\n');
      console.log(part.value);
    }
  });

  if (!hasChanges) {
    console.log('✅ Nenhuma mudança estrutural relevante encontrada.');
    return;
  }
  alertChange();
}




const URL = 'https://www.mercadolivre.com.br/pagina/housecoll';
const HASH_FILE = './normalized-hash.txt';

function normalizeHtml(html) {
  const $ = cheerio.load(html);

  $('script').remove();

  $('style').remove();

  $('[nonce]').removeAttr('nonce');

  const cleaned = $.html()
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ') // normalizar espaços
    .trim();

  return cleaned;
}

function generateHash(content) {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

async function checkIfPageChanged() {
  const response = await axios.get(URL);
  const normalized = normalizeHtml(response.data);

  let oldContent = null;

  if (fs.existsSync(HASH_FILE)) {
    oldContent = fs.readFileSync(HASH_FILE, 'utf-8');
  }

  if (normalized === oldContent) {
    console.log('✅ Página NÃO mudou (diferenças dinâmicas ignoradas).');
    setTimeout(checkIfPageChanged, 1000);
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  fs.writeFileSync("teste" + timestamp, normalized);
  fs.writeFileSync(HASH_FILE, normalized);
  compareFiles(HASH_FILE, "teste" + timestamp)
  setTimeout(checkIfPageChanged, 1000);
  return true;
}

checkIfPageChanged();

