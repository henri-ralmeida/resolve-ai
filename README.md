# Resolve Aí

Aplicação Full Stack para registrar, acompanhar e resolver ocorrências em condomínios, empresas, bairros ou organizações. O Solicitante acompanha suas demandas; o Gestor organiza o atendimento, registra cada mudança de estado e consulta indicadores.

## Funcionalidades

- Solicitante: cadastro/login, abertura de ocorrência com imagem opcional, consulta apenas das próprias ocorrências, comentários, histórico e avaliação após resolução.
- Gestor: consulta geral e filtros por categoria/status/prioridade, definição de prioridade e responsável, atualização de status com observação obrigatória, comentários, solução aplicada e dashboard.
- Fluxo: `Aberta → Em análise → Em atendimento → Resolvida`; uma ocorrência ativa também pode ser cancelada. `Resolvida` e `Cancelada` são estados finais. Cada transição gera histórico com estado anterior/novo, data/hora, Gestor e observação.

## Arquitetura

Frontend React + TypeScript; API Node.js + Express; autenticação JWT com perfis `Solicitante`/`Gestor`; PostgreSQL com Prisma; imagem em volume persistente. A API e a interface são servidas pela mesma origem em produção. O código está separado em `frontend/` e `backend/`; o backend é um monólito modular, sem microsserviços.

## Executar com Docker

Requisitos: Docker Desktop/Engine e Compose funcionando.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Antes de iniciar, altere em `.env` as senhas, `JWT_KEY` (mínimo 32 caracteres) e, para ambiente não local, o e-mail do Gestor. O Compose monta um banco novo em `postgres-node-data`, separado do volume usado pela implementação anterior; imagens ficam em `uploads-node-data`. As migrations rodam automaticamente. Não execute `docker compose down -v` se quiser manter os dados.

### Dados de demonstração

Para criar ocorrências de exemplo no ambiente local, execute uma vez:

```powershell
docker compose exec -e SEED_DEMO_DATA=true app sh -c "cd backend && npm run db:seed:demo"
```

O comando é repetível: preserva ocorrências existentes e acrescenta apenas as amostras que ainda faltam. Ele só aceita um banco local (`localhost` ou o serviço Compose `postgres`) e exige a confirmação explícita `SEED_DEMO_DATA=true`.

Contas locais criadas pela carga:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Gestor | `demo.gestor@resolveai.local` | `Gestor123!` |
| Solicitante | `demo.solicitante@resolveai.local` | `Solicitante123!` |
| Solicitante | `demo.ana@resolveai.local` | `Solicitante123!` |

As contas e senhas são somente para demonstração local. A carga inclui ocorrências em todos os status, histórico, comentários, avaliações, soluções e uma imagem ilustrativa.

- Aplicação: [http://localhost:8080](http://localhost:8080)
- Documentação interativa da API: [http://localhost:8080/swagger](http://localhost:8080/swagger)
- OpenAPI JSON: [http://localhost:8080/openapi/v1.json](http://localhost:8080/openapi/v1.json)
- Saúde do banco e da API: [http://localhost:8080/health](http://localhost:8080/health)

Para demonstração **somente local**, se nenhuma configuração for informada, o Compose usa `gestor@resolveai.local` / `Gestor123!`. Não use essas credenciais em produção.

## Desenvolvimento sem Docker

Requisitos: Node.js 24, npm e PostgreSQL. Crie um banco vazio e configure `DATABASE_URL` no `.env` com a URL PostgreSQL; o valor de `.env.example` é apenas um exemplo. Depois:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
$env:DATABASE_URL = "postgresql://usuario:senha@127.0.0.1:5432/resolveai?schema=public"
npm run db:generate --prefix backend
npm run db:deploy --prefix backend
npm run dev --prefix backend
```

Em outro terminal, `npm run dev --prefix frontend` inicia a interface em [http://localhost:5173](http://localhost:5173); o Vite encaminha as chamadas da API para a porta 5080. O Gestor inicial é criado no primeiro início com `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Se o e-mail já existir como Solicitante, o servidor não o promove automaticamente.

## Testes

Os testes integrados usam um **banco PostgreSQL separado**. Crie um banco cujo nome contenha `_test`, aplique a migration nele e execute:

```powershell
$env:TEST_DATABASE_URL = "postgresql://usuario:senha@127.0.0.1:5432/resolveai_node_test?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:generate --prefix backend
npm run db:deploy --prefix backend
npm test --prefix backend
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

A suíte exercita HTTP real com PostgreSQL: cadastro/login, isolamento por Solicitante, permissões do Gestor, imagem válida/inválida, comentários, prioridade, responsável, estados/histórico, solução, avaliação, filtros e dashboard. Inclui o contraexemplo de tentar pular de `Aberta` diretamente para `Resolvida`. O teste recusa qualquer URL de banco sem `_test` no nome e limpa os próprios dados. O workflow de CI repete essas verificações e tenta construir a imagem Docker.

## API

| Método | Rota | Acesso |
| --- | --- | --- |
| POST | `/api/auth/register` | público; cria Solicitante |
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | autenticado |
| POST | `/api/occurrences` | Solicitante |
| GET | `/api/occurrences` | ambos; Solicitante vê somente as próprias |
| GET | `/api/occurrences/{id}` | ambos; respeita propriedade |
| GET | `/api/occurrences/{id}/history` | ambos; respeita propriedade |
| POST | `/api/occurrences/{id}/comments` | ambos; respeita propriedade |
| POST | `/api/occurrences/{id}/evaluation` | Solicitante dono, após resolução |
| PATCH | `/api/occurrences/{id}/priority` | Gestor |
| PATCH | `/api/occurrences/{id}/assignee` | Gestor |
| PATCH | `/api/occurrences/{id}/status` | Gestor |
| PATCH | `/api/occurrences/{id}/solution` | Gestor |
| GET | `/api/users/managers` | Gestor |
| GET | `/api/dashboard` | Gestor |

Os corpos, formatos de resposta e erros estão documentados no Swagger. O formulário de abertura usa `multipart/form-data` e aceita JPEG, PNG, WebP ou GIF de até 5 MB; o conteúdo é conferido além da extensão/MIME.

## Deploy em Cloud

O `render.yaml` descreve um Blueprint Render com serviço web Docker, PostgreSQL gerenciado, chave JWT gerada, health check e disco persistente para imagens. Ao criar o Blueprint, informe `ADMIN_EMAIL` e `ADMIN_PASSWORD` e confirme custos/limites dos recursos escolhidos. O projeto não foi publicado automaticamente: publicação depende da conta Cloud e das credenciais do grupo. Consulte a [especificação de Blueprints](https://render.com/docs/blueprint-spec) e a [documentação de discos](https://render.com/docs/disks) antes de publicar.

## Demonstração sugerida

1. Cadastre um Solicitante e abra uma ocorrência com imagem.
2. Mostre que outro Solicitante não enxerga essa ocorrência.
3. Entre como Gestor; use os filtros e o dashboard, ajuste prioridade e responsável.
4. Comente, avance cada etapa com observação e registre a solução.
5. Mostre o histórico completo e, de volta ao Solicitante, avalie a resolução.
6. No Swagger, tente `Aberta → Resolvida` em uma segunda ocorrência: o resultado deve ser `409`, sem novo item de histórico.

Categorias são texto livre; níveis de prioridade e nota de 1 a 5 são escolhas deste MVP. Notificações, SLA, mapa, recuperação de senha, antivírus de arquivos e armazenamento de objetos não foram incluídos. A interface mantém fontes locais, foco de teclado visível, layout responsivo e opção de movimento reduzido.
