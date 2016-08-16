FROM node:5.12
MAINTAINER Long Nguyen <tobernguyen@gmail.com>
ENV REFRESHED_AT 2016-08-15

RUN apt-get -yqq update && \
    apt-get -yqq install graphicsmagick

RUN useradd --user-group --create-home --shell /bin/false app && \
    npm install nodemon -g --silent

ENV HOME=/home/app

COPY package.json npm-shrinkwrap.json $HOME/api/
RUN chown -R app:app $HOME/*

USER app
WORKDIR $HOME/api
RUN npm install --silent && mv node_modules $HOME/

USER root
COPY . $HOME/api
RUN chown -R app:app $HOME/*
RUN mv $HOME/node_modules .
USER app

CMD ["npm", "start"]
