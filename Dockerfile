# Usa Node.js 20 Alpine como base
FROM node:20-alpine

# Instala dependencias necesarias para Prisma
RUN apk add --no-cache openssl

# Establece el directorio de trabajo
WORKDIR /app

# Copia archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instala TODAS las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Genera el cliente de Prisma
RUN npx prisma generate

# Copia el resto del código fuente
COPY . .

# Compila TypeScript a JavaScript
RUN npm run build

# Elimina devDependencies después de compilar (opcional, reduce tamaño)
RUN npm prune --production

# Expone el puerto
EXPOSE 3001

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "dist/server.js"]