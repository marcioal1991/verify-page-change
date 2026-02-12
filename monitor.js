const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { diffLines } = require('diff');
const notifier = require('node-notifier');

const URL = 'https://www.mercadolivre.com.br/pagina/housecoll';
const OLD_CONTENT_FILE = './old-content.txt';

function alertChange() {
  notifier.notify({
    title: '⚠️ Página alterou!',
    message: 'O conteúdo do BODY foi modificado.',
    sound: true,
  });
}

function normalizeHtml(html) {
  const $ = cheerio.load(html);

  // Clona apenas o body
  const body = $('body').clone();

  // Remove scripts e estilos
  body.find('script').remove();
  body.find('style').remove();

  // Remove atributos dinâmicos
  body.find('[nonce]').removeAttr('nonce');

  // Remove banner de cookies
  body.find('.cookie-consent-banner-opt-out').remove();
  body.find('.cookie-consent-snackbar').remove();
  body.find('#js-modal-cookie-consent-banner-opt-out').remove();

  // Remove comentários
  body.find('*').contents().each(function () {
    if (this.type === 'comment') {
      $(this).remove();
    }
  });

  return body.html()
      .replace(/\s+/g, ' ')
      .trim();
}

function compareContents(oldContent, newContent) {
  const differences = diffLines(oldContent, newContent);
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

  if (hasChanges) {
    alertChange();
  } else {
    console.log('✅ Nenhuma mudança estrutural relevante encontrada.');
  }
}

async function checkIfPageChanged() {
  try {
    const response = await axios.get(URL);
    const normalized = normalizeHtml(response.data);

    let oldContent = null;

    if (fs.existsSync(OLD_CONTENT_FILE)) {
      oldContent = fs.readFileSync(OLD_CONTENT_FILE, 'utf-8');
    }

    if (!oldContent) {
      console.log('📌 Primeira execução. Salvando conteúdo.');
      fs.writeFileSync(OLD_CONTENT_FILE, normalized);
    } else if (normalized === oldContent) {
      console.log('✅ Página NÃO mudou.');
    } else {
      console.log('⚠️ Página alterou!');
      compareContents(oldContent, normalized);
      fs.writeFileSync(OLD_CONTENT_FILE, normalized);
    }

  } catch (error) {
    console.error('Erro ao verificar página:', error.message);
  }

  // Verifica novamente em 10 segundos
  setTimeout(checkIfPageChanged, 5000);
}

checkIfPageChanged();
