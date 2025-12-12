const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000;

app.use(express.json());

// Função para fazer scraping das imagens
async function scrapeGoogleImages(query, limit = 20) {
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  
  // Usar executável do Chromium do sistema se disponível (Docker)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    
    // Configurar user agent para evitar bloqueios
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Construir URL de busca do Google Images
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=2&sca_esv=f0158aba78c19323&sxsrf=AE3TifP9b5IU8m8k5mLrNnkEc6Ls3-q_OA:1765551043360`;
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Rolar a página para carregar mais imagens
    await autoScroll(page);

    // Extrair URLs das imagens
    const images = await page.evaluate((limit) => {
      const results = [];
      const imgElements = document.querySelectorAll('img');
      
      for (let img of imgElements) {
        if (results.length >= limit) break;
        
        const src = img.src || img.dataset.src;
        const alt = img.alt || '';
        
        // Filtrar apenas imagens válidas (não icons/logos do Google)
        // Aceita: encrypted-tbn*.gstatic.com (thumbnails reais), data: URLs com alt, ou http URLs válidas
        const isEncryptedThumbnail = src && src.includes('encrypted-tbn') && src.includes('gstatic.com');
        const isDataUrl = src && src.startsWith('data:image');
        const isHttpUrl = src && src.startsWith('http');
        const isValidUrl = isEncryptedThumbnail || (isHttpUrl && !src.includes('google.com/logos') && !src.includes('google.com/images') && !src.includes('google.com/tia') && !(src.includes('gstatic.com') && !src.includes('encrypted-tbn'))) || (isDataUrl && alt);
        
        if (src && isValidUrl && alt) {
          results.push({
            url: src,
            alt: alt,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height
          });
        }
      }
      
      return results;
    }, limit);

    await browser.close();
    return images;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Função para rolar a página automaticamente
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight >= 3000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: 'API de Scraping Google Images',
    endpoints: {
      search: '/api/images/search?q=termo&limit=3'
    }
  });
});

// Rota para buscar imagens
app.get('/api/images/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Parâmetro "q" (query) é obrigatório'
      });
    }

    const maxLimit = Math.min(parseInt(limit), 50);
    
    console.log(`Buscando imagens para: "${q}" (limite: ${maxLimit})`);
    
    const images = await scrapeGoogleImages(q, maxLimit);

    res.json({
      query: q,
      total: images.length,
      images: images
    });

  } catch (error) {
    console.error('Erro ao fazer scraping:', error);
    res.status(500).json({
      error: 'Erro ao buscar imagens',
      message: error.message
    });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
  console.log(`📷 Endpoint de busca: http://localhost:${PORT}/api/images/search?q=placeholder&limit=3`);
});