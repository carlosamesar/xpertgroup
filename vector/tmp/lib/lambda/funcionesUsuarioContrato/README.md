# Usuario Contrato Lambda Functions

This module contains Lambda functions for managing user-contract relationships in the PAI system.

## Table Structure: RK_PAI_USUARIO_CONTRATO_DEV

### Primary Key Structure
- **PK**: `USUARIO#{id_usuario}` - Partition key based on user ID
- **SK**: `CONTRATO_USUARIO#{id_origen}#{id_contrato}` - Sort key combining origin and contract

### GSI5 Structure (Contract-based queries)
- **gsi5pk**: `CONTRATO#{id_contrato}` - Query by contract
- **gsi5sk**: `USUARIO#{id_usuario}` - Sort by user

### Attributes
- `id_usuario` (string): User identifier
- `id_origen` (string): Origin/source identifier
- `id_contrato` (string): Contract identifier
- `id_ciclo` (string): Cycle identifier
- `id_participante` (string): Participant identifier
- `token_participante` (string): Participant token
- `fecha_creacion` (string): Creation timestamp (ISO format)
- `fecha_actualizacion` (string): Last update timestamp (ISO format)

## Lambda Functions

### 1. fnPaiUsuarioContratoGet
**Purpose**: Retrieve user-contract relationships

**Endpoints**:
- `GET /usuario-contrato` - Get all user-contracts (with pagination)
- `GET /usuario-contrato/{id_usuario}` - Get contracts for a specific user
- `GET /usuario-contrato/{id_usuario}/{id_origen}/{id_contrato}` - Get specific user-contract
- `GET /usuario-contrato?contrato={id_contrato}` - Get users for a specific contract (uses GSI5)

**Query Parameters**:
- `limit` (optional): Number of items to return (default: 50, max: 100)
- `lastEvaluatedKey` (optional): For pagination
- `contrato` (optional): Filter by contract ID

### 2. fnPaiUsuarioContratoPost
**Purpose**: Create new user-contract relationships

**Endpoint**: `POST /usuario-contrato`

**Request Body**:
```json
{
  "id_usuario": "string",
  "id_origen": "string", 
  "id_contrato": "string",
  "id_ciclo": "string",
  "id_participante": "string",
  "token_participante": "string"
}
```

### 3. fnPaiUsuarioContratoPut
**Purpose**: Update existing user-contract relationships

**Endpoint**: `PUT /usuario-contrato/{id_usuario}/{id_origen}/{id_contrato}`

**Request Body** (partial update supported):
```json
{
  "id_ciclo": "string",
  "id_participante": "string", 
  "token_participante": "string"
}
```

### 4. fnPaiUsuarioContratoDelete
**Purpose**: Remove user-contract relationships

**Endpoint**: `DELETE /usuario-contrato/{id_usuario}/{id_origen}/{id_contrato}`

## Authentication

All endpoints require JWT authentication via Cognito:
- Header: `Authentication: Bearer <jwt_token>`
- The token is validated against the configured Cognito User Pool

## Validation

### Input Validation
- All required fields are validated for presence and format
- String fields are trimmed and checked for minimum length
- Composite keys are validated for proper format

### Key Generation
- PK: `USUARIO#{id_usuario}`
- SK: `CONTRATO_USUARIO#{id_origen}#{id_contrato}`
- GSI5PK: `CONTRATO#{id_contrato}`
- GSI5SK: `USUARIO#{id_usuario}`

## Error Handling

Standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `409` - Conflict (item already exists)
- `500` - Internal Server Error

## Usage Examples

### Create User-Contract
```bash
POST /usuario-contrato
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "id_usuario": "user123",
  "id_origen": "web",
  "id_contrato": "contract456", 
  "id_ciclo": "2024-Q1",
  "id_participante": "participant789",
  "token_participante": "token_abc123"
}
```

### Get User's Contracts
```bash
GET /usuario-contrato/user123
Authorization: Bearer <jwt_token>
```

### Get Contract's Users
```bash
GET /usuario-contrato?contrato=contract456
Authorization: Bearer <jwt_token>
```

### Update User-Contract
```bash
PUT /usuario-contrato/user123/web/contract456
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "id_ciclo": "2024-Q2",
  "token_participante": "new_token_xyz789"
}
```

### Delete User-Contract
```bash
DELETE /usuario-contrato/user123/web/contract456
Authorization: Bearer <jwt_token>
```

## Architecture

The functions follow Clean Code principles with:
- **Separation of Concerns**: Authentication, validation, and business logic are separated
- **Utility Modules**: Reusable utilities for auth, validation, and responses
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Input Validation**: Strict validation of all inputs
- **Security**: JWT token validation for all operations

## Dependencies

- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/util-dynamodb` - DynamoDB utilities
- Environment variables for table name and user pool configuration
