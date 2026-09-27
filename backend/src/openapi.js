const statusValues = ['Aberta', 'EmAnalise', 'EmAtendimento', 'Resolvida', 'Cancelada'];
const priorityValues = ['Baixa', 'Media', 'Alta', 'Critica'];

const json = (schema) => ({ content: { 'application/json': { schema } } });
const object = (properties, required = []) => ({ type: 'object', properties, required });
const string = { type: 'string' };
const uuid = { type: 'string', format: 'uuid' };

const openapi = {
  openapi: '3.0.3',
  info: { title: 'Resolve Aí API', version: '1.0.0', description: 'Gestão de ocorrências para Solicitantes e Gestores.' },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      User: object({ id: uuid, name: string, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['Solicitante', 'Gestor'] } }),
      Occurrence: object({
        id: uuid, title: string, description: string, category: string, location: string,
        imagePath: { ...string, nullable: true }, priority: { type: 'string', enum: priorityValues },
        status: { type: 'string', enum: statusValues }, appliedSolution: { ...string, nullable: true },
        requester: { $ref: '#/components/schemas/User' }, assignee: { $ref: '#/components/schemas/User', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
        comments: { type: 'array', items: { type: 'object' } }, history: { type: 'array', items: { type: 'object' } },
        evaluation: { type: 'object', nullable: true },
        allowedNextStatuses: { type: 'array', items: { type: 'string', enum: statusValues } },
      }),
    },
  },
  paths: {
    '/api/auth/register': { post: {
      summary: 'Criar conta de Solicitante',
      requestBody: { required: true, ...json(object({ name: string, email: string, password: string }, ['name', 'email', 'password'])) },
      responses: { 200: { description: 'Conta criada com token JWT' }, 409: { description: 'E-mail já cadastrado' } },
    } },
    '/api/auth/login': { post: {
      summary: 'Autenticar usuário',
      requestBody: { required: true, ...json(object({ email: string, password: string }, ['email', 'password'])) },
      responses: { 200: { description: 'Token JWT e usuário' }, 401: { description: 'Credenciais inválidas' } },
    } },
    '/api/auth/me': { get: { summary: 'Consultar usuário autenticado', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Usuário atual' } } } },
    '/api/occurrences': {
      get: { summary: 'Listar ocorrências visíveis', security: [{ bearerAuth: [] }], parameters: [
        { name: 'category', in: 'query', schema: string },
        { name: 'status', in: 'query', schema: { type: 'string', enum: statusValues } },
        { name: 'priority', in: 'query', schema: { type: 'string', enum: priorityValues } },
      ], responses: { 200: { description: 'Lista de ocorrências' } } },
      post: { summary: 'Registrar ocorrência (Solicitante)', security: [{ bearerAuth: [] }], requestBody: {
        required: true, content: { 'multipart/form-data': { schema: object({
          Title: string, Description: string, Category: string, Location: string,
          Image: { type: 'string', format: 'binary' },
        }, ['Title', 'Description', 'Category', 'Location']) } },
      }, responses: { 201: { description: 'Ocorrência criada' }, 403: { description: 'Perfil não autorizado' } } },
    },
    '/api/occurrences/{id}': { get: { summary: 'Detalhar ocorrência visível', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], responses: { 200: { description: 'Ocorrência com histórico e comentários', ...json({ $ref: '#/components/schemas/Occurrence' }) }, 404: { description: 'Não encontrada ou sem acesso' } } } },
    '/api/occurrences/{id}/history': { get: { summary: 'Consultar histórico de status', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], responses: { 200: { description: 'Histórico auditável' } } } },
    '/api/occurrences/{id}/comments': { post: { summary: 'Adicionar comentário', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], requestBody: { required: true, ...json(object({ text: string }, ['text'])) }, responses: { 200: { description: 'Comentário adicionado' } } } },
    '/api/occurrences/{id}/priority': { patch: { summary: 'Alterar prioridade (Gestor)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], requestBody: { required: true, ...json(object({ priority: { type: 'string', enum: priorityValues } }, ['priority'])) }, responses: { 204: { description: 'Prioridade alterada' } } } },
    '/api/occurrences/{id}/assignee': { patch: { summary: 'Atribuir Gestor responsável', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], requestBody: { required: true, ...json(object({ assigneeId: { ...uuid, nullable: true } }, ['assigneeId'])) }, responses: { 204: { description: 'Responsável alterado' } } } },
    '/api/occurrences/{id}/status': { patch: { summary: 'Alterar status e registrar histórico', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], requestBody: { required: true, ...json(object({ status: { type: 'string', enum: statusValues }, observation: string }, ['status', 'observation'])) }, responses: { 204: { description: 'Status alterado' }, 409: { description: 'Transição inválida' } } } },
    '/api/occurrences/{id}/solution': { patch: { summary: 'Registrar solução aplicada', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], requestBody: { required: true, ...json(object({ solution: string }, ['solution'])) }, responses: { 204: { description: 'Solução registrada' } } } },
    '/api/occurrences/{id}/evaluation': { post: { summary: 'Avaliar ocorrência resolvida (Solicitante)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }], requestBody: { required: true, ...json(object({ score: { type: 'integer', minimum: 1, maximum: 5 }, comment: string }, ['score'])) }, responses: { 204: { description: 'Avaliação registrada' }, 409: { description: 'Ocorrência não resolvida ou já avaliada' } } } },
    '/api/users/managers': { get: { summary: 'Listar Gestores para atribuição', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Gestores' } } } },
    '/api/dashboard': { get: { summary: 'Indicadores para Gestor', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Total e contagens por status, prioridade e categoria' } } } },
    '/health': { get: { summary: 'Saúde da API e do banco', responses: { 200: { description: 'Pronto' }, 503: { description: 'Banco indisponível' } } } },
  },
};

module.exports = openapi;
