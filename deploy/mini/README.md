# Inre noden på Mac mini (test)

Minin (M5 Pro, 64 GB) kör den inre noden exakt som den ska köras hos
Trafikverket, med en skillnad: modellservern är Ollama på värden i stället
för vLLM i container (vLLM kör inte på Apple Silicon). AI-tjänsten pratar
OpenAI-kompatibelt med båda, så det är en rad i .env.

## Engångsinstallation (på minin, i tmux-sessionen `claude`)

```sh
brew install --cask orbstack          # Docker-motor för Mac, lättare än Docker Desktop
brew install ollama
brew services start ollama
ollama pull mistral-small:24b          # ~14 GB (Q4) – byt mot :24b-instruct-2501-q8_0 för 8-bit
ollama pull bge-m3                     # embeddings, ~1,2 GB

cd ~/code/KopparsConsulting
gh repo clone KopparsConsulting/resiliogov
cd resiliogov
cp .env.example .env                  # fyll i lösenord; INSTALLATION_ROLE=operations
docker compose --profile dev --profile ai-host up -d
```

Första starten bygger databasen från baseline (några sekunder) och startar
Keycloak med utvecklingsrealmen (admin/admin på http://mini:8081).

## Vardag

```sh
git pull && docker compose exec db bash /db/scripts/init.sh   # kör nya migreringar
docker compose --profile dev --profile ai-host up -d --build  # bygg om det som ändrats
docker compose ps                     # status
docker compose logs -f api            # loggar
docker compose exec db psql -U postgres -d resiliogov   # SQL
bash db/scripts/test.sh               # SQL-testsviterna (kräver psql: brew install libpq)
```

## Modellvikter på extern disk

512 GB räcker inte för fyra modellkandidater plus Docker. Ollama lagrar vikter
i `~/.ollama/models`; flytta katalogen till en Thunderbolt-disk och symlänka,
eller sätt `OLLAMA_MODELS=/Volumes/<disk>/ollama` i `~/.zshrc` innan
`brew services restart ollama`.

## Nåbarhet

Minin nås via Tailscale som `mini`. Webben blir http://mini:8080 från
MacBooken och iPhonen. Inget exponeras utanför Tailscale-nätet.

## Filarkivet: "EACCES: permission denied, mkdir '/data/files/…'"

Volymen `files` skapades av en äldre image som root. Ge den till node-användaren en gång:

```sh
docker compose exec -u root api chown -R node:node /data/files
```

Nya installationer får rätt ägare automatiskt (Dockerfile skapar katalogen innan volymen monteras).
