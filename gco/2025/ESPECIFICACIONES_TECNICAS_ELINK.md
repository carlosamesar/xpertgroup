# ESPECIFICACIONES TÉCNICAS DEL PROYECTO ELINK

## TABLA DE CONTENIDO

1. [Arquitectura General del Sistema](#1-arquitectura-general-del-sistema)
2. [Flujo de Autenticación (Login)](#2-flujo-de-autenticación-login)
3. [Componentes del Frontend (Angular)](#3-componentes-del-frontend-angular)
4. [Componentes del Backend (Spring Boot)](#4-componentes-del-backend-spring-boot)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Seguridad y JWT](#6-seguridad-y-jwt)
7. [Flujo de Autorización de Recursos](#7-flujo-de-autorización-de-recursos)
8. [Interceptores y Middleware](#8-interceptores-y-middleware)
9. [Gestión de Estado y Sesión](#9-gestión-de-estado-y-sesión)
10. [Endpoints REST](#10-endpoints-rest)
11. [Diagramas de Secuencia](#11-diagramas-de-secuencia)

---
gemi
## 1. ARQUITECTURA GENERAL DEL SISTEMA

### 1.1 Stack Tecnológico

**Frontend:**
- Framework: Angular (versión compatible con TypeScript)
- Librerías principales:
  - `ngx-cookie-service`: Gestión de cookies
  - `jwt-decode`: Decodificación de tokens JWT
  - RxJS: Programación reactiva

**Backend:**
- Framework: Spring Boot 2.7.4
- Java: 1.8
- Base de datos: PostgreSQL 9.4+
- Seguridad: Spring Security + JWT
- Librería JWT: `io.jsonwebtoken:jjwt:0.9.0`

**Infraestructura:**
- Servidor: JBoss/Tomcat
- Message Broker: RabbitMQ
- Build: Maven

### 1.2 Arquitectura de Capas

```
┌─────────────────────────────────────────────────┐
│           CAPA DE PRESENTACIÓN                  │
│         (Angular - elink-ng)                    │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Login    │  │ Home     │  │ Features │     │
│  │Component │  │Component │  │ Modules  │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │    Services (SeguridadService, etc.)    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │    HTTP Interceptor (Auth Headers)      │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓ HTTP/REST
┌─────────────────────────────────────────────────┐
│         CAPA DE SERVICIOS REST                  │
│      (Spring Boot - siconline-vtex-services)    │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │   Controllers (LoginController, etc.)   │  │
│  └──────────────────────────────────────────┘  │
│                      ↓                          │
│  ┌──────────────────────────────────────────┐  │
│  │   Security Filters (JWT Filter)         │  │
│  └──────────────────────────────────────────┘  │
│                      ↓                          │
│  ┌──────────────────────────────────────────┐  │
│  │   Services (AuthService, etc.)          │  │
│  └──────────────────────────────────────────┘  │
│                      ↓                          │
│  ┌──────────────────────────────────────────┐  │
│  │   Repositories (UserRepository, etc.)   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│           CAPA DE PERSISTENCIA                  │
│              (PostgreSQL)                       │
│                                                 │
│  Tablas:                                        │
│  - elk_usuarios_mae                             │
│  - elk_rol_mae                                  │
│  - elk_usuario_rol (relación N:M)              │
│  - elk_opcion_mae                               │
│  - elk_opcion_rol (relación N:M)               │
└─────────────────────────────────────────────────┘
```

---

## 2. FLUJO DE AUTENTICACIÓN (LOGIN)

### 2.1 Proceso Secuencial del Login

#### **PASO 1: Usuario Accede a la Pantalla de Login**

**Archivo:** `elink-ng/src/app/features/login/login.component.ts`

- El usuario navega a la ruta `/login`
- Angular renderiza el componente `LoginComponent`
- Se inicializa el modelo `Login` con campos:
  - `username`: string
  - `password`: string

**Vista HTML:** `login.component.html`
```html
<input type="text" [(ngModel)]="login.username" />
<input type="password" [(ngModel)]="login.password" (keydown.enter)="autenticar()" />
<button (click)="autenticar()">Ingresar</button>
```

---

#### **PASO 2: Usuario Ingresa Credenciales y Hace Click en "Ingresar"**

**Método Ejecutado:** `LoginComponent.autenticar()`

```typescript
autenticar() {
    this.segService.login(this.login, true).subscribe(respuesta => {
        if (respuesta.data.jwt) {
            // Timeout de 30ms para permitir que el evento de login se propague
            setTimeout(() => {
                this.router.navigate(['/app']);
            }, 30);
        } else {
            this.alertaService.mostrar('Usuario o contraseña incorrectos.');
        }
    }, error => {
        this.alertaService.mostrar(error.error.message);
    });
}
```

**Acciones:**
1. Invoca `SeguridadService.login(login, true)`
2. El parámetro `true` indica que debe obtener los recursos del usuario
3. Se suscribe al Observable para manejar la respuesta

---

#### **PASO 3: Servicio de Seguridad Realiza la Petición HTTP**

**Archivo:** `elink-ng/src/app/shared/service/seguridad.service.ts`

**Método:** `login(login: Login, obtenerRecursos: boolean)`

```typescript
login(login: Login, obtenerRecursos: boolean): Observable<UsuarioApp> {
    const observable = this.httpClient.post<UsuarioApp>(this.urlSeguridad, login);
    
    observable.subscribe(data => {
        if (data.data.jwt) {
            this.usuarioApp = data;
            this.logueado.emit(true);
            this.almacenarDatosUsuario(this.usuarioApp);
            
            if (obtenerRecursos) {
                this.getResources(this.getRolesFromToken(data.data.jwt))
                    .subscribe(recursos => {
                        this.procesarRecursos(recursos);
                    });
            }
        } else {
            this.logueado.emit(false);
        }
    }, error => {
        this.logueado.emit(false);
    });
    
    return observable;
}
```

**URL del Endpoint:**
- Desarrollo: `http://localhost:8080/commerce/api/auth/login`
- Producción: `http://elink.gco.com.co/commerce/api/auth/login`

**Payload Enviado:**
```json
{
    "username": "usuario_ingresado",
    "password": "contraseña_ingresada"
}
```

---

#### **PASO 4: Backend Recibe la Petición**

**Archivo:** `siconline-vtex-services/src/main/java/com/gco/elink/ms/web/LoginController.java`

**Endpoint:** `POST /commerce/api/auth/login`

```java
@PostMapping("/login")
@ResponseBody
public ResponseEntity<?> login(@RequestBody AuthRequest request) {
    try {
        return ResponseEntity.ok(IndividualResponse.<AuthResponse>builder()
                .data(authService.login(request))
                .build());
    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new IndividualResponseDto("Usuario y/o contraseña invalidos!"));
    }
}
```

**Objeto de Petición:**
```java
public class AuthRequest {
    private String username;
    private String password;
}
```

---

#### **PASO 5: Servicio de Autenticación Valida las Credenciales**

**Archivo:** `siconline-vtex-services/src/main/java/com/gco/elink/ms/auth/AuthServiceImpl.java`

**Método:** `login(AuthRequest request)`

```java
@Override
public AuthResponse login(AuthRequest request) {
    // 1. Autentica usando Spring Security
    Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsername(), 
                request.getPassword()
            ));
    
    // 2. Establece la autenticación en el contexto de seguridad
    SecurityContextHolder.getContext().setAuthentication(authentication);
    
    // 3. Genera el token JWT
    String token = Constantes.PREFIX_TOKEN.concat(
        jwtTokenProvider.generateToken(authentication)
    );
    
    // 4. Retorna la respuesta con el token
    return AuthResponse.builder()
            .username(request.getUsername())
            .jwt(token)
            .build();
}
```

**Proceso Interno:**

1. **AuthenticationManager**: Delega a `CustomUserDetailsService`
2. **CustomUserDetailsService**: Carga el usuario desde la BD
3. **PasswordEncoder**: Compara la contraseña hasheada (BCrypt)
4. **Si es exitoso**: Genera JWT
5. **Si falla**: Lanza excepción de autenticación

---

#### **PASO 6: Carga del Usuario desde la Base de Datos**

**Archivo:** `siconline-vtex-services/src/main/java/com/gco/elink/ms/security/CustomUserDetailsService.java`

```java
@Override
public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    // Busca el usuario en la BD
    ElkUsuariosMae userValid = userRepo.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException(
                "Usuario no encontrado: " + username));
    
    // Retorna UserDetails con username, password y roles
    return new org.springframework.security.core.userdetails.User(
        userValid.getUsername(), 
        userValid.getPassword(), 
        mapRoles(userValid.getRoles())
    );
}

private Collection<? extends GrantedAuthority> mapRoles(Set<ElkRolMae> roles) {
    return roles.stream()
            .map(rol -> new SimpleGrantedAuthority(rol.getNombre()))
            .collect(Collectors.toList());
}
```

**Consulta a la BD:**
```sql
SELECT u.*, r.* 
FROM elk_usuarios_mae u
LEFT JOIN elk_usuario_rol ur ON u.id = ur.id_usuario
LEFT JOIN elk_rol_mae r ON ur.id_rol = r.id
WHERE u.usuario = ?
```

---

#### **PASO 7: Generación del Token JWT**

**Archivo:** `siconline-vtex-services/src/main/java/com/gco/elink/ms/security/JwtTokenProvider.java`

```java
public String generateToken(Authentication authentication) {
    String username = authentication.getName();
    Date currentDate = new Date();
    Date expirationDate = new Date(currentDate.getTime() + jwtExpirationInMs);
    
    // Extrae roles del usuario autenticado
    String roles = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.joining(","));
    
    // Genera el token
    return Jwts.builder()
            .setSubject(username)
            .claim("roles", roles)  // Claim personalizado
            .setIssuedAt(new Date())
            .setExpiration(expirationDate)
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
}
```

**Estructura del Token JWT:**
```json
{
  "sub": "usuario123",
  "roles": "ADMIN,USUARIO",
  "iat": 1699999999,
  "exp": 1700028799
}
```

**Configuración (application.properties):**
```properties
app.jwt-secret=SecretKeyCWCH
app.jwt-expiration-milliseconds=28800000  # 8 horas
```

---

#### **PASO 8: Backend Retorna la Respuesta**

**Respuesta HTTP Exitosa (200 OK):**
```json
{
    "data": {
        "username": "usuario123",
        "jwt": "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c3VhcmlvMTIzIiwicm9sZXMiOiJBRE1JTixVU1VBUklPIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE3MDAwMjg3OTl9.abc123..."
    }
}
```

**Respuesta de Error (401 Unauthorized):**
```json
{
    "data": "Usuario y/o contraseña invalidos!"
}
```

---

#### **PASO 9: Frontend Procesa la Respuesta**

**Método:** `SeguridadService.almacenarDatosUsuario()`

```typescript
private almacenarDatosUsuario(usuario: UsuarioApp) {
    // Almacena en localStorage
    localStorage.setItem('usuarioElink', JSON.stringify(usuario));
    localStorage.setItem('u', usuario.data.username);
    localStorage.setItem('t', usuario.data.jwt);
    
    // Almacena en cookie
    this.cookieService.set('gco_seg_token', usuario.data.jwt);
}
```

**Estructura en LocalStorage:**
```json
{
    "usuarioElink": {
        "data": {
            "username": "usuario123",
            "jwt": "Bearer eyJhbGciOiJIUzUxMiJ9..."
        }
    },
    "u": "usuario123",
    "t": "Bearer eyJhbGciOiJIUzUxMiJ9..."
}
```

---

#### **PASO 10: Emisión del Evento de Login**

```typescript
this.logueado.emit(true);
```

**AppComponent escucha este evento:**

```typescript
// app.component.ts
ngOnInit(): void {
    this.seguridadService.logueado.subscribe(data => {
        this.logueado = data;
        
        if (this.logueado) {
            if (this.seguridadService.usuarioApp) {
                this.usuario = this.seguridadService.usuarioApp.data.username;
            }
        } else {
            this.router.navigate(['/login']);
        }
    });
}
```

---

## 3. COMPONENTES DEL FRONTEND (ANGULAR)

### 3.1 Estructura de Directorios

```
elink-ng/src/app/
├── features/                  # Módulos de funcionalidades
│   ├── login/                # Módulo de autenticación
│   │   ├── login.component.ts
│   │   ├── login.component.html
│   │   └── login.component.css
│   ├── home/                 # Dashboard principal
│   ├── productos/            # Gestión de productos
│   ├── categorias/           # Gestión de categorías
│   └── ...                   # Otros módulos
├── shared/                   # Componentes compartidos
│   ├── clases/              # Modelos/DTOs
│   │   ├── login.ts
│   │   ├── usuario-app.ts
│   │   ├── resource.ts
│   │   └── ...
│   └── service/             # Servicios
│       ├── seguridad.service.ts
│       ├── request-interceptor.service.ts
│       ├── alerta.service.ts
│       └── ...
├── app-routing.module.ts    # Configuración de rutas
├── app.component.ts         # Componente raíz
└── app.module.ts            # Módulo principal
```

### 3.2 Modelos de Datos (TypeScript)

**Login Model:**
```typescript
export class Login {
    username: string;
    password: string;
}
```

**UsuarioApp Model:**
```typescript
export class UsuarioApp {
    data: {
        username: string;
        jwt: string;
    };
}
```

**Resource Model:**
```typescript
export class Resource {
    rol: string;
    marca: string;
    opciones: string[];  // Nombres de las opciones/menús
}
```

### 3.3 Servicios Principales

#### SeguridadService

**Responsabilidades:**
- Gestión de autenticación
- Almacenamiento de tokens
- Verificación de permisos
- Decodificación de JWT
- Gestión de recursos del usuario

**Métodos Clave:**
- `login(login: Login, obtenerRecursos: boolean): Observable<UsuarioApp>`
- `logout(): void`
- `estaLogueado(): boolean`
- `mostrarOpcion(nombreOpcion: string): boolean`
- `getRolesFromToken(token: string): ListResource[]`
- `getResources(listResource: ListResource[]): Observable<any>`

#### RequestInterceptorService

**Responsabilidad:** Interceptar todas las peticiones HTTP y agregar headers de autenticación

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Excepciones (no requieren auth)
    if (req.url === environment.URL_AUTENTICACION ||
        req.url === environment.URL_RESET_CONTRASENA) {
        return next.handle(req);
    }
    
    // Agregar headers
    const modifiedReq = req.clone({
        setHeaders: {
            'siconline-user': JSON.parse(localStorage.getItem('usuarioElink')).data.username,
            'Authorization': JSON.parse(localStorage.getItem('usuarioElink')).data.jwt
        }
    });
    
    // Manejo de errores 401/403
    return next.handle(modifiedReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403) {
                this.router.navigate(['/login']);
                this.seguridadService.logout();
            }
            return throwError(() => new Error('Error en la solicitud HTTP'));
        })
    );
}
```

### 3.4 Configuración de Rutas

**Archivo:** `app-routing.module.ts`

```typescript
const routes: Routes = [
    {path: 'app', component: HomeComponent},
    {path: 'login', component: LoginComponent},
    {path: 'productos', component: ProductosComponent},
    {path: 'categorias', component: CategoriasComponent},
    // ... otras rutas
    {path: '**', component: HomeComponent}  // Redirección por defecto
];
```

**Guard de Navegación:**
- El `AppComponent` escucha eventos de navegación
- Verifica si el usuario está logueado antes de cada cambio de ruta
- Redirige a `/login` si no hay sesión activa

---

## 4. COMPONENTES DEL BACKEND (SPRING BOOT)

### 4.1 Estructura de Paquetes

```
com.gco.elink.ms/
├── web/                      # Controladores REST
│   ├── LoginController.java
│   └── ...
├── auth/                     # Autenticación y autorización
│   ├── AuthService.java      (Interface)
│   ├── AuthServiceImpl.java
│   ├── UserRepository.java
│   ├── RolRepository.java
│   └── Constantes.java       (Rutas públicas)
├── security/                 # Configuración de seguridad
│   ├── SecurityConfiguration.java
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── JwtAuthenticationEntryPoint.java
│   └── CustomUserDetailsService.java
├── entity/                   # Entidades JPA
│   ├── ElkUsuariosMae.java
│   ├── ElkRolMae.java
│   ├── ElkOpcionMae.java
│   └── ...
├── repository/               # Repositorios Spring Data
│   ├── IElkUsuariosMaeRepository.java
│   └── ...
└── service/                  # Lógica de negocio
    └── ...
```

### 4.2 Configuración de Seguridad

**Archivo:** `SecurityConfiguration.java`

```java
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfiguration extends WebSecurityConfigurerAdapter {
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
    
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.cors()
                .and()
                .csrf().disable()
                .exceptionHandling()
                    .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                .and()
                .sessionManagement()
                    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                    .antMatchers(Constantes.PUBLIC_ROUTES).permitAll()
                    .anyRequest().authenticated();
        
        // Agrega el filtro JWT antes del filtro de username/password
        http.addFilterBefore(
            jwtAuthenticationFilter(), 
            UsernamePasswordAuthenticationFilter.class
        );
    }
    
    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(userDetailsService)
            .passwordEncoder(passwordEncoder());
    }
}
```

**Rutas Públicas (sin autenticación):**
```java
// Constantes.java
public static final String[] PUBLIC_ROUTES = {
    "/commerce/api/auth/register",
    "/commerce/api/auth/login",
    "/api/auth/login"
};
```

### 4.3 Filtro de Autenticación JWT

**Archivo:** `JwtAuthenticationFilter.java`

**Funcionamiento:**
1. Intercepta cada petición HTTP
2. Extrae el token del header `Authorization`
3. Valida el token
4. Si es válido, carga el usuario y establece la autenticación
5. Si es inválido o expiró, retorna error 401

```java
@Override
protected void doFilterInternal(HttpServletRequest request, 
                                HttpServletResponse response, 
                                FilterChain filterChain) 
        throws ServletException, IOException {
    try {
        String token = getJwt(request);  // Extrae "Bearer xxx"
        
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            String username = jwtTokenProvider.getUsernameJWT(token);
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
            
            UsernamePasswordAuthenticationToken authenticationToken = 
                new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                );
            
            authenticationToken.setDetails(
                new WebAuthenticationDetailsSource().buildDetails(request)
            );
            
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
        }
        
        filterChain.doFilter(request, response);
    } catch (ElinkAppException e) {
        // Manejo de errores JWT
        response.setStatus(e.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        // ...
    }
}

private String getJwt(HttpServletRequest request) {
    String bearer = request.getHeader("Authorization");
    if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer")) {
        return bearer.substring(7);  // Remueve "Bearer "
    }
    return null;
}
```

---

## 5. MODELO DE DATOS

### 5.1 Diagrama de Entidad-Relación

```
┌─────────────────────────┐
│  elk_usuarios_mae       │
├─────────────────────────┤
│ PK id (BIGSERIAL)       │
│    nombre               │
│    usuario              │
│    email                │
│    contraseña (BCrypt)  │
│    token                │
│    fecha_creacion       │
│    fecha_actualizacion  │
└─────────────────────────┘
            │
            │ N:M
            ▼
┌─────────────────────────┐
│  elk_usuario_rol        │
├─────────────────────────┤
│ PK,FK id_usuario        │
│ PK,FK id_rol            │
└─────────────────────────┘
            │
            │ N:M
            ▼
┌─────────────────────────┐
│  elk_rol_mae            │
├─────────────────────────┤
│ PK id (BIGSERIAL)       │
│    nombre               │
│    marca                │
└─────────────────────────┘
            │
            │ N:M
            ▼
┌─────────────────────────┐
│  elk_opcion_rol         │
├─────────────────────────┤
│ PK,FK id_rol            │
│ PK,FK id_opcion         │
└─────────────────────────┘
            │
            │ N:M
            ▼
┌─────────────────────────┐
│  elk_opcion_mae         │
├─────────────────────────┤
│ PK id (BIGSERIAL)       │
│    nombre               │
└─────────────────────────┘
```

### 5.2 Entidades JPA

#### ElkUsuariosMae

```java
@Entity
@Table(name = "elk_usuarios_mae")
public class ElkUsuariosMae {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "nombre", nullable = false)
    private String name;
    
    @Column(name = "usuario", nullable = false)
    private String username;
    
    @Column(name = "email", nullable = false)
    private String email;
    
    @Column(name = "contraseña", nullable = false)
    private String password;  // Hasheado con BCrypt
    
    @Column(name = "token", length = 100)
    private String rememberToken;
    
    @Column(name = "fecha_creacion")
    private Instant createdAt;
    
    @Column(name = "fecha_actualizacion")
    private Instant updatedAt;
    
    @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.MERGE)
    @JoinTable(name = "elk_usuario_rol",
            joinColumns = @JoinColumn(name = "id_usuario"),
            inverseJoinColumns = @JoinColumn(name = "id_rol"))
    private Set<ElkRolMae> roles = new HashSet<>();
}
```

#### ElkRolMae

```java
@Entity
@Table(name = "elk_rol_mae")
public class ElkRolMae {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    
    private String nombre;  // "ADMIN", "USUARIO", etc.
    private String marca;   // Marca del rol
    
    @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.MERGE)
    @JoinTable(name = "elk_opcion_rol",
            joinColumns = @JoinColumn(name = "id_rol"),
            inverseJoinColumns = @JoinColumn(name = "id_opcion"))
    private Set<ElkOpcionMae> opciones = new HashSet<>();
}
```

#### ElkOpcionMae

```java
@Entity
@Table(name = "elk_opcion_mae")
public class ElkOpcionMae {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    
    private String nombre;  // "categorias", "productos", "equivalencias", etc.
}
```

### 5.3 Queries Principales

**Buscar usuario por username:**
```sql
SELECT u.*, r.nombre as rol_nombre, r.marca, o.nombre as opcion_nombre
FROM elk_usuarios_mae u
LEFT JOIN elk_usuario_rol ur ON u.id = ur.id_usuario
LEFT JOIN elk_rol_mae r ON ur.id_rol = r.id
LEFT JOIN elk_opcion_rol oro ON r.id = oro.id_rol
LEFT JOIN elk_opcion_mae o ON oro.id_opcion = o.id
WHERE u.usuario = :username
```

**Verificar si existe usuario:**
```sql
SELECT EXISTS(SELECT 1 FROM elk_usuarios_mae WHERE usuario = :username)
SELECT EXISTS(SELECT 1 FROM elk_usuarios_mae WHERE email = :email)
```

---

## 6. SEGURIDAD Y JWT

### 6.1 Ciclo de Vida del Token JWT

```
1. LOGIN EXITOSO
   ↓
2. GENERACIÓN DEL TOKEN
   - Subject: username
   - Claims: roles (separados por coma)
   - Issued At: timestamp actual
   - Expiration: timestamp + 8 horas
   - Firma: HS512 con secret key
   ↓
3. RETORNO AL CLIENTE
   - Formato: "Bearer {token}"
   ↓
4. ALMACENAMIENTO EN CLIENTE
   - localStorage
   - Cookie
   ↓
5. USO EN PETICIONES SUBSECUENTES
   - Header: Authorization: Bearer {token}
   ↓
6. VALIDACIÓN EN CADA REQUEST
   - JwtAuthenticationFilter intercepta
   - Verifica firma
   - Verifica expiración
   - Extrae username
   - Carga UserDetails
   - Establece autenticación en SecurityContext
   ↓
7. EXPIRACIÓN O LOGOUT
   - Frontend limpia storage
   - Token inválido en backend
```

### 6.2 Estructura del Token JWT

**Header:**
```json
{
  "alg": "HS512",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "usuario123",
  "roles": "ADMIN,USUARIO",
  "iat": 1699999999,
  "exp": 1700028799
}
```

**Signature:**
```
HMACSHA512(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)
```

### 6.3 Validación del Token

**Método:** `JwtTokenProvider.validateToken()`

```java
public boolean validateToken(String token) {
    try {
        Jwts.parser()
            .setSigningKey(jwtSecret)
            .parseClaimsJws(token);
        return true;
    } catch (MalformedJwtException ex) {
        throw new ElinkAppException(HttpStatus.BAD_REQUEST, "Token JWT no valida");
    } catch (ExpiredJwtException ex) {
        throw new ElinkAppException(HttpStatus.BAD_REQUEST, "Token JWT caducado");
    } catch (SignatureException ex) {
        throw new ElinkAppException(HttpStatus.BAD_REQUEST, "Token JWT no compatible");
    } catch (IllegalArgumentException ex) {
        throw new ElinkAppException(HttpStatus.BAD_REQUEST, "No recibimos el token");
    }
}
```

### 6.4 Extracción de Información del Token

**Frontend (TypeScript):**
```typescript
getRolesFromToken(token: string): ListResource[] {
    const decodedToken: any = jwtDecode(token);
    const authoritiesString = decodedToken.roles;
    const authoritiesArray = authoritiesString.split(',');
    return authoritiesArray.filter(role => role);
}
```

**Backend (Java):**
```java
public String getUsernameJWT(String token) {
    Claims claims = Jwts.parser()
        .setSigningKey(jwtSecret)
        .parseClaimsJws(token)
        .getBody();
    return claims.getSubject();
}
```

---

## 7. FLUJO DE AUTORIZACIÓN DE RECURSOS

### 7.1 Proceso de Obtención de Recursos del Usuario

**Secuencia:**

1. **Después del login exitoso**, el frontend decodifica el JWT y extrae los roles
2. Envía una petición a `/commerce/api/auth/resources` con la lista de roles
3. El backend busca las opciones asociadas a cada rol
4. Retorna un objeto `ResourceResponse` con:
   - `rol`: Roles concatenados
   - `marca`: Marcas concatenadas
   - `opciones`: Array de nombres de opciones únicas

**Endpoint:** `POST /commerce/api/auth/resources`

**Request:**
```json
["ADMIN", "USUARIO"]
```

**Response:**
```json
{
    "data": {
        "rol": "ADMIN,USUARIO",
        "marca": "MARCA1,MARCA2",
        "opciones": [
            "categorias",
            "productos",
            "equivalencias",
            "atributos",
            "marketplaces",
            "white-labels",
            "vales"
        ]
    }
}
```

**Implementación Backend:**

```java
@Override
public ResourceResponse resources(List<String> roles) {
    List<ResourceResponse> resourceResponses = new ArrayList<>();
    Set<String> uniOpciones = new HashSet<>();
    ResourceResponse resource = new ResourceResponse();
    
    roles.forEach(rol -> {
        Optional<ElkRolMae> rolConOpciones = rolRepo.findByNombre(rol);
        
        String role = resource.getRol() != null 
            ? resource.getRol() + "," + rol 
            : rol;
        resource.setRol(role);
        
        String rolmarca = resource.getMarca() != null 
            ? resource.getMarca() + "," + rolConOpciones.get().getMarca() 
            : rolConOpciones.get().getMarca();
        resource.setMarca(rolmarca);
        
        rolConOpciones.ifPresent(r -> {
            r.getOpciones().forEach(opcion -> uniOpciones.add(opcion.getNombre()));
        });
        
        resource.setOpciones(new ArrayList<>(uniOpciones));
    });
    
    return resourceResponses.isEmpty() ? null : resourceResponses.get(0);
}
```

### 7.2 Almacenamiento y Uso de Recursos en Frontend

**Almacenamiento:**
```typescript
private procesarRecursos(recursos: any) {
    if (recursos.data != null) {
        this.resources = recursos.data;
        localStorage.setItem('recursosElink', JSON.stringify(this.resources));
    }
    this.onResources.emit(this.resources);
}
```

**Verificación de Permisos:**
```typescript
mostrarOpcion(nombreOpcion: string): boolean {
    if (!this.resources) {
        this.resources = JSON.parse(localStorage.getItem('recursosElink'));
        if (!this.resources) {
            return false;
        }
    }
    
    const idx = this.resources.opciones.findIndex((elem) => {
        return elem === nombreOpcion;
    });
    
    return idx >= 0;
}
```

**Uso en Templates:**
```html
<!-- app.component.html -->
<a *ngIf="mostrarOpcion('categorias')" routerLink="/categorias">Categorías</a>
<a *ngIf="mostrarOpcion('productos')" routerLink="/productos">Productos</a>
<a *ngIf="mostrarOpcion('equivalencias')" routerLink="/equivalencias">Equivalencias</a>
```

---

## 8. INTERCEPTORES Y MIDDLEWARE

### 8.1 HTTP Interceptor (Frontend)

**Responsabilidad:** Agregar automáticamente headers de autenticación a todas las peticiones

**Implementación:**
```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // URLs excluidas (no requieren auth)
    if (req.url === environment.URL_AUTENTICACION ||
        req.url === environment.URL_RESET_CONTRASENA ||
        req.url.indexOf('http://quotes.rest') >= 0) {
        return next.handle(req);
    }
    
    let modifiedReq = req;
    
    // Para petición de recursos
    if (req.url === environment.URL_RESOURCES) {
        modifiedReq = req.clone({
            setHeaders: {
                'Authorization': this.seguridadService.usuarioApp.data.jwt
            }
        });
    } else {
        // Para el resto de peticiones
        modifiedReq = req.clone({
            setHeaders: {
                'siconline-user': JSON.parse(localStorage.getItem('usuarioElink')).data.username,
                'Authorization': JSON.parse(localStorage.getItem('usuarioElink')).data.jwt
            }
        });
    }
    
    return next.handle(modifiedReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403) {
                this.router.navigate(['/login']);
                this.alerta.mostrar("Se ha cerrado la sesión");
                this.seguridadService.logout();
            }
            return throwError(() => new Error('Error en la solicitud HTTP'));
        })
    );
}
```

### 8.2 JWT Authentication Filter (Backend)

**Orden de Ejecución de Filtros:**

```
Request HTTP
    ↓
1. CorsFilter
    ↓
2. JwtAuthenticationFilter ← CUSTOM
    ↓
3. UsernamePasswordAuthenticationFilter
    ↓
4. FilterSecurityInterceptor
    ↓
Controller
```

**Configuración:**
```java
http.addFilterBefore(
    jwtAuthenticationFilter(), 
    UsernamePasswordAuthenticationFilter.class
);
```

---

## 9. GESTIÓN DE ESTADO Y SESIÓN

### 9.1 Almacenamiento en Frontend

**LocalStorage:**
```javascript
{
    "usuarioElink": "{\"data\":{\"username\":\"usuario123\",\"jwt\":\"Bearer ...\"}}",
    "u": "usuario123",
    "t": "Bearer eyJhbGciOiJIUzUxMiJ9...",
    "recursosElink": "{\"rol\":\"ADMIN\",\"marca\":\"MARCA1\",\"opciones\":[...]}"
}
```

**Cookies:**
```
gco_seg_token=Bearer eyJhbGciOiJIUzUxMiJ9...
```

### 9.2 Verificación de Sesión Activa

**Frontend:**
```typescript
estaLogueado(): boolean {
    if (!this.usuarioApp) {
        const tk = localStorage.getItem('t');
        const us = localStorage.getItem('u');
        
        if (tk) {
            const params = { t: tk, u: us };
            this.accesoContoken(params);
            return true;
        }
        
        this.usuarioApp = JSON.parse(localStorage.getItem('usuarioElink'));
        
        if (this.usuarioApp && this.usuarioApp.data.jwt && 
            this.usuarioApp.data.jwt.length > 0) {
            return true;
        }
        
        return false;
    }
    
    return this.usuarioApp && this.usuarioApp.data.jwt && 
           this.usuarioApp.data.jwt.length > 0;
}
```

**Validación de Expiración:**
```typescript
private isTokenExpired(token: string): boolean {
    try {
        const decodedToken: any = jwtDecode(token);
        const expiration = new Date(decodedToken.exp * 1000);
        return expiration < new Date();
    } catch (error) {
        console.error('Error al verificar token', error);
        return true;
    }
}
```

### 9.3 Cierre de Sesión (Logout)

**Frontend:**
```typescript
logout() {
    this.resources = null;
    this.usuarioApp = null;
    localStorage.clear();
    this.cookieService.delete('gco_seg_token');
    this.logueado.emit(false);
}
```

**Backend:**
- Spring Security usa **sesiones STATELESS**
- No hay invalidación de token en servidor
- El token simplemente expira después de 8 horas
- El cliente elimina el token localmente

---

## 10. ENDPOINTS REST

### 10.1 Endpoints de Autenticación

| Método | Endpoint | Descripción | Autenticado |
|--------|----------|-------------|-------------|
| POST | `/commerce/api/auth/login` | Autenticación de usuario | No |
| POST | `/commerce/api/auth/resources` | Obtener recursos del usuario | Sí |
| POST | `/commerce/api/auth/register` | Registro de nuevo usuario | No |
| POST | `/commerce/api/auth/changePasswordToUser` | Cambiar contraseña | Sí |

### 10.2 Estructura de Peticiones y Respuestas

#### Login

**Request:**
```json
POST /commerce/api/auth/login
Content-Type: application/json

{
    "username": "usuario123",
    "password": "miPassword123"
}
```

**Response (Exitosa):**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
    "data": {
        "username": "usuario123",
        "jwt": "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c3VhcmlvMTIzIiwicm9sZXMiOiJBRE1JTiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoxNzAwMDI4Nzk5fQ.signature"
    }
}
```

**Response (Error):**
```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
    "data": "Usuario y/o contraseña invalidos!"
}
```

#### Resources

**Request:**
```json
POST /commerce/api/auth/resources
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...

["ADMIN", "USUARIO"]
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
    "data": {
        "rol": "ADMIN,USUARIO",
        "marca": "MARCA1,MARCA2",
        "opciones": [
            "categorias",
            "productos",
            "equivalencias",
            "atributos",
            "marketplaces",
            "white-labels",
            "vales"
        ]
    }
}
```

#### Change Password

**Request:**
```json
POST /commerce/api/auth/changePasswordToUser
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...

{
    "username": "usuario123",
    "password": "nuevaPassword456"
}
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
    "data": "Contraseña actualizada exitosamente."
}
```

---

## 11. DIAGRAMAS DE SECUENCIA

### 11.1 Diagrama de Secuencia Completo del Login

```
Usuario          LoginComponent    SeguridadService    HttpClient    Backend        DB          JwtTokenProvider
  │                    │                  │                │            │            │                │
  │  1. Ingresa        │                  │                │            │            │                │
  │  credenciales      │                  │                │            │            │                │
  ├───────────────────>│                  │                │            │            │                │
  │                    │                  │                │            │            │                │
  │  2. autenticar()   │                  │                │            │            │                │
  │                    │                  │                │            │            │                │
  │                    │  3. login()      │                │            │            │                │
  │                    ├─────────────────>│                │            │            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │  4. POST       │            │            │                │
  │                    │                  │  /auth/login   │            │            │                │
  │                    │                  ├───────────────>│            │            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │ 5. login() │            │                │
  │                    │                  │                ├───────────>│            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │            │ 6. Query   │                │
  │                    │                  │                │            │ user       │                │
  │                    │                  │                │            ├───────────>│                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │            │ 7. User    │                │
  │                    │                  │                │            │ + Roles    │                │
  │                    │                  │                │            │<───────────┤                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │            │ 8. Validate│                │
  │                    │                  │                │            │ password   │                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │            │ 9. generate│                │
  │                    │                  │                │            │ Token()    │                │
  │                    │                  │                │            ├───────────>│                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │            │ 10. JWT    │                │
  │                    │                  │                │            │<───────────┤                │
  │                    │                  │                │            │            │                │
  │                    │                  │                │ 11. Response          │                │
  │                    │                  │                │ {username, jwt}        │                │
  │                    │                  │                │<───────────┤            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │ 12. Response   │            │            │                │
  │                    │                  │<───────────────┤            │            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │ 13. Store in   │            │            │                │
  │                    │                  │ localStorage   │            │            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │ 14. Emit       │            │            │                │
  │                    │                  │ logueado(true) │            │            │                │
  │                    │                  │                │            │            │                │
  │                    │                  │ 15. getResources()          │            │                │
  │                    │                  ├───────────────>│            │            │                │
  │                    │                  │                │            │            │                │
  │                    │ 16. Response     │                │            │            │                │
  │                    │<─────────────────┤                │            │            │                │
  │                    │                  │                │            │            │                │
  │  17. Navigate      │                  │                │            │            │                │
  │  to /app           │                  │                │            │            │                │
  │<───────────────────┤                  │                │            │            │                │
```

### 11.2 Diagrama de Petición Autenticada

```
Component      Service      Interceptor      Backend       JwtFilter      Controller
    │              │             │              │              │              │
    │ 1. Request   │             │              │              │              │
    ├─────────────>│             │              │              │              │
    │              │             │              │              │              │
    │              │ 2. HTTP     │              │              │              │
    │              │ Request     │              │              │              │
    │              ├────────────>│              │              │              │
    │              │             │              │              │              │
    │              │             │ 3. Add       │              │              │
    │              │             │ Headers:     │              │              │
    │              │             │ Authorization│              │              │
    │              │             │ siconline-user              │              │
    │              │             │              │              │              │
    │              │             │ 4. Forward   │              │              │
    │              │             ├─────────────>│              │              │
    │              │             │              │              │              │
    │              │             │              │ 5. Extract   │              │
    │              │             │              │ JWT          │              │
    │              │             │              ├─────────────>│              │
    │              │             │              │              │              │
    │              │             │              │ 6. Validate  │              │
    │              │             │              │ Token        │              │
    │              │             │              │              │              │
    │              │             │              │ 7. Load User │              │
    │              │             │              │              │              │
    │              │             │              │ 8. Set Auth  │              │
    │              │             │              │ in Context   │              │
    │              │             │              │              │              │
    │              │             │              │              │ 9. Process   │
    │              │             │              │              │ Request      │
    │              │             │              │              ├─────────────>│
    │              │             │              │              │              │
    │              │             │              │              │ 10. Response │
    │              │             │              │              │<─────────────┤
    │              │             │              │<─────────────┤              │
    │              │             │<─────────────┤              │              │
    │              │<────────────┤              │              │              │
    │<─────────────┤             │              │              │              │
```

---

## RESUMEN EJECUTIVO

### Flujo Principal del Sistema

1. **Autenticación Inicial:**
   - Usuario ingresa credenciales en `/login`
   - Frontend envía POST a `/commerce/api/auth/login`
   - Backend valida contra PostgreSQL
   - Genera JWT con roles del usuario
   - Retorna token al cliente

2. **Almacenamiento de Sesión:**
   - Token se guarda en localStorage y cookie
   - Se decodifica el JWT para obtener roles
   - Se solicitan recursos asociados a los roles
   - Recursos se almacenan localmente

3. **Navegación Autenticada:**
   - Interceptor HTTP agrega headers automáticamente
   - JwtAuthenticationFilter valida cada request
   - SecurityContext mantiene la autenticación
   - Frontend verifica permisos antes de renderizar menús

4. **Gestión de Sesión:**
   - Token válido por 8 horas
   - Verificación de expiración en cliente
   - Redirección a login si token inválido
   - Logout limpia todo el storage

### Tecnologías Clave

- **Frontend:** Angular + TypeScript + RxJS
- **Backend:** Spring Boot + Spring Security + JWT
- **Persistencia:** PostgreSQL + JPA/Hibernate
- **Seguridad:** BCrypt + HS512 JWT
- **Comunicación:** REST + JSON

### Puntos Críticos de Seguridad

1. Contraseñas hasheadas con BCrypt
2. Tokens firmados con HS512
3. Validación de firma y expiración en cada request
4. Sesiones stateless (sin estado en servidor)
5. CORS configurado explícitamente
6. CSRF deshabilitado (API REST pura)
7. Headers de autenticación en todas las peticiones

---

**Fecha de Elaboración:** Noviembre 12, 2025  
**Versión del Documento:** 1.0  
**Proyecto:** ELINK - Sistema de Gestión de Marketplace VTEX
