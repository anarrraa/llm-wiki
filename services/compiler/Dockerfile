FROM node:20-slim

# pdflatex + зайлшгүй шаардлагатай LaTeX багцууд (Claude-ийн approved package list)
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-latex-base \
      texlive-latex-extra \
      texlive-fonts-recommended \
      texlive-science \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY server.js ./

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]
