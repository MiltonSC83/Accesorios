FROM node:8.12.0-alpine
WORKDIR /opt/mre

ENV PORT=80
ENV BASE_URL=http://accesorios.openode.io/

COPY package*.json ./
RUN ["npm", "install", "--unsafe-perm"]

COPY tsconfig.json ./
COPY src ./src/
RUN ["npm", "run", "build-only"]

COPY public ./public/

EXPOSE 3901/tcp
CMD ["npm", "start"]
