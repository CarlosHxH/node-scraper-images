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
    font-noto-emoji \
    wget \
    dumb-init

# Configurar variáveis de ambiente para Puppeteer - CORREÇÃO AQUI
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROMIUM_PATH=/usr/bin/chromium \
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
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 3000

# Comando de inicialização usando dumb-init (recomendado para Docker)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]