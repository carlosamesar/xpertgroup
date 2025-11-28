# DynamoDB Single Table Design - GSI Documentation

## Tabla Principal: `RK_PAI_SINGLE_TABLE_DEV`

### Claves Principales
- **PK**: `_pk` (STRING) - Partition Key genérica
- **SK**: `_sk` (STRING) - Sort Key genérica

## Global Secondary Indexes (GSIs)

### GSI1 - IndiceEmail
**Propósito**: Búsqueda de usuarios por email
- **PK**: `GSI1PK` = `EMAIL#{email}`
- **SK**: `GSI1SK` = `_pk` (USUARIO#{id_usuario})
- **Proyección**: ALL
- **Uso**: Autenticación, búsqueda de usuarios por email

### GSI2 - IndiceDispositivo
**Propósito**: Búsqueda por dispositivo
- **PK**: `GSI2PK` = `DISP#{id_disp}`
- **SK**: `GSI2SK` = `_pk` (USUARIO#{id_usuario})
- **Proyección**: ALL
- **Uso**: Gestión de dispositivos, seguridad

### GSI3 - IndicePerfilUsuario
**Propósito**: Búsqueda de usuarios por perfil
- **PK**: `GSI3PK` = `PERFIL#{id_perfil}`
- **SK**: `GSI3SK` = `_pk` (USUARIO#{id_usuario})
- **Proyección**: ALL
- **Uso**: Gestión de perfiles, permisos por rol

### GSI5 - IndiceContratoUsuario
**Propósito**: Búsqueda de usuarios por contrato
- **PK**: `GSI5PK` = `CONTRATO_USUARIO#{id_origen}#{id_contrato}`
- **SK**: `GSI5SK` = `_pk` (USUARIO#{id_usuario})
- **Proyección**: ALL
- **Uso**: Gestión de participantes por contrato

### GSI6 - IndiceConfigPorOrigenContrato
**Propósito**: Configuraciones por origen y contrato
- **PK**: `GSI6PK` = `ORIGEN#{id_origen}#CONTRATO#{id_contrato}`
- **SK**: `GSI6SK` = `_pk` (CONF_GRUPO_CONTRATO#{id_grupo})
- **Proyección**: ALL
- **Uso**: Configuraciones específicas por contrato

### GSI7 - IndiceCatContratoPorOrigenIdContrato
**Propósito**: Contratos por origen
- **PK**: `GSI7PK` = `ORIGEN#{id_origen}#ID_CONTRATO#{id_contrato}`
- **SK**: `GSI7SK` = `_pk` (CAT_CONTRATO#{id_empresa})
- **Proyección**: ALL
- **Uso**: Listado de contratos por origen, filtrado

### GSI8 - IndiceCatCicloPorOrigenContrato
**Propósito**: Ciclos por origen y contrato
- **PK**: `GSI8PK` = `ORIGEN#{id_origen}#ID_CONTRATO#{id_contrato}`
- **SK**: `GSI8SK` = `_pk` (CAT_CONTRATO_CICLO#{id_ciclo})
- **Proyección**: ALL
- **Uso**: Gestión de ciclos por contrato específico

### GSI9 - IndiceModuloPerfil
**Propósito**: Módulos por perfil
- **PK**: `GSI9PK` = `CAT_MODULO#{id_modulo}`
- **SK**: `GSI9SK` = `_pk` (CAT_PERFIL#{id_perfil})
- **Proyección**: ALL
- **Uso**: Permisos de módulos por perfil

### GSI10 - IndiceServicioPerfil
**Propósito**: Servicios por perfil
- **PK**: `GSI10PK` = `CAT_SERVICIO#{id_servicio}`
- **SK**: `GSI10SK` = `_pk` (CAT_PERFIL#{id_perfil})
- **Proyección**: ALL
- **Uso**: Permisos de servicios por perfil

### GSI11 - IndiceUsuarioGrupos
**Propósito**: Grupos por usuario
- **PK**: `GSI11PK` = `USUARIO#{id_usuario}`
- **SK**: `GSI11SK` = `_pk` (GRUPO#{id_grupo})
- **Proyección**: ALL
- **Uso**: Gestión de membresías de grupo

### GSI13 - IndiceDashConfParamsPorParametro
**Propósito**: Parámetros de dashboard
- **PK**: `GSI13PK` = `PARAMETRO#{id_parametro}`
- **SK**: `GSI13SK` = `_pk` (DASHB_CONF_PARAMS#{id_dashparam})
- **Proyección**: ALL
- **Uso**: Configuración de dashboards

### GSI14 - IndiceBitacoraPorElemento
**Propósito**: Bitácora por elemento
- **PK**: `GSI14PK` = `ELEMENTO#{id_elemento}`
- **SK**: `GSI14SK` = `_sk` (LOG#{timestamp}#{id_bitacora})
- **Proyección**: ALL
- **Uso**: Auditoría, logs por elemento específico

## Patrones de Consulta Comunes

### 1. Autenticación de Usuario
```javascript
// Buscar usuario por email
const params = {
  IndexName: 'GSI1-IndiceEmail',
  KeyConditionExpression: 'GSI1PK = :email',
  ExpressionAttributeValues: {
    ':email': `EMAIL#${userEmail}`
  }
};
```

### 2. Usuarios de un Contrato
```javascript
// Obtener todos los usuarios de un contrato
const params = {
  IndexName: 'GSI5-IndiceContratoUsuario',
  KeyConditionExpression: 'GSI5PK = :contrato',
  ExpressionAttributeValues: {
    ':contrato': `CONTRATO_USUARIO#${id_origen}#${id_contrato}`
  }
};
```

### 3. Ciclos de un Contrato
```javascript
// Obtener ciclos de un contrato específico
const params = {
  IndexName: 'GSI8-IndiceCatCicloPorOrigenContrato',
  KeyConditionExpression: 'GSI8PK = :origen_contrato',
  ExpressionAttributeValues: {
    ':origen_contrato': `ORIGEN#${id_origen}#ID_CONTRATO#${id_contrato}`
  }
};
```

### 4. Contratos por Origen
```javascript
// Obtener contratos por origen
const params = {
  IndexName: 'GSI7-IndiceCatContratoPorOrigenIdContrato',
  KeyConditionExpression: 'begins_with(GSI7PK, :origen)',
  ExpressionAttributeValues: {
    ':origen': `ORIGEN#${id_origen}#`
  }
};
```

## Entidades y sus Patrones PK/SK

### Usuarios
- **PK**: `USUARIO#{id_usuario}`
- **SK**: `METADATA` (datos principales)
- **SK**: `PERFIL#{id_perfil}` (relaciones perfil-usuario)
- **SK**: `CONTRATO_USUARIO#{id_origen}#{id_contrato}` (relaciones contrato-usuario)

### Catálogos
- **PK**: `CAT_ORIGEN#{id_origen}` | **SK**: `METADATA`
- **PK**: `CAT_GRUPO#{id_grupo}` | **SK**: `METADATA`
- **PK**: `CAT_CONTRATO#{id_empresa}` | **SK**: `METADATA`
- **PK**: `CAT_CONTRATO_CICLO#{id_ciclo}` | **SK**: `METADATA`
- **PK**: `CAT_PERFIL#{id_perfil}` | **SK**: `METADATA`
- **PK**: `CAT_MODULO#{id_modulo}` | **SK**: `METADATA`
- **PK**: `CAT_SERVICIO#{id_servicio}` | **SK**: `METADATA`

### Configuraciones
- **PK**: `CONF_GRUPO_CONTRATO#{id_grupo}` | **SK**: `METADATA`
- **PK**: `CAT_PERFIL#{id_perfil}` | **SK**: `CAT_MODULO#{id_modulo}`
- **PK**: `CAT_PERFIL#{id_perfil}` | **SK**: `CAT_SERVICIO#{id_servicio}`

### Bitácora
- **PK**: `USUARIO#{id_usuario}` | **SK**: `LOG#{timestamp}#{id_bitacora}`

### Datos de Participantes
- **PK**: `USUARIO#{TokenParticipante}` | **SK**: `ESTADOCUENTA#{Periodo}`
- **PK**: `USUARIO#{TokenParticipante}` | **SK**: `RETIRO#{FechaRetiroISO}`

## Consideraciones de Rendimiento

1. **Distribución de Carga**: Los PK están diseñados para distribuir uniformemente la carga
2. **Hot Partitions**: Evitar consultas que concentren tráfico en una sola partición
3. **Proyección ALL**: Se usa en todos los GSIs para flexibilidad, considerar optimizar en producción
4. **Límites de DynamoDB**: Máximo 20 GSIs por tabla (actualmente usando 10)
5. **Costos**: Cada GSI replica los datos, considerar solo GSIs necesarios en producción

## Estrategias de Optimización

1. **Proyección Selectiva**: En producción, cambiar de ALL a KEYS_ONLY o INCLUDE según necesidades
2. **TTL**: Implementar Time To Live para datos temporales como logs
3. **Streams**: Considerar DynamoDB Streams para replicación y procesamiento asíncrono
4. **Backup**: Configurar backups automáticos para datos críticos
5. **Monitoring**: Implementar CloudWatch métricas personalizadas para monitoreo

---

Este diseño soporta todos los patrones de consulta identificados en el sistema PAI manteniendo un single table design eficiente.
