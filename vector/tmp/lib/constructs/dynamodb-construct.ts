import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy, Tags } from 'aws-cdk-lib';

/**
 * Construct para crear recursos de DynamoDB para PAI App
 * Crea tablas individuales para cada entidad según el schema DBML
 * Incluye todos los GSIs necesarios para los patrones de consulta
 */
export class DynamoDBConstruct extends Construct {
  // Tablas principales del usuario
  public readonly usuarioTable: dynamodb.Table;
  public readonly usuarioPerfilTable: dynamodb.Table;
  public readonly adminContratoTable: dynamodb.Table;
  public readonly usuarioContratoTable: dynamodb.Table;
  public readonly contratoTable: dynamodb.Table;
  public readonly contratoCicloTable: dynamodb.Table;

  // Tablas de configuración
  public readonly confGrupoContratoTable: dynamodb.Table;
  public readonly confPerfilModuloTable: dynamodb.Table;
  public readonly confPerfilServicioTable: dynamodb.Table;
  public readonly confContratoParametrosTable: dynamodb.Table;
  public readonly confParametrosTable: dynamodb.Table;
  public readonly confContratoServiciosTable: dynamodb.Table;

  // Tablas de catálogos
  public readonly catOrigenTable: dynamodb.Table;
  public readonly catGrupoTable: dynamodb.Table;
  public readonly catBlkMotivoTable: dynamodb.Table;
  public readonly catEstatusTable: dynamodb.Table;
  public readonly catPerfilTable: dynamodb.Table;
  public readonly catModuloTable: dynamodb.Table;
  public readonly catServicioTable: dynamodb.Table;
  public readonly catElementoTable: dynamodb.Table;
  public readonly catTipoParametroTable: dynamodb.Table;

  // Tablas de datos del participante
  public readonly contratoPeriodosTable: dynamodb.Table;
  public readonly participanteDataTable: dynamodb.Table;
  public readonly participanteRetiroTable: dynamodb.Table;
  public readonly participantePrestamoTable: dynamodb.Table;

  // Tabla de bitácora
  public readonly bitacoraTable: dynamodb.Table;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // === TABLAS PRINCIPALES DEL USUARIO ===
    
    // Tabla de Usuarios
    this.usuarioTable = new dynamodb.Table(this, 'RK_PAI_USUARIO_DEV', {
      tableName: 'RK_PAI_USUARIO_DEV',
      partitionKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por email
    this.usuarioTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceEmail',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // GSI para búsqueda por contrasena
    this.usuarioTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceContrasena',
      partitionKey: {
        name: 'contrasena',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // GSI para búsqueda por dispositivo
    this.usuarioTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceDispositivo',
      partitionKey: {
        name: 'id_disp',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Usuario-Perfil (relación muchos a muchos)
    this.usuarioPerfilTable = new dynamodb.Table(this, 'RK_PAI_USUARIO_PERFIL_DEV', {
      tableName: 'RK_PAI_USUARIO_PERFIL_DEV',
      partitionKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por perfil
    this.usuarioPerfilTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndicePerfilUsuario',
      partitionKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Admin Contrato
    this.adminContratoTable = new dynamodb.Table(this, 'RK_PAI_ADMIN_CONTRATO_DEV', {
      tableName: 'RK_PAI_ADMIN_CONTRATO_DEV',
      partitionKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'contrato_key', // id_origen#id_contrato
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla de Usuario-Contrato
    this.usuarioContratoTable = new dynamodb.Table(this, 'RK_PAI_USUARIO_CONTRATO_DEV', {
      tableName: 'RK_PAI_USUARIO_CONTRATO_DEV',
      partitionKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'contrato_key', // id_origen#id_contrato
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por contrato
    this.usuarioContratoTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceContratoUsuario',
      partitionKey: {
        name: 'contrato_key',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Contratos
    this.contratoTable = new dynamodb.Table(this, 'RK_PAI_CONTRATO_DEV', {
      tableName: 'RK_PAI_CONTRATO_DEV',
      partitionKey: {
        name: 'id_empresa',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'id_contrato',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por origen y contrato
    this.contratoTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceCatContratoPorOrigenIdContrato',
      partitionKey: {
        name: 'origen_contrato_key', // id_origen#id_contrato
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Contrato Ciclo
    this.contratoCicloTable = new dynamodb.Table(this, 'RK_PAI_CONTRATO_CICLO_DEV', {
      tableName: 'RK_PAI_CONTRATO_CICLO_DEV',
      partitionKey: {
        name: 'id_ciclo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por origen y contrato
    this.contratoCicloTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceCatCicloPorOrigenContrato',
      partitionKey: {
        name: 'origen_contrato_key', // id_origen#id_contrato
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // === TABLAS DE CONFIGURACIÓN ===

    // Tabla de Configuración Grupo Contrato
    this.confGrupoContratoTable = new dynamodb.Table(this, 'RK_PAI_CONF_GRUPO_CONTRATO_DEV', {
      tableName: 'RK_PAI_CONF_GRUPO_CONTRATO_DEV',
      partitionKey: {
        name: 'id_grupo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por origen y contrato
    this.confGrupoContratoTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceConfigPorOrigenContrato',
      partitionKey: {
        name: 'origen_contrato_key', // id_origen#id_contrato
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Configuración Perfil Módulo
    this.confPerfilModuloTable = new dynamodb.Table(this, 'RK_PAI_CONF_PERFIL_MODULO_DEV', {
      tableName: 'RK_PAI_CONF_PERFIL_MODULO_DEV',
      partitionKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'id_modulo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por módulo
    this.confPerfilModuloTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceModuloPerfil',
      partitionKey: {
        name: 'id_modulo',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Configuración Perfil Servicio
    this.confPerfilServicioTable = new dynamodb.Table(this, 'RK_PAI_CONF_PERFIL_SERVICIO_DEV', {
      tableName: 'RK_PAI_CONF_PERFIL_SERVICIO_DEV',
      partitionKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'id_servicio',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por servicio
    this.confPerfilServicioTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceServicioPerfil',
      partitionKey: {
        name: 'id_servicio',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // === TABLAS DE CATÁLOGOS ===

    // Tabla Catálogo Origen
    this.catOrigenTable = new dynamodb.Table(this, 'RK_PAI_CAT_ORIGEN_DEV', {
      tableName: 'RK_PAI_CAT_ORIGEN_DEV',
      partitionKey: {
        name: 'id_origen',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Grupo
    this.catGrupoTable = new dynamodb.Table(this, 'RK_PAI_CAT_GRUPO_DEV', {
      tableName: 'RK_PAI_CAT_GRUPO_DEV',
      partitionKey: {
        name: 'id_grupo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Bloqueo Motivo
    this.catBlkMotivoTable = new dynamodb.Table(this, 'RK_PAI_CAT_BLK_MOTIVO_DEV', {
      tableName: 'RK_PAI_CAT_BLK_MOTIVO_DEV',
      partitionKey: {
        name: 'id_blk_motivo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Estatus
    this.catEstatusTable = new dynamodb.Table(this, 'RK_PAI_CAT_ESTATUS_DEV', {
      tableName: 'RK_PAI_CAT_ESTATUS_DEV',
      partitionKey: {
        name: 'id_estatus',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Perfil
    this.catPerfilTable = new dynamodb.Table(this, 'RK_PAI_CAT_PERFIL_DEV', {
      tableName: 'RK_PAI_CAT_PERFIL_DEV',
      partitionKey: {
        name: 'id_perfil',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Módulo
    this.catModuloTable = new dynamodb.Table(this, 'RK_PAI_CAT_MODULO_DEV', {
      tableName: 'RK_PAI_CAT_MODULO_DEV',
      partitionKey: {
        name: 'id_modulo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Servicio
    this.catServicioTable = new dynamodb.Table(this, 'RK_PAI_CAT_SERVICIO_DEV', {
      tableName: 'RK_PAI_CAT_SERVICIO_DEV',
      partitionKey: {
        name: 'id_servicio',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Elemento
    this.catElementoTable = new dynamodb.Table(this, 'RK_PAI_CAT_ELEMENTO_DEV', {
      tableName: 'RK_PAI_CAT_ELEMENTO_DEV',
      partitionKey: {
        name: 'id_elemento',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla Catálogo Tipo Parámetro
    this.catTipoParametroTable = new dynamodb.Table(this, 'RK_PAI_CAT_TIPO_PARAMETRO_DEV', {
      tableName: 'RK_PAI_CAT_TIPO_PARAMETRO_DEV',
      partitionKey: {
        name: 'id_tipo',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla de Configuración Contrato Parámetros
    this.confContratoParametrosTable = new dynamodb.Table(this, 'RK_PAI_CONF_CONTRATO_PARAMETROS_DEV', {
      tableName: 'RK_PAI_CONF_CONTRATO_PARAMETROS_DEV',
      partitionKey: {
        name: 'id_parametro',
        type: dynamodb.AttributeType.NUMBER
      },
      sortKey: {
        name: 'origen_contrato_key', // id_origen#id_contrato
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla de Configuración Parámetros
    this.confParametrosTable = new dynamodb.Table(this, 'RK_PAI_CONF_PARAMETROS_DEV', {
      tableName: 'RK_PAI_CONF_PARAMETROS_DEV',
      partitionKey: {
        name: 'id_parametro',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por parámetro
    this.confParametrosTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceDashConfParamsPorParametro',
      partitionKey: {
        name: 'id_parametro',
        type: dynamodb.AttributeType.NUMBER
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Tabla de Configuración Contrato Servicios
    this.confContratoServiciosTable = new dynamodb.Table(this, 'RK_PAI_CONF_CONTRATO_SERVICIOS_DEV', {
      tableName: 'RK_PAI_CONF_CONTRATO_SERVICIOS_DEV',
      partitionKey: {
        name: 'id_dashemp',
        type: dynamodb.AttributeType.NUMBER
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // === TABLAS DE DATOS DEL PARTICIPANTE ===

    // Tabla de Contrato Periodos
    this.contratoPeriodosTable = new dynamodb.Table(this, 'RK_PAI_CONTRATO_PERIODOS_DEV', {
      tableName: 'RK_PAI_CONTRATO_PERIODOS_DEV',
      partitionKey: {
        name: 'catalogo_type', // CATALOGO#PERIODOS
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'id_periodo',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla de Participante Data
    this.participanteDataTable = new dynamodb.Table(this, 'RK_PAI_PARTICIPANTE_DATA_DEV', {
      tableName: 'RK_PAI_PARTICIPANTE_DATA_DEV',
      partitionKey: {
        name: 'token_participante',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'id_periodo',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla de Participante Retiro
    this.participanteRetiroTable = new dynamodb.Table(this, 'RK_PAI_PARTICIPANTE_RETIRO_DEV', {
      tableName: 'RK_PAI_PARTICIPANTE_RETIRO_DEV',
      partitionKey: {
        name: 'token_participante',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'fecha_retiro',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Tabla de Participante Prestamo
    this.participantePrestamoTable = new dynamodb.Table(this, 'RK_PAI_PARTICIPANTE_PRESTAMO_DEV', {
      tableName: 'RK_PAI_PARTICIPANTE_PRESTAMO_DEV',
      partitionKey: {
        name: 'token_participante',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'fecha_prestamo',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // === TABLA DE BITÁCORA ===

    // Tabla de Bitácora
    this.bitacoraTable = new dynamodb.Table(this, 'RK_PAI_BITACORA_DEV', {
      tableName: 'RK_PAI_BITACORA_DEV',
      partitionKey: {
        name: 'id_usuario',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp_id', // timestamp_iso#id_bitacora
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI para búsqueda por elemento
    this.bitacoraTable.addGlobalSecondaryIndex({
      indexName: 'GSI-IndiceBitacoraPorElemento',
      partitionKey: {
        name: 'id_elemento',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp_id',
        type: dynamodb.AttributeType.STRING
      },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Aplicar tags a todas las tablas
    const allTables = [
      this.usuarioTable,
      this.usuarioPerfilTable,
      this.adminContratoTable,
      this.usuarioContratoTable,
      this.contratoTable,
      this.contratoCicloTable,
      this.confGrupoContratoTable,
      this.confPerfilModuloTable,
      this.confPerfilServicioTable,
      this.confContratoParametrosTable,
      this.confParametrosTable,
      this.confContratoServiciosTable,
      this.catOrigenTable,
      this.catGrupoTable,
      this.catBlkMotivoTable,
      this.catEstatusTable,
      this.catPerfilTable,
      this.catModuloTable,
      this.catServicioTable,
      this.catElementoTable,
      this.catTipoParametroTable,
      this.contratoPeriodosTable,
      this.participanteDataTable,
      this.participanteRetiroTable,
      this.participantePrestamoTable,
      this.bitacoraTable
    ];

    allTables.forEach(table => {
      Tags.of(table).add('Project', 'PAI');
      Tags.of(table).add('Environment', 'dev');
      Tags.of(table).add('Team', 'Vector-PAI');
    });
  }
  /**
   * Grant read/write permissions to a table, handling tables with and without GSIs correctly
   * This method prevents the "AWS::NoValue" issue for tables without Global Secondary Indexes
   * @param table - The DynamoDB table to grant permissions to
   * @param lambdaFunction - The Lambda function to grant permissions to
   */
  public grantTableAccess(table: dynamodb.Table, lambdaFunction: lambda.Function): void {
    // List of catalog tables that don't have GSIs
    const tablesWithoutGSI = [
      this.catOrigenTable,
      this.catGrupoTable,
      this.catBlkMotivoTable,
      this.catEstatusTable,
      this.catPerfilTable,
      this.catModuloTable,
      this.catServicioTable,
      this.catElementoTable,
      this.catTipoParametroTable
    ];

    if (tablesWithoutGSI.includes(table)) {
      // For tables without GSI, only grant table-level permissions
      table.grantReadData(lambdaFunction);
      table.grantWriteData(lambdaFunction);
    } else {
      // For tables with GSI, use the standard method which includes index permissions
      table.grantReadWriteData(lambdaFunction);
    }
  }

  /**
   * Grant CloudWatch logs permissions to Lambda functions
   * This is essential for Lambda functions to write logs to CloudWatch
   * @param lambdaFunction - The Lambda function to grant CloudWatch permissions to
   */
  public grantCloudWatchLogsAccess(lambdaFunction: lambda.Function): void {
    const cloudWatchLogsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream', 
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams'
      ],
      resources: [
        `arn:aws:logs:*:*:log-group:/aws/lambda/${lambdaFunction.functionName}`,
        `arn:aws:logs:*:*:log-group:/aws/lambda/${lambdaFunction.functionName}:*`
      ]
    });

    lambdaFunction.addToRolePolicy(cloudWatchLogsPolicy);
  }
}
