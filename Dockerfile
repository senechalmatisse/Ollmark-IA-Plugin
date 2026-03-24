FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200
EXPOSE 50050

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]
