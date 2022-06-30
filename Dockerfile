FROM node:16.14.2 as production

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

ENV NODE_OPTIONS=--max_old_space_size=4096

RUN yarn

COPY . .

RUN yarn build

ENV NODE_ENV=production


USER node

CMD [ "node", "dist/index.js" ]
