FROM node:lts

WORKDIR /app

COPY . .

RUN yarn

RUN node ace invoke @adonisjs/core

EXPOSE 3333

CMD [ "yarn", "dev" ]