FROM node:5.12
MAINTAINER Long Nguyen <tobernguyen@gmail.com>
ENV REFRESHED_AT 2016-08-15

RUN apt-get -y update && \
    apt-get -y install graphicsmagick

RUN useradd --user-group --create-home --shell /bin/false app && \
    npm install nodemon -g

ENV HOME=/home/app

COPY package.json npm-shrinkwrap.json $HOME/api/
RUN chown -R app:app $HOME/*

WORKDIR $HOME/api
RUN npm install

CMD ["npm", "run", "dev"]
