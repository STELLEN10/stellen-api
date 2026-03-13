const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Stellen API',
      version:     '1.0.0',
      description: 'A robust REST API with JWT auth, rate limiting, and PostgreSQL. Built by Stellen Ncube.',
      contact: {
        name:  'Stellen Ncube',
        email: 'officialstellen@gmail.com',
        url:   'https://github.com/stellen',
      },
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Development' },
      { url: 'https://api.stellenapi.dev/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Enter your JWT access token',
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────
        RegisterInput: {
          type: 'object',
          required: ['name','email','password'],
          properties: {
            name:     { type:'string', example:'Stellen Ncube', minLength:2, maxLength:100 },
            email:    { type:'string', format:'email', example:'user@example.com' },
            password: { type:'string', minLength:8, example:'Secure@1234', description:'Min 8 chars, must contain uppercase, lowercase, number, special char' },
          },
        },
        LoginInput: {
          type:'object', required:['email','password'],
          properties: {
            email:    { type:'string', format:'email', example:'admin@stellenapi.dev' },
            password: { type:'string', example:'Admin@1234' },
          },
        },
        AuthResponse: {
          type:'object',
          properties: {
            success:      { type:'boolean', example:true },
            accessToken:  { type:'string'  },
            refreshToken: { type:'string'  },
            user:         { $ref:'#/components/schemas/UserPublic' },
          },
        },
        // ── Users ─────────────────────────────────────────
        UserPublic: {
          type:'object',
          properties: {
            id:        { type:'string', format:'uuid' },
            name:      { type:'string' },
            email:     { type:'string' },
            role:      { type:'string', enum:['user','admin'] },
            is_active: { type:'boolean' },
            created_at:{ type:'string', format:'date-time' },
          },
        },
        // ── Posts ─────────────────────────────────────────
        Post: {
          type:'object',
          properties: {
            id:        { type:'string', format:'uuid' },
            user_id:   { type:'string', format:'uuid' },
            title:     { type:'string' },
            content:   { type:'string' },
            tags:      { type:'array', items:{type:'string'} },
            published: { type:'boolean' },
            created_at:{ type:'string', format:'date-time' },
            updated_at:{ type:'string', format:'date-time' },
            author:    { $ref:'#/components/schemas/UserPublic' },
          },
        },
        PostInput: {
          type:'object', required:['title','content'],
          properties: {
            title:     { type:'string', minLength:3, maxLength:255, example:'My First Post' },
            content:   { type:'string', minLength:10, example:'This is the post content...' },
            tags:      { type:'array', items:{type:'string'}, example:['node','api'] },
            published: { type:'boolean', default:false },
          },
        },
        // ── Category ──────────────────────────────────────
        Category: {
          type:'object',
          properties: {
            id:          { type:'string', format:'uuid' },
            name:        { type:'string' },
            slug:        { type:'string' },
            description: { type:'string' },
            created_at:  { type:'string', format:'date-time' },
          },
        },
        CategoryInput: {
          type:'object', required:['name'],
          properties: {
            name:        { type:'string', minLength:2, maxLength:100, example:'Technology' },
            description: { type:'string', example:'Tech-related posts' },
          },
        },
        // ── Shared ────────────────────────────────────────
        Pagination: {
          type:'object',
          properties: {
            page:       { type:'integer' },
            limit:      { type:'integer' },
            total:      { type:'integer' },
            totalPages: { type:'integer' },
            hasNext:    { type:'boolean' },
            hasPrev:    { type:'boolean' },
          },
        },
        Error: {
          type:'object',
          properties: {
            success: { type:'boolean', example:false },
            message: { type:'string' },
            errors:  { type:'array', items:{ type:'object' } },
          },
        },
      },
      responses: {
        Unauthorised: {
          description:'Unauthorised — missing or invalid JWT',
          content:{ 'application/json':{ schema:{ $ref:'#/components/schemas/Error' } } },
        },
        Forbidden: {
          description:'Forbidden — insufficient permissions',
          content:{ 'application/json':{ schema:{ $ref:'#/components/schemas/Error' } } },
        },
        NotFound: {
          description:'Resource not found',
          content:{ 'application/json':{ schema:{ $ref:'#/components/schemas/Error' } } },
        },
        ValidationError: {
          description:'Validation failed',
          content:{ 'application/json':{ schema:{ $ref:'#/components/schemas/Error' } } },
        },
        RateLimited: {
          description:'Too many requests',
          content:{ 'application/json':{ schema:{ $ref:'#/components/schemas/Error' } } },
        },
      },
    },
    tags: [
      { name:'Auth',       description:'Register, login, token refresh, logout' },
      { name:'Users',      description:'User management (admin)' },
      { name:'Posts',      description:'Blog post CRUD' },
      { name:'Categories', description:'Post category management' },
      { name:'Health',     description:'API health and status endpoints' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
