# AWS Lambda para RK_PAI_CATALOGO_PERIODOS_DEV - Operación POST

Este documento describe la funcionalidad y los detalles de implementación de la función AWS Lambda diseñada para manejar la inserción de nuevos datos de periodo en la tabla DynamoDB `RK_PAI_CATALOGO_PERIODOS_DEV`.

## 1. AWS Lambda y Mejores Prácticas

La función Lambda está desarrollada en Node.js con TypeScript (aunque el ejemplo proporcionado está en JavaScript para `index.mjs`) y se adhiere a las mejores prácticas de AWS:

*   **Principio de Responsabilidad Única**: La función Lambda es responsable únicamente de crear nuevas entradas de periodo.
*   **Variables de Entorno**: El nombre de la tabla DynamoDB (`TABLE_NAME`) se configura mediante variables de entorno, lo que permite usar diferentes tablas en diferentes entornos (desarrollo, staging, producción) sin cambios en el código.
*   **Permisos IAM**: El rol de ejecución de Lambda debe tener los permisos mínimos necesarios (es decir, `dynamodb:PutItem` sobre la tabla específica).
*   **Registro (Logging)**: La función utiliza `console.log` y `console.error` para un registro estructurado, que se integra con Amazon CloudWatch Logs para monitoreo y depuración.
*   **Manejo de Errores**: La función incluye bloques try-catch para un manejo robusto de errores, devolviendo códigos de estado HTTP y mensajes de error apropiados.
*   **Dependencias**: Utiliza el AWS SDK v3 para JavaScript, que es modular y puede ayudar a reducir el tamaño del paquete de implementación de Lambda.

## 2. Definición de la Solicitud (Objeto JSON)

La función Lambda espera un objeto JSON en el cuerpo de la solicitud con la siguiente estructura:

```json
{
  "periodo": "AAAA-MM",
  "actual": "0" | "1",
  "nombre_periodo": "Cadena"
}
```

*   `periodo`: (Cadena) El valor del periodo en formato "AAAA-MM" (ej., "2019-09"). Se utilizará en los atributos `_sk` y `valor_periodo`.
*   `actual`: (Cadena) Un indicador de si el periodo es el actual. "0" para no, "1" para sí. Esto se asigna al atributo `actual_flag`.
*   `nombre_periodo`: (Cadena) Un nombre descriptivo para el periodo (ej., "Septiembre/2019"). Esto se asigna al atributo `nombre_periodo_display`.

## 3. Validación de Propiedades de la Solicitud (Tipos de Datos y Vulnerabilidades)

Antes del procesamiento, se validan las propiedades de la solicitud entrante:

*   `periodo`:
    *   Debe existir.
    *   Debe ser una cadena.
    *   Debe coincidir con la expresión regular ` /^\d{4}-\d{2}$/` (formato AAAA-MM).
*   `actual`:
    *   Debe existir.
    *   Debe ser una cadena.
    *   Debe ser "0" o "1".
*   `nombre_periodo`:
    *   Debe existir.
    *   Debe ser una cadena.
    *   No debe ser una cadena vacía después de eliminar los espacios en blanco.

Si alguna validación falla, la función devuelve un código de estado HTTP `400 Bad Request` con un mensaje de error descriptivo.

## 4. Validación de Propiedades de la Solicitud (Inyección SQL - Sanitización de Entradas)

Aunque DynamoDB es una base de datos NoSQL y no es susceptible a la inyección SQL tradicional, sigue siendo crucial sanitizar las entradas para prevenir otras formas de inyección o corrupción de datos, especialmente si estos valores pudieran usarse en otros contextos o consultas que podrían ser vulnerables (ej., construcción de expresiones de filtro, o si los datos alguna vez se mueven a una BD SQL).

La implementación actual realiza una sanitización básica eliminando caracteres potencialmente dañinos (`<`, `>`, `'`, `"`, `&`) de las entradas de cadena (`periodo`, `nombre_periodo`).

```javascript
const sanitizedPeriodo = periodo.replace(/[<>'"&]/g, '');
const sanitizedNombrePeriodo = nombre_periodo.replace(/[<>'"&]/g, '');
```

Para una sanitización más robusta en entornos de producción, considere usar bibliotecas bien probadas.

## 5. Integración con DynamoDB (Operación de Inserción)

La función se integra con DynamoDB para insertar un nuevo ítem. La estructura del ítem se basa en el esquema `.dbml` proporcionado:

*   **Nombre de la Tabla**: Se recupera de la variable de entorno `TABLE_NAME`.
*   **Clave Primaria**:
    *   `_pk`: Codificada como `"CATALOGO#PERIODOS"`.
    *   `_sk`: Construida como `"PERIODO#<valor_periodo>"` (ej., `"PERIODO#2019-09"`).
*   **Atributos**:
    *   `valor_periodo`: El `periodo` sanitizado de la solicitud.
    *   `actual_flag`: El valor `actual` sanitizado de la solicitud.
    *   `nombre_periodo_display`: El `nombre_periodo` sanitizado de la solicitud.
    *   `item_type`: Por defecto `"PAI_CATALOGO_PERIODOS_DEV"` según el esquema.

Se utiliza `PutCommand` de `@aws-sdk/lib-dynamodb` para la operación de inserción.

Se usa una `ConditionExpression` (`"attribute_not_exists(_pk) AND attribute_not_exists(_sk)"`) para evitar sobrescribir un ítem existente con la misma clave primaria. Si la condición falla (el ítem ya existe), DynamoDB lanzará una `ConditionalCheckFailedException`.

## 6. Flujo de Respuesta (Operación de Inserción)

La función Lambda proporciona las siguientes respuestas HTTP:

*   **201 Created**: Si el ítem se crea con éxito en DynamoDB.
    ```json
    {
      "message": "Periodo creado exitosamente.",
      "item": { /* ...el ítem creado... */ }
    }
    ```
*   **400 Bad Request**: Si el cuerpo de la solicitud no es un JSON válido o si falla alguna validación de las propiedades de entrada.
    ```json
    {
      "message": "Formato JSON inválido en el cuerpo de la solicitud."
    }
    ```
    o
    ```json
    {
      "message": "Formato de 'periodo' inválido. Se esperaba una cadena AAAA-MM."
    }
    ```
    (Mensajes similares para otras fallas de validación)
*   **409 Conflict**: Si ya existe un ítem con el mismo `_pk` y `_sk` en DynamoDB (debido a la `ConditionExpression`).
    ```json
    {
      "message": "El periodo ya existe."
    }
    ```
*   **500 Internal Server Error**: Si ocurre cualquier otro error inesperado durante el procesamiento (ej., problemas de comunicación con DynamoDB no relacionados con verificaciones condicionales).
    ```json
    {
      "message": "Fallo al crear el periodo.",
      "error": "Mensaje de error real del SDK o sistema"
    }
    ```

## 7. Validación, Optimización y Automatización

*   **Validación**: Como se describe en las secciones 3 y 4.
*   **Optimización**:
    *   **AWS SDK v3**: Usar el AWS SDK v3 modular ayuda a mantener pequeño el paquete de implementación.
    *   **Arranques en Frío (Cold Starts)**: Aunque no se aborda explícitamente en esta única función, para un conjunto de Lambdas, considere la concurrencia aprovisionada para funciones sensibles a la latencia o técnicas como el "calentamiento" (warming).
    *   **Inicialización del Cliente DynamoDB**: `DynamoDBClient` y `DynamoDBDocumentClient` se inicializan fuera de la función handler para ser reutilizados en invocaciones dentro del mismo entorno de ejecución, mejorando el rendimiento.
*   **Automatización (Generación de Código/Despliegue)**:
    *   Esta función Lambda es típicamente parte de una configuración más grande de Infraestructura como Código (IaC), probablemente usando AWS CDK, AWS SAM, Serverless Framework o Terraform.
    *   La estructura `cdk-apisvector-pai` sugiere que se está utilizando AWS CDK. El script CDK (`lib/cdk-apisvector-pai-stack.ts`) definiría la función Lambda, sus variables de entorno (como `TABLE_NAME`), el rol IAM y la integración con API Gateway.
    *   Los pipelines de CI/CD (ej., AWS CodePipeline, GitHub Actions, Jenkins) automatizarían las pruebas, la construcción y el despliegue de la Lambda y la infraestructura relacionada.

## 8. Archivo README

Este documento sirve como README para la operación POST de esta función Lambda específica.

## Configuración y Despliegue (Conceptual - asumiendo AWS CDK)

1.  **Definir Tabla en CDK**: Asegúrese de que la tabla DynamoDB `RK_PAI_CATALOGO_PERIODOS_DEV` esté definida en su stack de CDK.
    ```typescript
    // En cdk-apisvector-pai-stack.ts
    const periodosTable = new dynamodb.Table(this, 'PeriodosCatalogoTable', {
      tableName: 'RK_PAI_CATALOGO_PERIODOS_DEV',
      partitionKey: { name: '_pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: '_sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Ajustar para producción
    });
    ```

2.  **Definir Lambda en CDK**: Defina la función Lambda en `cdk-apisvector-pai-stack.ts`.
    ```typescript
    // En cdk-apisvector-pai-stack.ts
    const fnPaiOprPost = new lambda.Function(this, 'FnPaiOprPost', {
      runtime: lambda.Runtime.NODEJS_18_X, // O su tiempo de ejecución preferido
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/lambda/funcionesOperaciones/fnPaiOprPost'),
      environment: {
        TABLE_NAME: periodosTable.tableName,
      },
    });
    ```

3.  **Otorgar Permisos**: Otorgue permisos a la función Lambda para escribir en la tabla.
    ```typescript
    // En cdk-apisvector-pai-stack.ts
    periodosTable.grantWriteData(fnPaiOprPost);
    ```

4.  **Integración con API Gateway**: Si esta Lambda se activa a través de API Gateway, defina la integración en el stack de CDK (ej., dentro de `lib/apiGateway/ApiOperacion.ts` si es allí donde se gestionan los recursos de API Gateway).

5.  **Instalar Dependencias**: Asegúrese de que `@aws-sdk/client-dynamodb` y `@aws-sdk/lib-dynamodb` estén en el `package.json` relevante para esta Lambda (ej., una capa compartida o empaquetada con la función).
    Si usa capas, el `package.json` podría estar en `lib/lambda/funcionesOperaciones/layers/nodejs/package.json` o una ubicación compartida similar.
    ```bash
    npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
    ```

6.  **Desplegar**: Use el CLI de CDK para desplegar el stack.
    ```bash
    cdk deploy
    ```

Esto proporciona una visión general completa de la función Lambda para la operación de inserción.
