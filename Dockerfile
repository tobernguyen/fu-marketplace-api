FROM node:5.12
MAINTAINER Long Nguyen <tobernguyen@gmail.com>
ENV REFRESHED_AT 2016-08-15

RUN apt-get -yqq update && \
    apt-get -yqq install graphicsmagick && \
    npm install nodemon -g --silent

ENV HOME=/src/app

COPY package.json npm-shrinkwrap.json $HOME/api/

WORKDIR $HOME/api
RUN npm install --silent

COPY . $HOME/api

CMD ["npm", "start"]
