# Usar Node.js 20 LTS Alpine para menor tamanho da imagem
FROM node:20-alpine

# Instalar dependências do sistema necessárias para Puppeteer/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

# Configurar variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser \
    PORT=3000

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências primeiro (para cache de layers)
COPY package*.json ./

# Instalar dependências npm
RUN npm ci --only=production

# Copiar código da aplicação
COPY server.js ./

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]

