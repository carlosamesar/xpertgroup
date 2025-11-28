# Plantilla de AWS Lambda para Operaciones CRUD Genéricas en DynamoDB

Este documento describe una plantilla base para una función AWS Lambda en Node.js, diseñada para realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) de forma genérica en diferentes tablas de Amazon DynamoDB. Está pensada para ser utilizada como punto de partida para desarrollar Lambdas específicas de manera automatizada, optimizada y configurable.

## Propósito

El objetivo de esta plantilla es proporcionar una estructura común y reutilizable que incluya:
- Integración con AWS SDK v3 para DynamoDB.
- Manejo avanzado de variables de entorno para configuración dinámica de la tabla y sus claves.
- Procesamiento básico de eventos de API Gateway (método HTTP, cuerpo, parámetros).
- Un esqueleto para la validación de entradas, adaptable a diferentes esquemas de datos.
- Ejemplos de comandos de DynamoDB para operaciones POST, GET, PUT y DELETE, parametrizados mediante las variables de entorno.
- Manejo de errores y respuestas HTTP estandarizadas.

## Cómo Usar Esta Plantilla para Diferentes Tablas

La flexibilidad de esta plantilla para interactuar con diversas tablas de DynamoDB radica en su configuración a través de variables de entorno y la personalización de la lógica interna.

1.  **Copiar y Renombrar**:
    *   Copie el directorio completo de esta plantilla (`templateLambda/`) a una nueva ubicación para su nueva función Lambda (ej., `lib/lambda/funcionesMiEntidad/` o `lib/lambda/operacionesTablaX/`).
    *   Renombre el directorio para que refleje la entidad o tabla específica con la que trabajará.

2.  **Configuración de Variables de Entorno (Clave para la Flexibilidad)**:
    *   Al definir su función Lambda (por ejemplo, en su stack de AWS CDK, SAM o Serverless Framework), configure las siguientes variables de entorno:
        *   `TABLE_NAME`: **Obligatorio**. El nombre exacto de la tabla DynamoDB con la que esta instancia de la Lambda interactuará.
        *   `PRIMARY_KEY_NAME`: **Obligatorio**. El nombre del atributo que funciona como la clave de partición (PK) en su tabla. Por defecto, la plantilla usa `_pk`.
        *   `SORT_KEY_NAME`: **Opcional**. El nombre del atributo que funciona como la clave de ordenamiento (SK) en su tabla. Si su tabla solo tiene una clave de partición, puede omitir esta variable o la plantilla la manejará adecuadamente (asegúrese de que la lógica en `index.mjs` no intente usarla si no se provee y no es necesaria para la tabla). Por defecto, la plantilla usa `_sk`.
    *   **Ejemplo (AWS CDK - `cdk-apisvector-pai-stack.ts`)**:
        ```typescript
        // ... en la definición de tu Lambda
        environment: {
          TABLE_NAME: 'MiTablaEspecifica', // Nombre de la tabla para esta Lambda
          PRIMARY_KEY_NAME: 'idUsuario',    // Nombre de la PK de MiTablaEspecifica
          SORT_KEY_NAME: 'tipoDato'       // Nombre de la SK de MiTablaEspecifica (si existe)
        }
        // ...
        ```

3.  **Personalizar `index.mjs` para la Tabla Específica**:
    *   **Validación de Entradas (`// 1. INPUT VALIDATION`)**: Esta es la sección más crítica para adaptar. La estructura de los datos (`requestBody.data`) variará significativamente entre tablas. Implemente una lógica de validación robusta que corresponda al esquema de `TABLE_NAME`.
        *   Para `POST` y `PUT`, valide los atributos esperados, sus tipos, formatos y si son obligatorios.
        *   Para `GET` y `DELETE`, asegúrese de que los identificadores necesarios (generalmente provenientes de `pathParameters` o `queryStringParameters`) se proporcionan y tienen el formato correcto para construir las claves de su tabla.
    *   **Lógica de Construcción de Claves (Sección `// 2. DETERMINE OPERATION & INTERACT WITH DYNAMODB`)**:
        *   **`POST` (Creación)**:
            *   La plantilla genera un `[primaryKeyName]` y `[sortKeyName]` de ejemplo (ej., `ITEM#${Date.now()}`). **Debe** modificar esto para que se alinee con la estrategia de claves de su tabla. Por ejemplo, si `primaryKeyName` es `idUsuario` y `sortKeyName` es `pedidoId`, deberá obtener o generar estos valores de manera apropiada.
            *   Asegúrese de que `requestBody.data` contenga todos los atributos necesarios para un nuevo ítem en `TABLE_NAME`.
            *   Ajuste o elimine el atributo `item_type` si no es relevante para su tabla.
        *   **`GET`, `PUT`, `DELETE` (Lectura, Actualización, Eliminación)**:
            *   La plantilla usa `pathParameters.id` o `queryStringParameters.id` como un placeholder para el identificador del ítem. Necesitará adaptar cómo se extraen los componentes de la clave.
            *   La construcción de la `Key` para DynamoDB es crucial:
                ```javascript
                // Ejemplo para GET
                command = new GetCommand({
                  TableName: tableName, // Ya configurado por la variable de entorno
                  Key: {
                    [primaryKeyName]: \`VALOR_PK_PARA_\${getItemId}\`, // TODO: Construya el valor real de PK
                    // [sortKeyName]: \`VALOR_SK_PARA_\${getItemId}\` // TODO: Construya el valor real de SK (si aplica)
                  },
                });
                ```
                Reemplace `VALOR_PK_PARA_${getItemId}` y `VALOR_SK_PARA_${getItemId}` con la lógica correcta para formar los valores de clave basados en los parámetros de entrada y el esquema de `TABLE_NAME`. Si su tabla no tiene `sortKeyName`, elimine esa línea del objeto `Key`.
    *   **Lógica de Actualización (`PUT`)**:
        *   La plantilla usa `PutCommand` para un reemplazo completo del ítem. Si necesita actualizaciones parciales (modificar solo algunos atributos sin afectar otros), debe cambiar a `UpdateCommand` y construir los parámetros `UpdateExpression`, `ExpressionAttributeNames`, y `ExpressionAttributeValues` según los datos en `requestBody.data` y el esquema de la tabla.
    *   **Sanitización de Entradas**: Siempre sanitice las entradas del usuario antes de usarlas en operaciones de base de datos o al construir respuestas, para prevenir vulnerabilidades.

4.  **Personalizar `README.md` (Este Archivo)**:
    *   Una vez que haya adaptado la plantilla para una tabla específica, actualice el README de *esa nueva Lambda* para documentar su comportamiento exacto, los parámetros de entrada esperados para esa tabla, la estructura de la clave, y cualquier otra consideración relevante para *esa implementación particular*.

5.  **Configuración de Permisos IAM**:
    *   El rol de ejecución de la Lambda debe tener los permisos de DynamoDB necesarios para la `TABLE_NAME` configurada. Como mínimo: `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:DeleteItem`. Si usa `UpdateCommand`, necesitará `dynamodb:UpdateItem`. Si planea usar `QueryCommand` o `ScanCommand` (ver "Consideraciones Adicionales"), añada `dynamodb:Query` y/o `dynamodb:Scan` respectivamente.
    *   Es una buena práctica seguir el principio de mínimo privilegio, otorgando permisos solo a la tabla específica (`arn:aws:dynamodb:REGION:ACCOUNT_ID:table/MiTablaEspecifica`).

6.  **Despliegue**:
    *   Despliegue su nueva función Lambda (configurada con las variables de entorno correctas para la tabla deseada) utilizando su método preferido (AWS CDK, SAM, Serverless Framework, Consola de AWS). Puede desplegar múltiples instancias de esta plantilla, cada una configurada para una tabla diferente.

## Estructura del Código (`index.mjs`)

-   **Importaciones**: AWS SDK v3 para DynamoDB.
-   **Inicialización del Cliente**: `DynamoDBClient` y `DynamoDBDocumentClient` se inicializan fuera del handler para reutilización.
-   **Variables de Entorno**: `TABLE_NAME`, `PRIMARY_KEY_NAME`, `SORT_KEY_NAME`.
-   **Handler `async (event)`**:
    *   Registro del evento.
    *   Extracción de `httpMethod`, `requestBody`, `pathParameters`, `queryStringParameters`.
    *   Bloque `try...catch` principal para manejo de errores.
    *   Sección para **Validación de Entradas** (marcada con `// TODO`).
    *   Estructura `switch (httpMethod)` para manejar:
        *   `POST`: Creación de un nuevo ítem (ejemplo con `PutCommand`).
        *   `GET`: Lectura de un ítem (ejemplo con `GetCommand`).
        *   `PUT`: Actualización de un ítem (ejemplo con `PutCommand`, considerar `UpdateCommand`).
        *   `DELETE`: Eliminación de un ítem (ejemplo con `DeleteCommand`).
    *   Respuesta por defecto para métodos no soportados.
    *   Manejo de errores específicos como `ConditionalCheckFailedException` y errores genéricos.

## Consideraciones Adicionales

*   **Seguridad**: Implemente una autenticación y autorización adecuadas para su API Gateway si esta Lambda es expuesta públicamente.
*   **Optimización**:
    *   Para operaciones de lectura que no requieren consistencia fuerte, considere usar `ConsistentRead: false`.
    *   Si necesita consultar por atributos que no son la clave primaria, use `QueryCommand` (con índices secundarios globales o locales) o `ScanCommand` (con precaución, ya que puede ser ineficiente en tablas grandes). La plantilla incluye la importación de estos comandos como referencia.
*   **Pruebas**: Escriba pruebas unitarias e de integración para su Lambda.

Esta plantilla busca acelerar el desarrollo de funciones Lambda CRUD, promoviendo una estructura consistente y la adhesión a buenas prácticas.
